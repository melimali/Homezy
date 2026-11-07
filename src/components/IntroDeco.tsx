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

function Bob({ t, emoji, size = 44, delay = 0, amp = 14 }: { t: Animated.Value; emoji: string; size?: number; delay?: number; amp?: number }) {
  // Her emoji kendi fazında iki kez zıplar (döngü sürekli).
  const y = t.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: delay ? [-amp, 0, -amp, 0, -amp] : [0, -amp, 0, -amp, 0] });
  const r = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: delay ? ['6deg', '-6deg', '6deg'] : ['-6deg', '6deg', '-6deg'] });
  return <Animated.Text style={{ fontSize: size, transform: [{ translateY: y }, { rotate: r }] }}>{emoji}</Animated.Text>;
}

const GRID: [number, number, string][] = [];
// 6×4 mini ev planı: odalar sırayla boyanır.
const ROOMS = ['#E9B7A3', '#A9C7B1', '#C9BEE6', '#F2D49B'];
for (let r = 0; r < 4; r++) for (let q = 0; q < 6; q++) GRID.push([r, q, ROOMS[(q < 3 ? 0 : 1) + (r < 2 ? 0 : 2)]!]);

export function IntroDeco({ kind }: { kind: DecoKind }) {
  const c = useColors();
  const t = useLoop(kind === 'draw' ? 5200 : kind === 'tasks' ? 4800 : 3600);

  if (kind === 'draw') {
    const cell = 30;
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
              <View style={[st.dotE, { backgroundColor: col }]}><Text style={{ fontSize: 22 }}>{e}</Text></View>
              <View style={[st.bar, { backgroundColor: c.line }]}><Animated.View style={{ height: 8, borderRadius: 4, backgroundColor: col, width: '100%', opacity: done }} /></View>
              <Animated.Text style={{ fontSize: 22, opacity: done, transform: [{ scale: done.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }}>✅</Animated.Text>
            </Animated.View>
          );
        })}
        <Animated.Text style={{ fontSize: 30, opacity: step(t, 0.78, 0.84), transform: [{ scale: step(t, 0.78, 0.86).interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.1] }) }] }}>⭐ ⭐ ⭐</Animated.Text>
      </View>
    );
  }

  if (kind === 'house') {
    const lvl = (n: number) => step(t, 0.12 + n * 0.22, 0.2 + n * 0.22);
    return (
      <View style={st.box} pointerEvents="none">
        <View style={st.row}>
          <Animated.Text style={{ fontSize: 26, opacity: pulse(t, 0.05, 0.3, 0.7), transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [10, -30] }) }] }}>☁️</Animated.Text>
          <Animated.Text style={{ fontSize: 26, transform: [{ scale: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.2, 1] }) }] }}>🔥</Animated.Text>
        </View>
        <View style={st.row}>
          {['⛺', '🛖', '🏡', '🏰'].map((e, n) => (
            <Animated.Text key={e} style={{ fontSize: 30 + n * 8, opacity: n === 0 ? 1 : lvl(n - 1), transform: [{ scale: n === 0 ? 1 : lvl(n - 1).interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }}>{e}</Animated.Text>
          ))}
        </View>
        <Animated.Text style={{ fontSize: 20, opacity: pulse(t, 0.6, 0.8, 1) }}>✨ ✨ ✨</Animated.Text>
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
        <View style={{ height: 70, alignItems: 'center', justifyContent: 'center' }}>
          {g(0.0, '🌱', 34)}{g(0.26, '🌿', 46)}{g(0.5, '🌷', 58)}{g(0.74, '🌻', 66)}
        </View>
        <View style={st.row}>
          <Bob t={t} emoji="🦋" size={26} amp={10} />
          <Bob t={t} emoji="🐝" size={22} delay={1} amp={8} />
        </View>
      </View>
    );
  }

  const items = kind === 'self' ? ['📖', '💪', '🧘', '🌙'] : ['☕', '🏠', '⭐', '🌱'];
  return (
    <View style={st.box} pointerEvents="none">
      <View style={st.row}>
        {items.map((e, i) => (
          <Bob key={e} t={t} emoji={e} size={46} delay={i % 2} amp={12 + (i % 2) * 6} />
        ))}
      </View>
      <View style={[st.glow, { backgroundColor: c.surface }]} />
    </View>
  );
}

const st = StyleSheet.create({
  box: { flex: 1, minHeight: 90, alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 5, borderRadius: radius.card },
  brush: { position: 'absolute', fontSize: 30 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, width: 240 },
  dotE: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  bar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  glow: { width: 150, height: 10, borderRadius: 5, opacity: 0.5 },
});
