import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { useReduceMotion } from '@/components/motion';
import { radius, useColors } from '@/theme';

/** Tanıtım sayfalarının alt boşluğunu dolduran hafif döngü animasyonları. Sadece emoji, metin yok. */
export type DecoKind = 'hello' | 'draw' | 'tasks' | 'house' | 'garden' | 'self';

/** t: 0..1 döngü; aralıklar [a,b] arasında 0→1→(kalır). */
function useLoop(ms: number) {
  const reduce = useReduceMotion();
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) {
      t.setValue(0.9);
      return;
    }
    const a = Animated.loop(Animated.timing(t, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [t, ms, reduce]);
  return t;
}

const step = (t: Animated.Value, a: number, b: number) =>
  t.interpolate({ inputRange: [0, a, b, 1], outputRange: [0, 0, 1, 1], extrapolate: 'clamp' });
/** a'da belirir, b'de kaybolur. */
const pulse = (t: Animated.Value, a: number, m: number, b: number) =>
  t.interpolate({ inputRange: [0, a, m, Math.min(1, b), 1], outputRange: [0, 0, 1, 0, 0], extrapolate: 'clamp' });

const GRID: [number, number, string][] = [];
// 6×4 mini ev planı: odalar sırayla boyanır.
const ROOMS = ['#E9B7A3', '#A9C7B1', '#C9BEE6', '#F2D49B'];
for (let r = 0; r < 4; r++) for (let q = 0; q < 6; q++) GRID.push([r, q, ROOMS[(q < 3 ? 0 : 1) + (r < 2 ? 0 : 2)]!]);

