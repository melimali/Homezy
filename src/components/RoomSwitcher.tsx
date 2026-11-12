import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Squish } from '@/components/motion';
import { ROOM_EMOJI } from '@/domain/constants';
import { roomCounts } from '@/domain/logic';
import type { AppState } from '@/domain/types';
import { fonts, radius, useColors } from '@/theme';

const CHIP = 44;
const GAP = 8;

/** Oda ekranının üst çubuğu: ‹ oda adı › ve altında etkin odaya kayan emoji çipleri. */
export function RoomSwitcher({ state: S, id, now, onGo }: { state: AppState; id: string; now: number; onGo: (rid: string) => void }) {
  const c = useColors();
  const { width } = useWindowDimensions();
  const ref = useRef<ScrollView>(null);
  const order = S.order.filter(x => S.rooms[x]);
  const idx = order.indexOf(id);
  const step = (d: number) => onGo(order[(idx + d + order.length) % order.length]);

  // Etkin çip her zaman ortada kalsın.
  useEffect(() => {
    const x = idx * (CHIP + GAP) + CHIP / 2 + 4 - width / 2 + 16;
    ref.current?.scrollTo({ x: Math.max(0, x), animated: true });
  }, [idx, width]);

  if (order.length < 2) return null;
  const r = S.rooms[id];
  const arrow = (d: number, glyph: string, label: string) => (
    <Squish onPress={() => step(d)} accessibilityLabel={label} hitSlop={6} style={[styles.arrow, { backgroundColor: c.surface }]}>
      <Text style={[styles.glyph, { color: c.ink }]}>{glyph}</Text>
    </Squish>
  );
  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        {arrow(-1, '‹', 'Önceki oda')}
        <View style={styles.mid}>
          <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.name, { color: c.ink }]}>{r.name}</Text>
          <Text style={[styles.count, { color: c.ink }]}>{idx + 1} / {order.length}</Text>
        </View>
        {arrow(1, '›', 'Sonraki oda')}
      </View>
      <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {order.map(rid => {
          const x = S.rooms[rid];
          const on = rid === id;
          const rc = roomCounts(S, rid, now);
          const dot = rc.late ? c.late : rc.today ? c.today : null;
          return (
            <Squish
              key={rid}
              onPress={() => !on && onGo(rid)}
              accessibilityLabel={x.name}
              accessibilityState={{ selected: on }}
              style={[styles.chip, { backgroundColor: on ? c.room[x.type] : c.surface, opacity: on ? 1 : 0.75 }, on && { transform: [{ scale: 1.1 }] }]}
            >
              <Text style={{ lineHeight: 28, fontSize: 21 }}>{ROOM_EMOJI[x.type]}</Text>
              {dot && <View style={[styles.dot, { backgroundColor: dot, borderColor: c.bg }]} />}
            </Squish>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  arrow: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontFamily: fonts.bodyBold, fontSize: 24, lineHeight: 28, includeFontPadding: false },
  mid: { flex: 1, minWidth: 0, alignItems: 'center' },
  name: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 20 },
  count: { fontFamily: fonts.bodyBold, fontSize: 11.5, lineHeight: 14, opacity: 0.55 },
  strip: { gap: GAP, paddingVertical: 6, paddingHorizontal: 4 },
  chip: { width: CHIP, height: CHIP, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: -2, right: -2, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
});
