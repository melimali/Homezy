import { StyleSheet, View } from 'react-native';
import { Squish } from '@/components/motion';
import { Card, SecHead, T } from '@/components/ui';
import { gKey } from '@/domain/growth';
import { TYPES } from '@/domain/kisilik';
import { mikroState, mikroToday, setMikro } from '@/domain/mikro';
import { useNow } from '@/hooks/useNow';
import { usePersona } from '@/profile/usePersona';
import { useStore } from '@/store/AppStore';
import { radius, useColors } from '@/theme';

/** Moka tipine göre 3 mini öneri (su, plank, yürüyüş...). Hepsi isteğe bağlı: puan, seri ya da XP yok. */
export function MikroCard() {
  const c = useColors();
  const now = useNow();
  const { state: S, update } = useStore();
  const { disc } = usePersona();
  const day = gKey(now);
  const items = mikroToday(day, disc?.type, disc?.answers);
  const t = disc ? TYPES[disc.type] : null;
  return (
    <Card bare>
      <SecHead title={t ? `${t.emoji} Sana göre mini öneriler` : 'Mini öneriler'} h="h3" />
      <T v="small" style={{ marginTop: -6, marginBottom: 6 }}>Hafif ve isteğe bağlı. Yapmasan da olur, seriyi etkilemez.</T>
      <View style={{ gap: 10 }}>
        {items.map(m => {
          const s = mikroState(S.play.growth, day, m.id);
          return (
            <View key={m.id} style={[st.row, { backgroundColor: c.surface2, opacity: s === 'skip' ? 0.55 : 1 }]}>
              <T style={{ fontSize: 26 }}>{s === 'done' ? '✅' : m.emoji}</T>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T v="bold" numberOfLines={2} style={s === 'done' ? { textDecorationLine: 'line-through' } : undefined}>{m.title}</T>
                <T v="tiny" numberOfLines={2}>{m.hint}</T>
              </View>
              {s === 'add' || s === 'done' ? (
                <Squish onPress={() => update(d => setMikro(d.play.growth, day, m.id, 'done'))} accessibilityRole="button" accessibilityLabel={`Yaptım: ${m.title}`} style={[st.btn, { backgroundColor: s === 'done' ? c.accent : c.surface }]}>
                  <T v="small" style={{ color: s === 'done' ? c.onAccent : c.ink }}>Yaptım</T>
                </Squish>
              ) : (
                <Squish onPress={() => update(d => setMikro(d.play.growth, day, m.id, 'add'))} accessibilityRole="button" accessibilityLabel={`Güne ekle: ${m.title}`} style={[st.btn, { backgroundColor: c.surface }]}>
                  <T v="small">Ekle</T>
                </Squish>
              )}
              {s !== 'done' && (
                <Squish onPress={() => update(d => setMikro(d.play.growth, day, m.id, 'skip'))} accessibilityRole="button" accessibilityLabel={`Geç: ${m.title}`} style={[st.btn, { backgroundColor: c.surface }]}>
                  <T v="small">{s === 'skip' ? 'Geri al' : 'Geç'}</T>
                </Squish>
              )}
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
