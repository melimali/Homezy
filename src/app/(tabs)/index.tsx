import { useRouter } from 'expo-router';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { displayName, useAuth } from '@/auth/AuthProvider';
import { useEffect } from 'react';

import { House3D } from '@/components/House3D';
import { MokaMascot } from '@/components/MokaMascot';
import { Fade, SceneImage } from '@/components/SceneImage';
import { TaskRow } from '@/components/TaskRow';
import { WelcomeBack } from '@/components/WelcomeBack';
import { Appear, Float, Squish } from '@/components/motion';
import { Bar, Btn, Card, EmptyMsg, IconBtn, SecHead, Screen, T } from '@/components/ui';
import { MOKA_ASSETS } from '@/constants/moka';
import { allTasks, doneToday as isDoneToday, greet, greeting, notifs } from '@/domain/logic';
import { sfx } from '@/lib/sfx';
import { AdBanner } from '@/ads/AdBanner';
import { addDays, BUILT, dayKey, freezesUsed, houseLine, nextStage, progressOf } from '@/domain/play';
import { limits, themeFor } from '@/domain/premium';
import { CALM_POSES, mokaTip } from '@/domain/moka';
import { FLOWER, MOOD_NAME, growth, houseMood, moodLine, personaOf } from '@/domain/garden';
import { POSE_SCENES } from '@/constants/scenes';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useMokaState } from '@/hooks/useMokaState';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { fonts, radius, space, useColors } from '@/theme';

