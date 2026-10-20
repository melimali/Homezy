import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Plan } from '@/components/Plan';
import { Pill, Screen, Swatch, T } from '@/components/ui';
import { allTasks, greet, roomCounts, shopItems } from '@/domain/logic';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { fonts, useColors } from '@/theme';

export default function Home() {
  const c = useColors();
  const router = useRouter();
  const { state: S } = useStore();
  const now = useNow();
  const all = allTasks(S, now);
  const late = all.filter(x => x.s.k === 'late').length;
  const today = all.filter(x => x.s.k === 'today').length;
  const shop = shopItems(S).length;
  const open = (id: string) => router.push({ pathname: '/oda/[id]', params: { id } });

  return (
    <Screen>
      <View>
        <T v="eyebrow">{greet(new Date(now))}</T>
        <T v="h1">{late + today ? `Bugün ${late + today} iş seni bekliyor` : 'Bugün her şey yolunda'}</T>
        <View style={styles.sumRow}>
          <Pill k="late" label={`${late} gecikmiş`} />
          <Pill k="today" label={`${today} bugün`} />
          {shop > 0 && <Pill k="neutral" label={`${shop} alınacak`} />}
        </View>
      </View>

      <Plan state={S} onOpenRoom={open} />
      <T v="small" style={{ textAlign: 'center', marginTop: -8, fontSize: 13 }}>Plandaki bir odaya dokun, o odanın işlerini aç.</T>

      <T v="h2">Odalar</T>
      <View style={{ gap: 8 }}>
        {S.order.map(id => {
          const r = S.rooms[id];
          const rc = roomCounts(S, id, now);
          let sub: string;
          if (rc.late || rc.today) sub = [rc.late ? `${rc.late} gecikmiş` : '', rc.today ? `${rc.today} bugün` : ''].filter(Boolean).join(' · ');
          else {
            const next = [...rc.all].sort((a, b) => a.s.diff - b.s.diff)[0];
            sub = next ? `Sıradaki: ${next.t.name}, ${next.s.label.toLocaleLowerCase('tr-TR')}` : 'Bu odada rutin yok';
          }
          return (
            <Pressable
              key={id}
              onPress={() => open(id)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: c.surface, borderColor: c.line },
                pressed && { transform: [{ translateY: 1 }] },
              ]}
            >
              <Swatch color={c.room[r.type]} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T v="bold">{r.name}</T>
                <T v="small" style={rc.late ? { color: c.late, fontFamily: fonts.bodyBold } : undefined}>{sub}</T>
              </View>
              <Text style={{ color: c.muted, fontSize: 22 }}>›</Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sumRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1.5 },
});
