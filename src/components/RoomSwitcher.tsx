import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';

import { Squish } from '@/components/motion';
import { ROOM_EMOJI } from '@/domain/constants';
import { roomCounts } from '@/domain/logic';
import type { AppState } from '@/domain/types';
import { fonts, radius, useColors } from '@/theme';

const CHIP = 40;
const GAP = 8;

/** Oda ekranının üst çubuğu: ‹ oda adı › ve altında etkin odaya kayan emoji çipleri. */
export function RoomSwitcher({ state: S, id, now, onGo, onBack }: { state: AppState; id: string; now: number; onGo: (rid: string) => void; onBack: () => void }) {
  const c = useColors();
  const { width } = useWindowDimensions();
  const ref = useRef<ScrollViewInstance>(null);
  const order = S.order.filter(x => S.rooms[x]);
  const idx = order.indexOf(id);
  const step = (d: number) => onGo(order[(idx + d + order.length) % order.length]);

  // Etkin çip her zaman ortada kalsın.
  useEffect(() => {
    const x = idx * (CHIP + GAP) + CHIP / 2 + 4 - width / 2 + 16;
    ref.current?.scrollTo({ x: Math.max(0, x), animated: true });
  }, [idx, width]);

  const r = S.rooms[id];
  const arrow = (d: number, glyph: string, label: string) => (
    <Squish onPress={() => step(d)} accessibilityLabel={label} hitSlop={6} style={[styles.arrow, styles.small, { backgroundColor: c.surface }]}>
      <Text style={[styles.glyph, { color: c.ink, fontSize: 13, lineHeight: 16 }]}>{glyph}</Text>
    </Squish>
  );
  const multi = order.length > 1;
  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <Squish onPress={onBack} hitSlop={8} accessibilityLabel="Geri" style={[styles.arrow, { backgroundColor: c.surface }]}>
          <Text style={[styles.glyph, { color: c.ink }]}>‹</Text>
        </Squish>
        <View style={styles.mid}>
          {multi && arrow(-1, '◂', 'Önceki oda')}
          <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.name, { color: c.ink }]}>
            {r.name}{multi ? ` · ${idx + 1}/${order.length}` : ''}
          </Text>
          {multi && arrow(1, '▸', 'Sonraki oda')}
        </View>
        <View style={styles.arrow} />
      </View>
      {multi && (
      <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {order.map(rid => {
          const x = S.rooms[rid];
          const on = rid === id;
          const rc = roomCounts(S, rid, now);
          const dot = rc.late ? c.late : null;
          return (
            <Squish
              key={rid}
              onPress={() => !on && onGo(rid)}
              accessibilityLabel={x.name}
              accessibilityState={{ selected: on }}
              style={[styles.chip, { backgroundColor: on ? c.room[x.type] : c.surface, opacity: on ? 1 : 0.75 }, on && { transform: [{ scale: 1.1 }] }]}
            >
              <Text style={{ lineHeight: 26, fontSize: 19 }}>{ROOM_EMOJI[x.type]}</Text>
              {dot && <View style={[styles.dot, { backgroundColor: dot, borderColor: c.bg }]} />}
            </Squish>
          );
        })}
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  arrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  small: { width: 30, height: 30, borderRadius: 15 },
  glyph: { fontFamily: fonts.bodyBold, fontSize: 22, lineHeight: 26, includeFontPadding: false },
  mid: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  name: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20 },
  strip: { gap: GAP, paddingVertical: 4, paddingHorizontal: 2 },
  chip: { width: CHIP, height: CHIP, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 1, right: 1, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5 },
});