export default function Home() {
  const c = useColors();
  const router = useRouter();
  const { state: S } = useStore();
  const now = useNow();
  const insets = useSafeAreaInsets();
  const { status, user } = useAuth();
  const name = status === 'account' ? displayName(user) : null;
  const all = allTasks(S, now);
  // Ana ekranda sadece en acil üç iş; gerisi Bugün sekmesinde.
  const due = all.filter(x => x.s.k !== 'ok').sort((a, b) => a.s.diff - b.s.diff);
  const open = (id: string) => router.push({ pathname: '/oda/[id]', params: { id } });
  const toToday = () => router.navigate('/bugun');
  const hp = progressOf(S.play, now);
  const mood = houseMood(hp, S.play, S.mode, now);
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

  const doneN = all.filter(x => isDoneToday(x.t, now)).length;
  const bell = notifs(S, now).length;
  const next = nextStage(hp.level);
  const warn = hp.idle > 0 || (!hp.today && hp.level > 0);
  const built = Math.min(hp.level, BUILT);
  const scene = POSE_SCENES[pose] ?? POSE_SCENES.happy;

  return (
    <Screen header={false}>
      {/* Tasarımdaki gibi: ekranın üstünü kaplayan sahne, üstünde selam ve zil, altında Moka kartı. */}
      <View style={styles.heroWrap}>
        <SceneImage source={scene ?? MOKA_ASSETS[pose]} ratio={0.95} style={{ marginTop: -insets.top - 12 }}>
          <Fade edge="top" color={c.bg} size="45%" to={0.95} />
          <Fade edge="bottom" color={c.bg} size="38%" />
          <Appear style={[styles.heroTop, { paddingTop: insets.top + 18 }]}>
            {/* Yazı resmin üstünde de okunsun: arkasında yarı saydam krem kart. */}
            <View style={styles.heroText}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: c.surface, opacity: 0.82 }]} />
              <T v="h1" style={{ fontSize: 30, lineHeight: 36 }}>{greet(new Date(now), name)}</T>
              <T v="bold" style={[styles.heroLead, { color: c.ink }]}>
                {due.length ? `Bugün ${due.length} iş var. ${greeting(new Date(now)).line}` : `Bugün her şey yolunda. ${greeting(new Date(now)).line}`}
              </T>
            </View>
            <IconBtn icon="🔔" label="Bildirimler" badge={bell} onPress={() => router.push('/bildirimler')} />
          </Appear>
        </SceneImage>

        <Appear index={1} style={[styles.mokaCard, { backgroundColor: c.surface }]}>
          <View style={styles.mokaRow}>
            <Pressable onPress={() => { sfx('tap'); moka.next(); }} accessibilityRole="button" accessibilityLabel={`Moka: ${moka.title}. ${moka.message}`} style={styles.mokaTap}>
              <View style={[styles.mokaIcon, { backgroundColor: c.surface2 }]}>
                <Image source={MOKA_ASSETS[pose]} style={styles.mokaImg} resizeMode="contain" accessibilityIgnoresInvertColors />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <T v="bold" numberOfLines={1}>{moka.title}</T>
                <T v="small" numberOfLines={3} style={{ color: c.ink, opacity: 0.8 }}>{moka.message}</T>
              </View>
            </Pressable>
            <IconBtn icon={<Text style={[styles.chev, { color: c.ink }]}>›</Text>} label="Bugünün işleri" size={34} onPress={toToday} style={{ backgroundColor: c.surface2 }} />
          </View>
          <View style={styles.mokaFoot}>
            <Bar value={doneN / Math.max(1, doneN + due.length)} color={c.accent} height={7} style={{ flex: 1 }} />
            <T v="tiny">{doneN}/{doneN + due.length}</T>
          </View>
          <T v="tiny" style={{ color: c.hi }} numberOfLines={3}>💬 {tip.text}</T>
        </Appear>
      </View>

      <View style={{ gap: 14 }}>
        <SecHead title="Günün Özeti" h="h3" right={
          <Pressable onPress={() => router.push('/hafta')} accessibilityRole="link" hitSlop={8}>
            <T v="small">Tümünü Gör</T>
          </Pressable>
        } />
        <Appear index={2} style={styles.stats}>
          <StatTile emoji={hp.streak ? '🔥' : '🪵'} n={`${hp.streak}`} label="gün seri" />
          <StatTile emoji="⭐" n={`${S.play.points}`} label="puan" />
          <StatTile emoji="🏠" n={hp.level >= BUILT ? `${hp.level}` : `${built}/${BUILT}`} label={hp.level >= BUILT ? 'seviye' : 'inşaat'} />
        </Appear>
        <Squish onPress={() => router.push('/hikaye')} accessibilityLabel={houseLine(hp)} style={[styles.nextCard, { backgroundColor: warn ? c.lateSoft : c.surface }]}>
          <View style={[styles.nextIcon, { backgroundColor: c.surface2 }]}>
            <Text style={{ fontSize: 24 }}>{warn ? '🏚️' : next?.emoji ?? '🏡'}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            {warn || !next ? (
              <T v="small" style={{ color: warn ? c.late : c.ink }}>{houseLine(hp)}</T>
            ) : (
              <>
                <T v="tiny">Sıradaki:</T>
                <T v="bold" numberOfLines={1}>{next.name}</T>
              </>
            )}
          </View>
          <Text style={[styles.chev, { color: c.muted }]}>›</Text>
        </Squish>
        {warn && hp.level > 0 && (
          <T v="tiny" style={{ textAlign: 'center' }}>❄️ Bu ay {freezeLeft}/{lim.freezes} seri dondurma hakkın var. Bir gün kaçırırsan evin yıkılmaz.</T>
        )}
      </View>

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
        <House3D state={S} onOpenRoom={open} now={now} build={hp} theme={themeFor(S.settings.theme, premium.active)} mood={mood} />
        {hp.level >= 5 && (
          <Text style={[styles.mood, { color: c.muted }]}>
            <Text style={{ color: c.ink }}>🏠 {MOOD_NAME[mood]} · </Text>“{moodLine(mood, personaOf(S.play))}”
          </Text>
        )}
        <View style={styles.houseFoot}>
          <T v="small">Bir odaya dokun</T>
          <Text style={{ color: c.line }}>•</Text>
          <Pressable onPress={() => router.push('/hikaye')} accessibilityRole="button" hitSlop={8}>
            <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 13.5, color: c.hi }}>Evimin hikâyesi</Text>
          </Pressable>
        </View>
      </View>

      <GardenStrip now={now} />

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

