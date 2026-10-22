import { useRouter } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { displayName, useAuth } from '@/auth/AuthProvider';
import { House3D } from '@/components/House3D';
import { Btn, Screen, T } from '@/components/ui';
import { allTasks, cleanWord, greet, greeting, homeScore, shopItems, weekSummary } from '@/domain/logic';
import { BUILT, houseLine, houseProgress, type HouseProgress } from '@/domain/play';
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
  const late = all.filter(x => x.s.k === 'late').length;
  const today = all.filter(x => x.s.k === 'today').length;
  const shop = shopItems(S).length;
  const open = (id: string) => router.push({ pathname: '/oda/[id]', params: { id } });
  const toToday = () => router.navigate('/bugun');
  const hp = houseProgress(S.play.days, now);

  return (
    <Screen>
      <View>
        <T v="h1">{greet(new Date(now), name)}</T>
        <T v="lead">
          {late + today ? `Bugün ${late + today} iş var. ${greeting(new Date(now)).line}` : `Bugün her şey yolunda ✨ ${greeting(new Date(now)).line}`}
        </T>
      </View>

      <View style={styles.tiles}>
        <Tile emoji="⏰" n={late} label="gecikti" bg={c.lateSoft} fg={c.late} onPress={toToday} />
        <Tile emoji="☀️" n={today} label="bugün" bg={c.todaySoft} fg={c.today} onPress={toToday} />
        <Tile emoji="🛒" n={shop} label="alınacak" bg={c.okSoft} fg={c.ok} onPress={toToday} />
      </View>

      <StreakCard progress={hp} points={S.play.points} />

      <House3D state={S} onOpenRoom={open} now={now} build={hp} />
      <T v="small" style={{ textAlign: 'center', marginTop: -8, fontSize: 14 }}>Odalar kirlendikçe solar ve tozlanır, iş yapınca parlar. Bir odaya dokun.</T>

      <CleanCard now={now} />

      <View style={styles.quick}>
        <Quick emoji="🏃" label="Spor" onPress={() => router.push('/spor')} />
        <Quick emoji="📔" label="Günlük" onPress={() => router.push('/gunluk')} />
        <Quick emoji="🔧" label="Bakım" onPress={() => router.push('/bakim')} />
        <Quick emoji="🛍️" label="Mağaza" onPress={() => router.push('/magaza')} />
      </View>

      <Celebrate level={hp.level} />
    </Screen>
  );
}

/** Seri, puan ve evin inşaat durumu. */
function StreakCard({ progress: p, points }: { progress: HouseProgress; points: number }) {
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
    </View>
  );
}

/** Ev puanı (odaların temizlik yüzdesi) ve son 7 günün özeti. */
function CleanCard({ now }: { now: number }) {
  const c = useColors();
  const { state: S } = useStore();
  const score = homeScore(S, now);
  const w = weekSummary(S, now);
  const color = score >= 80 ? c.ok : score >= 55 ? c.warm : c.late;
  return (
    <View style={[styles.streak, { backgroundColor: c.surface, boxShadow: `0 3px 0 ${c.line}` }]}>
      <View style={styles.streakTop}>
        <View style={styles.stat}>
          <Text style={{ fontSize: 22 }}>🧽</Text>
          <View>
            <Text style={[styles.statN, { color }]}>%{score}</Text>
            <Text style={[styles.statL, { color: c.muted }]}>ev puanı · {cleanWord(score)}</Text>
          </View>
        </View>
        <View style={styles.stat}>
          <Text style={{ fontSize: 22 }}>📅</Text>
          <View>
            <Text style={[styles.statN, { color: c.ink }]}>{w.done} iş</Text>
            <Text style={[styles.statL, { color: c.muted }]}>son 7 günde · {w.days} gün aktif</Text>
          </View>
        </View>
      </View>
      <View style={[styles.bar, { backgroundColor: c.surface2 }]}>
        <View style={[styles.barFill, { width: `${score}%`, backgroundColor: color }]} />
      </View>
      {w.best && <Text style={[styles.streakLine, { color: c.ink }]}>Bu haftanın en parlak odası: {w.best} ✨</Text>}
    </View>
  );
}

/** Ev ilk kez bitince (7. gün) bir kere kutlama. */
function Celebrate({ level }: { level: number }) {
  const c = useColors();
  const { state: S, update } = useStore();
  if (level < BUILT || S.play.celebrated >= BUILT) return null;
  const close = () => void update(D => void (D.play.celebrated = Math.max(D.play.celebrated, BUILT)));
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

function Tile({ emoji, n, label, bg, fg, onPress }: { emoji: string; n: number; label: string; bg: string; fg: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${n} ${label}`}
      style={({ pressed }) => [styles.tile, { backgroundColor: bg }, pressed && { transform: [{ translateY: 2 }] }]}
    >
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 30, color: fg }}>{n}</Text>
      <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 13, color: fg }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: 10 },
  streak: { borderRadius: radius.card, padding: 14, gap: 10 },
  streakTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statN: { fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 21 },
  statL: { fontFamily: fonts.bodyBold, fontSize: 12 },
  bar: { height: 10, borderRadius: radius.pill, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radius.pill },
  streakLine: { fontFamily: fonts.bodyBold, fontSize: 14, textAlign: 'center' },
  quick: { flexDirection: 'row', gap: 10 },
  q: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.card, gap: 2 },
  modalBg: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  modal: { borderRadius: radius.card, padding: 24, gap: 14, alignItems: 'center', maxWidth: 400, width: '100%' },
  tile: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.card, gap: 2 },
});
