import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ShopList } from '@/components/ShopList';
import { TaskRow } from '@/components/TaskRow';
import { Card, EmptyMsg, Screen, SecHead, T } from '@/components/ui';
import { allTasks, fmtLong, shopItems } from '@/domain/logic';
import { awardedToday, dayKey, houseProgress, POINTS } from '@/domain/play';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { fonts, useColors } from '@/theme';

export default function Bugun() {
  const { state: S } = useStore();
  const now = useNow();
  const all = allTasks(S, now).sort((a, b) => a.s.diff - b.s.diff);
  const groups: [string, typeof all][] = [
    ['Gecikenler', all.filter(x => x.s.k === 'late')],
    ['Bugün', all.filter(x => x.s.k === 'today')],
    ['Bu hafta', all.filter(x => x.s.k === 'ok' && x.s.diff <= 7)],
  ];
  const later = all.filter(x => x.s.k === 'ok' && x.s.diff > 7).length;
  const shop = shopItems(S).map(s => s.x);
  const visible = groups.filter(g => g[1].length);

  return (
    <Screen>
      <View>
        <T v="eyebrow">{fmtLong(now)}</T>
        <T v="h1">Yapılacaklar</T>
      </View>
      <DailyGoals now={now} />
      {visible.map(([label, arr]) => (
        <Card key={label}>
          <SecHead title={label} right={String(arr.length)} />
          <View>
            {arr.map((x, i) => (
              <TaskRow key={x.t.id} t={x.t} rid={x.rid} list={x.list} showRoom first={i === 0} />
            ))}
          </View>
        </Card>
      ))}
      {!visible.length && (
        <Card>
          <EmptyMsg>Önümüzdeki hafta için iş yok.</EmptyMsg>
        </Card>
      )}
      {later > 0 && <T v="small" style={{ textAlign: 'center' }}>Bir haftadan sonra {later} iş daha var.</T>}
      {shop.length > 0 && (
        <Card>
          <ShopList items={shop} title="Alınacaklar" h="h2" />
        </Card>
      )}
    </Screen>
  );
}

/** Günün üç hedefi: bir iş, spor, günlük. Her biri seriyi sürdürür ve puan verir. */
function DailyGoals({ now }: { now: number }) {
  const c = useColors();
  const router = useRouter();
  const { state: S } = useStore();
  const P = S.play;
  const today = dayKey(now);
  const tasks = Object.keys(P.awarded).filter(k => k.startsWith('gorev:') && P.awarded[k] === today).length;
  const hp = houseProgress(P.days, now);
  const goals = [
    { done: tasks > 0, emoji: '🧹', label: tasks ? `${tasks} iş tamamladın` : 'Bir iş tamamla', pts: `+${POINTS.gorev}`, go: undefined },
    { done: awardedToday(P, 'spor', 'spor', now), emoji: '🏃', label: 'Spor yap', pts: `+${POINTS.spor}`, go: '/spor' as const },
    { done: awardedToday(P, 'gunluk', 'gunluk', now), emoji: '📔', label: 'Günlüğe yaz', pts: `+${POINTS.gunluk}`, go: '/gunluk' as const },
  ];
  return (
    <Card>
      <SecHead title="Bugünün hedefleri" right={hp.streak ? `🔥 ${hp.streak} gün` : undefined} />
      <View style={{ gap: 8 }}>
        {goals.map(g => (
          <Pressable
            key={g.label}
            disabled={!g.go}
            onPress={() => g.go && router.push(g.go)}
            accessibilityRole={g.go ? 'button' : undefined}
            style={({ pressed }) => [goalStyle.row, { backgroundColor: g.done ? c.okSoft : c.surface2 }, pressed && { transform: [{ translateY: 1 }] }]}
          >
            <Text style={{ fontSize: 20 }}>{g.done ? '✅' : g.emoji}</Text>
            <Text style={[goalStyle.label, { color: g.done ? c.ok : c.ink }]}>{g.label}</Text>
            <Text style={[goalStyle.pts, { color: g.done ? c.ok : c.warm }]}>{g.done ? 'tamam' : `${g.pts} ⭐`}</Text>
            {g.go && !g.done && <Text style={{ color: c.muted, fontSize: 18 }}>›</Text>}
          </Pressable>
        ))}
      </View>
      <T v="small">Her gün en az birini yap, evin inşaatı ilerlesin 🏗️</T>
    </Card>
  );
}

const goalStyle = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16 },
  label: { flex: 1, fontFamily: fonts.bodyBlack, fontSize: 15 },
  pts: { fontFamily: fonts.bodyBlack, fontSize: 13 },
});
