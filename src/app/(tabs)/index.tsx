import { useRouter } from 'expo-router';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { displayName, useAuth } from '@/auth/AuthProvider';
import { useEffect } from 'react';

import { House3D } from '@/components/House3D';
import { MokaMascot } from '@/components/MokaMascot';
import { TaskRow } from '@/components/TaskRow';
import { WelcomeBack } from '@/components/WelcomeBack';
import { Appear, Float, Squish } from '@/components/motion';
import { Btn, Card, EmptyMsg, SecHead, Screen, T } from '@/components/ui';
import { allTasks, greet, greeting } from '@/domain/logic';
import { sfx } from '@/lib/sfx';
import { AdBanner } from '@/ads/AdBanner';
import { addDays, BUILT, dayKey, freezesUsed, houseLine, progressOf, type HouseProgress } from '@/domain/play';
import { limits, themeFor } from '@/domain/premium';
import { CALM_POSES, mokaTip } from '@/domain/moka';
import { POSE_SCENES } from '@/constants/scenes';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useMokaState } from '@/hooks/useMokaState';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

export default function Home() {
  const c = useColors();
  const router = useRouter();
  const { state: S } = useStore();
  const now = useNow();
  const { status, user } = useAuth();
  const name = status === 'account' ? displayName(user) : null;
  const all = allTasks(S, now);
  // Ana ekranda sadece en acil üç iş; gerisi Bugün sekmesinde.
  const due = all.filter(x => x.s.k !== 'ok').sort((a, b) => a.s.diff - b.s.diff);
  const open = (id: string) => router.push({ pathname: '/oda/[id]', params: { id } });
  const toToday = () => router.navigate('/bugun');
  const hp = progressOf(S.play, now);
  const moka = useMokaState();
  // Moka günün cümlesini de söyler; ev sakinse cümleye uyan pozu alır.
  const tip = mokaTip(now);
  const pose = CALM_POSES.includes(moka.pose) ? tip.pose : moka.pose;
  const { premium } = usePurchases();
  const lim = limits(premium.active);
  const freezeLeft = Math.max(0, lim.freezes - freezesUsed(S.play, now));
  // Pazar ve pazartesi "haftalık özetin hazır" şeridi; kart açılınca o hafta için kalkar.
  const wd = new Date(now).getDay();
  const weekReady = (wd === 0 || wd === 1) && !(S.play.weekSeen && S.play.weekSeen >= addDays(dayKey(now), wd === 0 ? 0 : -1));

  return (
    <Screen>
      <Appear>
        <T v="h1">{greet(new Date(now), name)}</T>
        <T v="lead">
          {due.length ? `Bugün ${due.length} iş var. ${greeting(new Date(now)).line}` : `Bugün her şey yolunda. ${greeting(new Date(now)).line}`}
        </T>
      </Appear>

      <Appear index={1}><MokaMascot pose={pose} size="lg" scene title={moka.title} message={moka.message} tip={tip.text} onPress={moka.next} /></Appear>

      <Appear index={2}><StreakCard progress={hp} points={S.play.points} freezeLeft={freezeLeft} freezeMax={lim.freezes} /></Appear>

      {weekReady && (
        <Squish onPress={() => router.push('/hafta')} style={[styles.week, { backgroundColor: c.accentSoft }]}>
          <Text style={{ fontSize: 26 }}>📅</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.weekT, { color: c.ink }]}>Haftalık özetin hazır</Text>
            <Text style={[styles.statL, { color: c.muted }]}>Bu hafta neler yaptın? Bak ve paylaş</Text>
          </View>
          <Text style={[styles.weekT, { color: c.muted }]}>›</Text>
        </Squish>
      )}

      <View style={{ gap: 12 }}>
        {S.others.length > 0 && (
          <Pressable onPress={() => router.push('/evler')} accessibilityRole="button" style={[styles.homeSwitch, { backgroundColor: c.surface }]}>
            <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 14, color: c.ink }}>🏡 {S.homeName} ⌄</Text>
          </Pressable>
        )}
        <House3D state={S} onOpenRoom={open} now={now} build={hp} theme={themeFor(S.settings.theme, premium.active)} />
        <View style={styles.houseFoot}>
          <T v="small">Bir odaya dokun</T>
          <Text style={{ color: c.line }}>•</Text>
          <Pressable onPress={() => router.push('/hikaye')} accessibilityRole="button" hitSlop={8}>
            <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 13.5, color: c.hi }}>Evimin hikâyesi</Text>
          </Pressable>
        </View>
      </View>

      <Card bare index={3}>
        <SecHead title="Sıradaki işler" right={due.length > 3 ? `+${due.length - 3}` : undefined} />
        <View>
          {due.slice(0, 3).map((x, i) => <TaskRow key={x.t.id} t={x.t} rid={x.rid} list={x.list} showRoom first={i === 0} />)}
        </View>
        {!due.length && <EmptyMsg pose="sparkling_complete">Bugünlük her şey tamam. Biraz dinlen.</EmptyMsg>}
        {due.length > 3 && <Btn label="Hepsini gör" onPress={toToday} block />}
      </Card>

      <Appear index={4} style={styles.quick}>
        <Quick i={0} emoji="🏃" label="Spor" onPress={() => router.push('/spor')} />
        <Quick i={1} emoji="📔" label="Günlük" onPress={() => router.push('/gunluk')} />
        <Quick i={2} emoji="🛍️" label="Mağaza" onPress={() => router.push('/magaza')} />
        <Quick i={3} emoji="📅" label="Haftam" onPress={() => router.push('/hafta')} />
      </Appear>

      <AdBanner />

      <Celebrate level={hp.level} />
      <WelcomeBack />
    </Screen>
  );
}