/** Moka'nın bahçesine giriş: büyüyen saksılar ve açanlar. */
function GardenStrip({ now }: { now: number }) {
  const c = useColors();
  const router = useRouter();
  const { state: S } = useStore();
  const plots = S.play.garden.plots;
  const open = plots.filter(p => p.bloomed).length;
  const best = plots
    .filter(p => !p.bloomed && FLOWER[p.flower])
    .map(p => ({ f: FLOWER[p.flower]!, g: growth(S.play, p, now) }))
    .sort((a, b) => b.g / b.f.grow - a.g / a.f.grow)[0];
  const sub = open
    ? `${open} çiçek açtı! Albüme almaya gel 🌸`
    : best
      ? `${best.f.emoji} ${best.f.name} %${Math.round((best.g / best.f.grow) * 100)} büyüdü`
      : 'Puanlarınla tohum al, iş yaptıkça büyüsün';
  return (
    <Squish onPress={() => router.push('/bahce')} style={[styles.week, { backgroundColor: c.room.balkon }]}>
      <Float amp={3} dur={2000}><Text style={{ fontSize: 26 }}>🌷</Text></Float>
      <View style={{ flex: 1 }}>
        <Text style={[styles.weekT, { color: c.ink }]}>Moka&apos;nın bahçesi</Text>
        <Text style={[styles.statL, { color: c.muted }]}>{sub}</Text>
      </View>
      <Text style={[styles.weekT, { color: c.muted }]}>›</Text>
    </Squish>
  );
}

/** Günün özeti kutucuğu: emoji, büyük sayı, kısa ad. */
function StatTile({ emoji, n, label }: { emoji: string; n: string; label: string }) {
  const c = useColors();
  return (
    <View style={[styles.stat, { backgroundColor: c.surface }]}>
      <Text style={{ fontSize: 24 }}>{emoji}</Text>
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
            <SceneImage source={POSE_SCENES.party} radius={28} style={styles.modalScene} />
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
  heroWrap: { marginHorizontal: -space.screen },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingHorizontal: space.screen - 8 },
  heroText: { flexShrink: 1, alignSelf: 'flex-start', borderRadius: radius.tile, paddingVertical: 10, paddingHorizontal: 16, overflow: 'hidden' },
  heroLead: { fontSize: 15, lineHeight: 21, marginTop: 2, maxWidth: 250 },
  mokaCard: { marginTop: -58, marginHorizontal: 18, borderRadius: radius.tile, padding: 16, gap: 10 },
  mokaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mokaTap: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  mokaIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  mokaImg: { width: 58, height: 58, marginTop: 8 },
  mokaFoot: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chev: { fontFamily: fonts.bodyBlack, fontSize: 22, lineHeight: 24 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, alignItems: 'center', gap: 2, borderRadius: radius.tile, paddingVertical: 16 },
  statN: { fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 30, letterSpacing: -0.4 },
  statL: { fontFamily: fonts.bodyBold, fontSize: 12.5 },
  nextCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.tile, paddingVertical: 14, paddingHorizontal: 16 },
  nextIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  quick: { flexDirection: 'row', justifyContent: 'space-between' },
  week: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.card, paddingVertical: 18, paddingHorizontal: 20 },
  weekT: { fontFamily: fonts.bodyBlack, fontSize: 16 },
  homeSwitch: { alignSelf: 'center', borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 16 },
  mood: { fontFamily: fonts.bodyBold, fontSize: 13.5, lineHeight: 19, textAlign: 'center', paddingHorizontal: 8 },
  houseFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  q: { flex: 1, alignItems: 'center', gap: 8 },
  qRing: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  modalBg: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalMoka: { marginTop: -100 },
  modalScene: { marginTop: -70 },
  modal: { borderRadius: 40, padding: 28, paddingTop: 0, marginTop: 90, gap: 16, alignItems: 'center', maxWidth: 400, width: '100%' },
});
