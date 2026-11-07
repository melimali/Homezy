import { StyleSheet, View } from 'react-native';
import { Squish } from '@/components/motion';
import { Card, SecHead, T } from '@/components/ui';
import { bonusState, bonusToday, setBonus } from '@/domain/bonus';
import { gKey } from '@/domain/growth';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { radius, useColors } from '@/theme';

/** Günlük işler bitince: spor, dizi, film, kitap için isteğe bağlı bonus fikirler. Puan, seri ya da XP yok. */
export function BonusCard() {
  const c = useColors();
  const now = useNow();
  const { state: S, update } = useStore();
  const day = gKey(now);
  const items = bonusToday(day);
  return (
    <Card bare>
      <SecHead title="Bonus: kendine zaman" h="h3" />
      <T v="small" style={{ marginTop: -6, marginBottom: 6 }}>İstersen yap, istersen geç. Seriyi ve puanı etkilemez.</T>
      <View style={{ gap: 10 }}>
        {items.map(b => {
          const s = bonusState(S.play.growth, day, b.cat);
          return (
            <View key={b.id} style={[st.row, { backgroundColor: c.surface2, opacity: s === 'skip' ? 0.55 : 1 }]}>
              <T style={{ fontSize: 26 }}>{s === 'done' ? '✅' : b.emoji}</T>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T v="bold" numberOfLines={2} style={s === 'done' ? { textDecorationLine: 'line-through' } : undefined}>{b.title}</T>
                <T v="tiny" numberOfLines={2}>{b.hint}</T>
              </View>
              <Squish onPress={() => update(d => setBonus(d.play.growth, day, b.cat, 'done'))} accessibilityRole="button" accessibilityLabel={`Yaptım: ${b.title}`} style={[st.btn, { backgroundColor: s === 'done' ? c.accent : c.surface }]}>
                <T v="small" style={{ color: s === 'done' ? c.onAccent : c.ink }}>Yaptım</T>
              </Squish>
              <Squish onPress={() => update(d => setBonus(d.play.growth, day, b.cat, 'skip'))} accessibilityRole="button" accessibilityLabel={`Geç: ${b.title}`} style={[st.btn, { backgroundColor: c.surface }]}>
                <T v="small">{s === 'skip' ? 'Geri al' : 'Geç'}</T>
              </Squish>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.tile, padding: 12 },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
});