export function IntroDeco({ kind }: { kind: DecoKind }) {
  const c = useColors();
  const t = useLoop(kind === 'draw' ? 5200 : kind === 'tasks' ? 4800 : 3600);

  if (kind === 'draw') {
    const cell = 26;
    return (
      <View style={st.box} pointerEvents="none">
        <View style={[st.grid, { width: cell * 6 + 10, backgroundColor: c.surface }]}>
          {GRID.map(([r, q, col], i) => {
            const a = 0.04 + (i / GRID.length) * 0.6;
            const o = step(t, a, a + 0.05);
            return (
              <View key={i} style={{ width: cell, height: cell, padding: 2 }}>
                <Animated.View style={{ flex: 1, borderRadius: 7, backgroundColor: col, opacity: o, transform: [{ scale: o.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }} />
              </View>
            );
          })}
        </View>
        <Animated.Text style={[st.brush, { transform: [{ translateX: t.interpolate({ inputRange: [0, 0.64, 1], outputRange: [-cell * 2.5, cell * 2.5, cell * 2.5] }) }, { translateY: t.interpolate({ inputRange: [0, 0.64, 1], outputRange: [-cell * 1.4, cell * 1.4, cell * 1.4] }) }, { rotate: '-20deg' }] }]}>🖌️</Animated.Text>
      </View>
    );
  }

  if (kind === 'tasks') {
    const rows: [string, string][] = [['🧹', '#E9B7A3'], ['🍽️', '#A9C7B1'], ['🪴', '#C9BEE6']];
    return (
      <View style={st.box} pointerEvents="none">
        {rows.map(([e, col], i) => {
          const a = 0.05 + i * 0.22;
          const o = step(t, a, a + 0.08);
          const done = step(t, a + 0.14, a + 0.2);
          return (
            <Animated.View key={i} style={[st.card, { backgroundColor: c.surface, opacity: o, transform: [{ translateY: o.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>
              <View style={[st.dotE, { backgroundColor: col }]}><Text style={st.em}>{e}</Text></View>
              <View style={[st.bar, { backgroundColor: c.line }]}><Animated.View style={{ height: 8, borderRadius: 4, backgroundColor: col, width: '100%', opacity: done }} /></View>
              <Animated.Text style={[st.em, st.tick, { opacity: done, transform: [{ scale: done.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }]}>✅</Animated.Text>
            </Animated.View>
          );
        })}
      </View>
    );
  }

  if (kind === 'house') {
    // Seri uzadıkça kulübe → ev → bahçeli ev → köşk; sayaç yükselir, toz silinir.
    const H = ['🏚️', '🏠', '🏡', '🏰'];
    const at = (n: number) => 0.05 + n * 0.23;
    const show = (n: number) => (n === 3 ? step(t, at(n), at(n) + 0.04) : pulse(t, at(n), at(n) + 0.04, at(n + 1)));
    return (
      <View style={st.box} pointerEvents="none">
        <View style={st.counter}>
          <Text style={st.em}>🔥</Text>
          <View style={st.num}>
            {[1, 2, 3, 4].map((n, i) => (
              <Animated.Text key={n} style={[st.numT, { color: c.ink, opacity: show(i) }]}>{n}</Animated.Text>
            ))}
          </View>
        </View>
        <View style={st.stage}>
          {H.map((e, n) => {
            const o = show(n);
            return (
              <Animated.Text key={e} style={[st.big, { opacity: o, transform: [{ scale: o.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1 + n * 0.08] }) }] }]}>{e}</Animated.Text>
            );
          })}
          <Animated.Text style={[st.big, { fontSize: 28, left: 40, opacity: pulse(t, 0, 0.05, 0.28) }]}>💨</Animated.Text>
          <Animated.Text style={[st.big, { fontSize: 28, left: -40, opacity: pulse(t, 0, 0.05, 0.28), transform: [{ translateX: t.interpolate({ inputRange: [0, 0.07, 0.14, 0.21, 0.28], outputRange: [0, 40, 0, 40, 0] }) }] }]}>🧹</Animated.Text>
        </View>
      </View>
    );
  }

  if (kind === 'garden') {
    const g = (a: number, e: string, size: number) => (
      <Animated.Text key={e} style={{ fontSize: size, position: 'absolute', opacity: pulse(t, a, a + 0.12, a + 0.28), transform: [{ scale: pulse(t, a, a + 0.12, a + 0.28).interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }}>{e}</Animated.Text>
    );
    return (
      <View style={st.box} pointerEvents="none">
        <Animated.Text style={{ fontSize: 28, transform: [{ translateY: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-6, 6, -6] }) }] }}>💧 💧</Animated.Text>
        <View style={{ height: 56, alignItems: 'center', justifyContent: 'center' }}>
          {g(0.0, '🌱', 30)}{g(0.26, '🌿', 38)}{g(0.5, '🌷', 46)}{g(0.74, '🌻', 52)}
        </View>
      </View>
    );
  }

  if (kind === 'self') {
    const E = ['💪', '📖', '🧘'];
    return (
      <View style={st.box} pointerEvents="none">
        <View style={st.row}>
          {E.map((e, i) => {
            const k = step(t, 0.1 + i * 0.25, 0.18 + i * 0.25);
            return (
              <View key={e} style={[st.chip, { backgroundColor: c.surface }]}>
                <Text style={st.big2}>{e}</Text>
                <Animated.Text style={[st.check, { opacity: k, transform: [{ scale: k.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }]}>✅</Animated.Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  // hello: Moka'nın selamı ve tüten kahve
  return (
    <View style={st.box} pointerEvents="none">
      <View style={st.row}>
        <Animated.Text style={[st.big, { position: 'relative', transform: [{ rotate: t.interpolate({ inputRange: [0, 0.15, 0.3, 0.45, 0.6, 1], outputRange: ['0deg', '20deg', '-10deg', '20deg', '0deg', '0deg'] }) }] }]}>👋</Animated.Text>
        <View style={{ alignItems: 'center' }}>
          <Animated.Text style={{ fontSize: 22, opacity: pulse(t, 0, 0.5, 1), transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [6, -10] }) }] }}>♨️</Animated.Text>
          <Text style={st.big2}>☕</Text>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  counter: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30 },
  num: { width: 22, height: 28 },
  numT: { position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 22, lineHeight: 28 },
  stage: { width: 160, height: 70, alignItems: 'center', justifyContent: 'center' },
  big: { position: 'absolute', fontSize: 50, lineHeight: 62, textAlign: 'center', includeFontPadding: false },
  big2: { fontSize: 36, lineHeight: 44, textAlign: 'center', includeFontPadding: false },
  chip: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  check: { position: 'absolute', right: -4, bottom: -4, fontSize: 20 },
  box: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 5, borderRadius: radius.card },
  brush: { position: 'absolute', fontSize: 30 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, width: 230 },
  em: { fontSize: 20, lineHeight: 26, width: 28, height: 26, textAlign: 'center', includeFontPadding: false },
  tick: { width: 28 },
  dotE: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  glow: { width: 150, height: 10, borderRadius: 5, opacity: 0.5 },
});