/** Seri, puan ve evin inşaat durumu. */
function StreakCard({ progress: p, points, freezeLeft, freezeMax }: { progress: HouseProgress; points: number; freezeLeft: number; freezeMax: number }) {
  const c = useColors();
  const built = Math.min(p.level, BUILT);
  const warn = p.idle > 0 || (!p.today && p.level > 0);
  return (
    <View style={[styles.streak, { backgroundColor: warn ? c.lateSoft : c.surface }]}>
      <View style={styles.streakTop}>
        <Stat emoji={p.streak ? '🔥' : '🪵'} n={`${p.streak}`} label="gün seri" />
        <Stat emoji="⭐" n={`${points}`} label="puan" />
        <Stat emoji="🏠" n={p.level >= BUILT ? `${p.level}` : `${built}/${BUILT}`} label={p.level >= BUILT ? 'seviye' : 'inşaat'} />
      </View>
      {p.level < BUILT && (
        <View style={[styles.bar, { backgroundColor: c.surface2 }]}>
          <View style={[styles.barFill, { width: `${(built / BUILT) * 100}%`, backgroundColor: c.hi }]} />
        </View>
      )}
      <Text style={[styles.streakLine, { color: warn ? c.late : c.muted }]}>{houseLine(p)}</Text>
      {warn && p.level > 0 && (
        <Text style={[styles.freeze, { color: c.muted }]}>
          ❄️ Bu ay {freezeLeft}/{freezeMax} seri dondurma hakkın var. Bir gün kaçırırsan evin yıkılmaz.
        </Text>
      )}
    </View>
  );
}

function Stat({ emoji, n, label }: { emoji: string; n: string; label: string }) {
  const c = useColors();
  return (
    <View style={styles.stat}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text style={[styles.statN, { color: c.ink }]}>{n}</Text>
      <Text style={[styles.statL, { color: c.muted }]}>{label}</Text>
    </View>
  );
}

/** Ev ilk kez bitince (7. gün) bir kere kutlama. */
function Celebrate({ level }: { level: number }) {
  const c = useColors();
  const { state: S, update } = useStore();
  const close = () => void update(D => void (D.play.celebrated = Math.max(D.play.celebrated, BUILT)));
  const show = level >= BUILT && S.play.celebrated < BUILT;
  useEffect(() => {
    if (show) sfx('party');
  }, [show]);
  if (!show) return null;
  return (
    <Modal transparent animationType="fade" onRequestClose={close}>
      <View style={[styles.modalBg, { backgroundColor: c.shadow }]}>
        <View style={[styles.modal, { backgroundColor: c.surface }]}>
          {POSE_SCENES.party ? (
            <Image source={POSE_SCENES.party} style={styles.modalScene} resizeMode="cover" accessibilityIgnoresInvertColors />
          ) : (
            <MokaMascot pose="party" size="lg" showBubble={false} style={styles.modalMoka} />
          )}
          <T v="h1" style={{ textAlign: 'center' }}>Tebrikler, evin inşa edildi!</T>
          <T v="lead" style={{ textAlign: 'center', marginTop: 0 }}>
            7 gün boyunca her gün evine vakit ayırdın. Seriyi sürdür, önümüzdeki ay evin daha da güzelleşsin 🌷
          </T>
          <Btn kind="primary" label="Yaşasın!" onPress={close} block />
        </View>
      </View>
    </Modal>
  );
}

function Quick({ emoji, label, onPress, i }: { emoji: string; label: string; onPress: () => void; i: number }) {
  const c = useColors();
  return (
    <Squish onPress={onPress} style={styles.q}>
      <View style={[styles.qRing, { backgroundColor: c.surface }]}>
        <Float amp={3} dur={1800 + i * 200} delay={i * 150}>
          <Text style={{ fontSize: 28 }}>{emoji}</Text>
        </Float>
      </View>
      <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 13.5, color: c.ink }}>{label}</Text>
    </Squish>
  );
}

const styles = StyleSheet.create({
  streak: { borderRadius: radius.card, paddingVertical: 22, paddingHorizontal: 20, gap: 16 },
  streakTop: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 2, minWidth: 72 },
  statN: { fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 30, letterSpacing: -0.4 },
  statL: { fontFamily: fonts.bodyBold, fontSize: 12.5 },
  bar: { height: 8, borderRadius: radius.pill, overflow: 'hidden', marginHorizontal: 8 },
  barFill: { height: '100%', borderRadius: radius.pill },
  streakLine: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  freeze: { fontFamily: fonts.bodyBold, fontSize: 12.5, lineHeight: 18, textAlign: 'center', marginTop: -6 },
  quick: { flexDirection: 'row', justifyContent: 'space-between' },
  week: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.card, paddingVertical: 18, paddingHorizontal: 20 },
  weekT: { fontFamily: fonts.bodyBlack, fontSize: 16 },
  homeSwitch: { alignSelf: 'center', borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 16 },
  houseFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  q: { flex: 1, alignItems: 'center', gap: 8 },
  qRing: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  modalBg: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalMoka: { marginTop: -100 },
  modalScene: { width: '100%', aspectRatio: 4 / 3, borderRadius: 28, marginTop: -70 },
  modal: { borderRadius: 40, padding: 28, paddingTop: 0, marginTop: 90, gap: 16, alignItems: 'center', maxWidth: 400, width: '100%' },
});
