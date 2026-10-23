import { useRouter } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { displayName, useAuth } from '@/auth/AuthProvider';
import { useEffect } from 'react';

import { House3D } from '@/components/House3D';
import { TaskRow } from '@/components/TaskRow';
import { Btn, Card, SecHead, Screen, T } from '@/components/ui';
import { allTasks, greet, greeting } from '@/domain/logic';
import { sfx } from '@/lib/sfx';
import { AdBanner } from '@/ads/AdBanner';
import { BUILT, freezesUsed, houseLine, progressOf, type HouseProgress } from '@/domain/play';
import { limits, themeFor } from '@/domain/premium';
import { usePurchases } from '@/purchases/PurchasesProvider';
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
  const { premium } = usePurchases();
  const lim = limits(premium.active);
  const freezeLeft = Math.max(0, lim.freezes - freezesUsed(S.play, now));

  return (
    <Screen>
      <View>
        <T v="h1">{greet(new Date(now), name)}</T>
        <T v="lead">
          {due.length ? `Bugün ${due.length} iş var. ${greeting(new Date(now)).line}` : `Bugün her şey yolunda ✨ ${greeting(new Date(now)).line}`}
        </T>
      </View>

      <StreakCard progress={hp} points={S.play.points} freezeLeft={freezeLeft} freezeMax={lim.freezes} />

      {S.others.length > 0 && (
        <Pressable onPress={() => router.push('/evler')} accessibilityRole="button" style={{ alignSelf: 'center' }}>
          <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 14, color: c.ink }}>🏡 {S.homeName} ⌄</Text>
        </Pressable>
      )}
      <House3D state={S} onOpenRoom={open} now={now} build={hp} theme={themeFor(S.settings.theme, premium.active)} />
      <T v="small" style={{ textAlign: 'center', marginTop: -8, fontSize: 14 }}>Bir odaya dokun, işlerini gör.</T>

      <Card>
        <SecHead title="Sıradaki işler" right={due.length > 3 ? `+${due.length - 3} iş daha` : undefined} />
        {due.slice(0, 3).map((x, i) => <TaskRow key={x.t.id} t={x.t} rid={x.rid} list={x.list} showRoom first={i === 0} />)}
        {!due.length && <T style={{ fontSize: 15 }}>Bugünlük her şey tamam 🎉 Biraz dinlen.</T>}
        {due.length > 3 && <Btn small label="Hepsini gör" onPress={toToday} style={{ alignSelf: 'flex-start' }} />}
      </Card>

      <View style={styles.quick}>
        <Quick emoji="🏃" label="Spor" onPress={() => router.push('/spor')} />
        <Quick emoji="📔" label="Günlük" onPress={() => router.push('/gunluk')} />
        <Quick emoji="🛍️" label="Mağaza" onPress={() => router.push('/magaza')} />
      </View>

      <AdBanner />

      <Celebrate level={hp.level} />
    </Screen>
  );
}

/** Seri, puan ve evin inşaat durumu. */
function StreakCard({ progress: p, points, freezeLeft, freezeMax }: { progress: HouseProgress; points: number; freezeLeft: number; freezeMax: number }) {
  const c = useColors();
  const built = Math.min(p.level, BUILT);
  const warn = p.idle > 0 || (!p.today && p.level > 0);
  return (
    <View style={[styles.streak, { backgroundColor: warn ? c.lateSoft : c.surface, boxShadow: `0 3px 0 ${c.line}` }]}>
      <View style={styles.streakTop}>
        <View style={styles.stat}>
          <Text style={{ fontSize: 22 }}>{p.streak ? '🔥' : '🪵'}</Text>
          <View>
            <Text style={[styles.statN, { color: c.ink }]}>{p.streak} gün</Text>
            <Text style={[styles.statL, { color: c.muted }]}>seri</Text>
          </View>
        </View>
        <View style={styles.stat}>
          <Text style={{ fontSize: 22 }}>⭐</Text>
          <View>
            <Text style={[styles.statN, { color: c.ink }]}>{points}</Text>
            <Text style={[styles.statL, { color: c.muted }]}>puan</Text>
          </View>
        </View>
        <View style={styles.stat}>
          <Text style={{ fontSize: 22 }}>🏠</Text>
          <View>
            <Text style={[styles.statN, { color: c.ink }]}>{p.level >= BUILT ? `Sv. ${p.level}` : `${built}/${BUILT}`}</Text>
            <Text style={[styles.statL, { color: c.muted }]}>{p.level >= BUILT ? 'ev' : 'inşaat'}</Text>
          </View>
        </View>
      </View>
      {p.level < BUILT && (
        <View style={[styles.bar, { backgroundColor: c.surface2 }]}>
          <View style={[styles.barFill, { width: `${(built / BUILT) * 100}%`, backgroundColor: c.hi }]} />
        </View>
      )}
      <Text style={[styles.streakLine, { color: warn ? c.late : c.ink }]}>{houseLine(p)}</Text>
      {warn && p.level > 0 && (
        <Text style={[styles.freeze, { color: c.muted }]}>
          ❄️ Bu ay {freezeLeft}/{freezeMax} seri dondurma hakkın var. Bir gün kaçırırsan evin yıkılmaz.
        </Text>
      )}
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
          <Text style={{ fontSize: 56 }}>🎉🏡</Text>
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

function Quick({ emoji, label, onPress }: { emoji: string; label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.q, { backgroundColor: c.surface, boxShadow: `0 3px 0 ${c.line}` }, pressed && { transform: [{ translateY: 2 }] }]}
    >
      <Text style={{ fontSize: 26 }}>{emoji}</Text>
      <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 14, color: c.ink }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  streak: { borderRadius: radius.card, padding: 14, gap: 10 },
  streakTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statN: { fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 21 },
  statL: { fontFamily: fonts.bodyBold, fontSize: 12 },
  bar: { height: 10, borderRadius: radius.pill, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radius.pill },
  streakLine: { fontFamily: fonts.bodyBold, fontSize: 14, textAlign: 'center' },
  freeze: { fontFamily: fonts.bodyBold, fontSize: 12, textAlign: 'center', marginTop: -4 },
  quick: { flexDirection: 'row', gap: 10 },
  q: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.card, gap: 2 },
  modalBg: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  modal: { borderRadius: radius.card, padding: 24, gap: 14, alignItems: 'center', maxWidth: 400, width: '100%' },
});
