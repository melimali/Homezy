import { StyleSheet, View } from 'react-native';
import { Squish } from '@/components/motion';
import { Card, SecHead, T } from '@/components/ui';
import { BONUS_CATS, bonusState, bonusToday, setBonus } from '@/domain/bonus';
import { gKey } from '@/domain/growth';
import { KIND_NAME, kindsOf, kindToday, LVL, mark, markState, roomSpark } from '@/domain/havuz';
import { placeOf } from '@/domain/logic';
import { useNow } from '@/hooks/useNow';
import { usePersona } from '@/profile/usePersona';
import { useStore } from '@/store/AppStore';
import { tx } from '@/i18n/runtime';
import { radius, useColors } from '@/theme';

type Row = { key: string; emoji: string; title: string; hint: string; state: 'done' | 'skip' | null; done: () => void; skip: () => void };

/**
 * Günlük işler bitince açılan bonus katmanı. Hepsi isteğe bağlı: puan, seri ya da XP yok.
 * 1) Bugünün odasından 3 zorlukta bir iş (2 dk / 10 dk / 20+ dk), 2) kişiye özel 2 bonus,
 * 3) spor / dizi / film / kitap köşesinden 2 fikir. Her gün döner, bir tur bitmeden tekrar etmez.
 */
export function BonusCard() {
  const c = useColors();
  const now = useNow();
  const { state: S, update } = useStore();
  const { answers, done: asked, disc } = usePersona();
  const day = gKey(now);
  const G = S.play.growth;

  const solo = S.settings.solo && S.rooms[S.settings.solo] ? S.settings.solo : null;
  const rooms = (solo ? [solo] : S.order).filter(id => S.rooms[id]).map(id => ({ id, type: S.rooms[id].type }));
  const spark = roomSpark(day, rooms);
  const place = spark ? placeOf(S, spark.rid) : null;

  const kinds = kindsOf(asked ? answers : null, disc?.type, disc?.answers);
  const mine = kindToday(day, kinds);

  const n = Math.floor(Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)) / 864e5);
  const cats = bonusToday(day);
  const pair = [cats[n % 4], cats[(n + 2) % 4]];

  const rows: Row[] = [
    ...mine.map(b => ({
      key: 'p:' + b.id, emoji: b.emoji, title: b.title, hint: `${tx(KIND_NAME[b.kind])} · ${b.min} ${tx('dk')} · ${tx(b.hint)}`,
      state: markState(G, day, 'p:' + b.id),
      done: () => update(d => mark(d.play.growth, day, 'p:' + b.id, 'done')),
      skip: () => update(d => mark(d.play.growth, day, 'p:' + b.id, 'skip')),
    })),
    ...pair.map(b => ({
      key: b.cat, emoji: b.emoji, title: b.title, hint: `${tx(BONUS_CATS.find(x => x.id === b.cat)?.name ?? '')} · ${tx(b.hint)}`,
      state: bonusState(G, day, b.cat) as Row['state'],
      done: () => update(d => setBonus(d.play.growth, day, b.cat, 'done')),
      skip: () => update(d => setBonus(d.play.growth, day, b.cat, 'skip')),
    })),
  ];

  return (
    <Card bare>
      <SecHead title="🎁 Bonus: istersen" h="h3" />
      <T v="small" style={{ marginTop: -6, marginBottom: 6 }}>Bugünün işleri bitti. Bunlar tamamen isteğe bağlı, seriyi ve puanı etkilemez.</T>

      {spark && place && (
        <View style={[st.room, { backgroundColor: c.surface2 }]}>
          <T v="bold">{`${place.emoji} ${tx(place.name)}: ${tx('bir dokunuş seç')}`}</T>
          <View style={{ gap: 8 }}>
            {spark.tasks.map(p => {
              const s = markState(G, day, 'o:' + p.id);
              return (
                <Squish
                  key={p.id}
                  onPress={() => update(d => mark(d.play.growth, day, 'o:' + p.id, 'done'))}
                  accessibilityRole="button"
                  accessibilityLabel={`Yaptım: ${p.title}`}
                  style={[st.lvl, { backgroundColor: s === 'done' ? c.accentSoft : c.surface }]}
                >
                  <T style={{ fontSize: 22 }}>{s === 'done' ? '✅' : p.emoji}</T>
                  <T v="bold" numberOfLines={2} style={[{ flex: 1 }, s === 'done' ? { textDecorationLine: 'line-through' } : null]}>{p.title}</T>
                  <T v="tiny" style={{ color: c.accent }}>{`${LVL[p.lvl].emoji} ${LVL[p.lvl].label}`}</T>
                </Squish>
              );
            })}
          </View>
        </View>
      )}

      <View style={{ gap: 10, marginTop: 10 }}>
        {rows.map(r => (
          <View key={r.key} style={[st.row, { backgroundColor: c.surface2, opacity: r.state === 'skip' ? 0.55 : 1 }]}>
            <T style={{ fontSize: 26 }}>{r.state === 'done' ? '✅' : r.emoji}</T>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T v="bold" numberOfLines={2} style={r.state === 'done' ? { textDecorationLine: 'line-through' } : undefined}>{r.title}</T>
              <T v="tiny" numberOfLines={2}>{r.hint}</T>
            </View>
            <Squish onPress={r.done} accessibilityRole="button" accessibilityLabel={`Yaptım: ${r.title}`} style={[st.btn, { backgroundColor: r.state === 'done' ? c.accent : c.surface }]}>
              <T v="small" style={{ color: r.state === 'done' ? c.onAccent : c.ink }}>Yaptım</T>
            </Squish>
            {r.state !== 'done' && (
              <Squish onPress={r.skip} accessibilityRole="button" accessibilityLabel={`Geç: ${r.title}`} style={[st.btn, { backgroundColor: c.surface }]}>
                <T v="small">{r.state === 'skip' ? 'Geri al' : 'Geç'}</T>
              </Squish>
            )}
          </View>
        ))}
      </View>
    </Card>
  );
}

/** İşler bitmeden: bonusun kilitli olduğunu söyleyen tek satır. */
export function BonusLocked({ left }: { left: number }) {
  const c = useColors();
  return (
    <View style={[st.lock, { backgroundColor: c.surface2 }]}>
      <T style={{ fontSize: 20 }}>🎁</T>
      <T v="small" style={{ flex: 1 }}>{`Bonus, ${left} iş daha bitince açılır. İsteğe bağlı.`}</T>
    </View>
  );
}

const st = StyleSheet.create({
  room: { borderRadius: radius.tile, padding: 12, gap: 10 },
  lvl: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.tile, paddingVertical: 10, paddingHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.tile, padding: 12 },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  lock: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.card, padding: 12 },
});
