import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { MOKA_ASSETS } from '@/constants/moka';
import { fonts, useColors } from '@/theme';

/**
 * Açılış animasyonu (~2,7 sn): çizgi film "splash pop".
 * Dönen ışın deseni, konfeti patlaması, Moka yukarıdan düşüp ezilip esner (squash & stretch),
 * "Homezy" harfleri renk renk yaylanarak zıplar. Dokununca atlanır; her soğuk açılışta bir kez.
 * Sadece opacity ve transform canlandırılır (useNativeDriver). Döngü yok, hepsi sonlu.
 */

const MOKA = 210;
const WORD = 'Homezy'.split('');
const RAYS = 14;
const CONFETTI = 26;

type Shape = 'dot' | 'square' | 'bar';
const SHAPES: Shape[] = ['dot', 'square', 'bar'];

export function IntroSplash({ onDone }: { onDone: () => void }) {
  const c = useColors();
  const { width: W, height: H } = useWindowDimensions();
  const [v] = useState(() => ({
    bg: new Animated.Value(0),
    spin: new Animated.Value(0),
    ring: new Animated.Value(0),
    burst: new Animated.Value(0),
    pop: new Animated.Value(0),
    word: WORD.map(() => new Animated.Value(0)),
    tag: new Animated.Value(0),
    all: new Animated.Value(1),
    out: new Animated.Value(0),
  }));
  const [ending, setEnding] = useState(false);

  const palette = [c.rose, c.lavender, c.sage, c.glow, c.hi, c.peach, c.clay];
  const letterColors = [c.accent, c.warm, c.late, c.hi, c.accent, c.warm];

  const confetti = useState(() =>
    Array.from({ length: CONFETTI }, (_, i) => {
      const a = (i / CONFETTI) * Math.PI * 2 + (i % 2) * 0.13;
      return {
        a,
        d: 120 + ((i * 53) % 100) + (i % 3) * 30,
        size: 9 + ((i * 7) % 10),
        shape: SHAPES[i % 3],
        rot: ((i * 97) % 360) - 180,
        color: i % palette.length,
      };
    }),
  )[0];

  const skip = () => {
    if (ending) return;
    setEnding(true);
    Animated.timing(v.all, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onDone());
  };

  useEffect(() => {
    let alive = true;
    const at = (delay: number, val: Animated.Value, duration: number, easing: (t: number) => number, toValue = 1) =>
      Animated.sequence([Animated.delay(delay), Animated.timing(val, { toValue, duration, easing, useNativeDriver: true })]);

    const anim = Animated.parallel([
      at(0, v.bg, 260, Easing.out(Easing.quad)),
      at(0, v.spin, 2700, Easing.linear),
      at(350, v.ring, 700, Easing.out(Easing.back(2))),
      at(500, v.pop, 950, Easing.linear),
      at(780, v.burst, 1100, Easing.out(Easing.cubic)),
      ...v.word.map((w, i) =>
        Animated.sequence([
          Animated.delay(1050 + i * 70),
          Animated.spring(w, { toValue: 1, friction: 4, tension: 150, useNativeDriver: true }),
        ]),
      ),
      at(1550, v.tag, 400, Easing.out(Easing.quad)),
      // Eve geçiş: büyüyüp erir
      at(2400, v.out, 300, Easing.in(Easing.quad)),
      at(2400, v.all, 300, Easing.in(Easing.quad), 0),
    ]);

    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (!alive) return;
        if (reduce) onDone();
        else anim.start(({ finished }) => finished && alive && onDone());
      });
    return () => {
      alive = false;
      anim.stop();
    };
    // Sadece ilk açılışta bir kez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lerp = (val: Animated.Value, from: number, to: number) =>
    val.interpolate({ inputRange: [0, 1], outputRange: [from, to] });

  const RAY = Math.hypot(W, H) * 1.1;
  const RAY_PX = 600;
  const wedge = (Math.PI * 2) / RAYS;
  const rayPath = Array.from({ length: RAYS / 2 }, (_, i) => {
    const a0 = i * 2 * wedge;
    const a1 = a0 + wedge;
    const p = (a: number) => `${RAY + Math.cos(a) * RAY} ${RAY + Math.sin(a) * RAY}`;
    return `M${RAY} ${RAY} L${p(a0)} L${p(a1)} Z`;
  }).join(' ');

  const popIn = [0, 0.3, 0.5, 0.7, 1];
  return (
    <Animated.View style={[StyleSheet.absoluteFill, st.root, { backgroundColor: c.peach, opacity: v.all }]}>
      <StatusBar style="dark" />
      <Pressable style={st.fill} onPress={skip} accessibilityRole="button" accessibilityLabel="Açılışı geç">
        <Animated.View
          style={[st.center, { opacity: v.bg, transform: [{ scale: lerp(v.out, 1, 1.15) }] }]}
          pointerEvents="none">
          {/* Dönen güneş ışınları */}
          <Animated.View
            style={{
              position: 'absolute',
              width: RAY_PX,
              height: RAY_PX,
              transform: [
                { rotate: v.spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '40deg'] }) },
                { scale: (RAY * 2) / RAY_PX },
              ],
            }}>
            {/* Android çok büyük bitmap çizemez (5800x5800 px çökertiyordu): küçük çiz, ölçekle. */}
            <Svg width={RAY_PX} height={RAY_PX} viewBox={`0 0 ${RAY * 2} ${RAY * 2}`}>
              <Path d={rayPath} fill={c.cream} opacity={0.35} />
            </Svg>
          </Animated.View>

          {/* Moka'nın arkasında parlayan halka */}
          <Animated.View style={{ position: 'absolute', opacity: v.ring, transform: [{ scale: lerp(v.ring, 0.2, 1) }, { translateY: -40 }] }}>
            <Svg width={340} height={340}>
              <Defs>
                <RadialGradient id="r" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={c.cream} stopOpacity={0.95} />
                  <Stop offset="0.7" stopColor={c.cream} stopOpacity={0.5} />
                  <Stop offset="1" stopColor={c.cream} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={170} cy={170} r={170} fill="url(#r)" />
            </Svg>
          </Animated.View>

          {/* Konfeti patlaması */}
          {confetti.map((p, i) => {
            const dx = Math.cos(p.a) * p.d;
            const dy = Math.sin(p.a) * p.d - 40;
            return (
              <Animated.View
                key={i}
                style={[
                  st.piece,
                  p.shape === 'dot' && { width: p.size, height: p.size, borderRadius: p.size / 2 },
                  p.shape === 'square' && { width: p.size, height: p.size, borderRadius: 3 },
                  p.shape === 'bar' && { width: p.size * 1.8, height: p.size * 0.5, borderRadius: p.size },
                  {
                    backgroundColor: palette[p.color],
                    opacity: v.burst.interpolate({ inputRange: [0, 0.05, 0.75, 1], outputRange: [0, 1, 1, 0] }),
                    transform: [
                      { translateX: lerp(v.burst, 0, dx) },
                      { translateY: v.burst.interpolate({ inputRange: [0, 1], outputRange: [0, dy + 50] }) },
                      { rotate: v.burst.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot * 2}deg`] }) },
                      { scale: v.burst.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1.2, 0.8] }) },
                    ],
                  },
                ]}
              />
            );
          })}

          {/* Moka: yukarıdan düşer, ezilir, esner, oturur */}
          <Animated.View
            style={{
              width: MOKA,
              height: MOKA,
              marginTop: -70,
              opacity: v.pop.interpolate({ inputRange: [0, 0.05, 1], outputRange: [0, 1, 1] }),
              transform: [
                { translateY: v.pop.interpolate({ inputRange: popIn, outputRange: [-H * 0.45, 0, -34, 0, 0] }) },
                { scaleX: v.pop.interpolate({ inputRange: [0, 0.28, 0.3, 0.42, 0.5, 0.7, 0.8, 1], outputRange: [0.8, 0.8, 1.3, 0.92, 0.95, 1.06, 0.98, 1] }) },
                { scaleY: v.pop.interpolate({ inputRange: [0, 0.28, 0.3, 0.42, 0.5, 0.7, 0.8, 1], outputRange: [1.25, 1.25, 0.72, 1.1, 1.08, 0.94, 1.02, 1] }) },
              ],
            }}>
            <Image source={MOKA_ASSETS.happy} style={st.moka} resizeMode="contain" />
          </Animated.View>

          {/* Homezy: harfler renk renk zıplar */}
          <View style={st.word}>
            {WORD.map((ch, i) => (
              <Animated.Text
                key={i}
                style={[st.wordCh, {
                  color: letterColors[i],
                  opacity: v.word[i].interpolate({ inputRange: [0, 0.2], outputRange: [0, 1], extrapolate: 'clamp' }),
                  transform: [
                    { translateY: lerp(v.word[i], 70, 0) },
                    { scale: lerp(v.word[i], 0.2, 1) },
                    { rotate: v.word[i].interpolate({ inputRange: [0, 1], outputRange: [`${i % 2 ? 18 : -18}deg`, '0deg'] }) },
                  ],
                }]}>
                {ch}
              </Animated.Text>
            ))}
          </View>
          <Animated.Text style={[st.tag, { color: c.ink, opacity: v.tag, transform: [{ translateY: lerp(v.tag, 10, 0) }] }]}>
            Moka ile sıcacık bir ev ☕
          </Animated.Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  root: { zIndex: 100, elevation: 100 },
  fill: { flex: 1 },
  center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  piece: { position: 'absolute' },
  moka: { width: MOKA, height: MOKA },
  word: { flexDirection: 'row', marginTop: 6 },
  wordCh: {
    fontFamily: fonts.displayBold,
    fontSize: 62,
    lineHeight: 74,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(255,248,238,0.9)',
    textShadowRadius: 0,
    textShadowOffset: { width: 0, height: 3 },
  },
  tag: { fontFamily: fonts.bodyBold, fontSize: 16, marginTop: 2 },
});
