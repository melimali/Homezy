import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useReduceMotion } from '@/components/motion';

/** Bahçenin hareketleri: sallanan bitkiler, kelebekler, nefes alan düğmeler, gübre / sulama yağmuru. Hepsi native driver. */

const loop = (v: Animated.Value, steps: [number, number][], delay = 0) =>
  Animated.loop(
    Animated.sequence([
      Animated.delay(delay),
      ...steps.map(([toValue, duration]) =>
        Animated.timing(v, { toValue, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ),
    ]),
  );

/** Rüzgârda hafifçe sallanır. */
export function Sway({ children, deg = 3, dur = 2600, delay = 0, style }: { children: ReactNode; deg?: number; dur?: number; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReduceMotion();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) return;
    const l = loop(v, [[1, dur / 2], [0, dur / 2]], delay);
    l.start();
    return () => l.stop();
  }, [v, dur, delay, reduce]);
  return (
    <Animated.View
      style={[
        style,
        {
          transform: [
            { rotate: v.interpolate({ inputRange: [0, 1], outputRange: [`${-deg}deg`, `${deg}deg`] }) },
            { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-1, 1] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Nefes alır: hafif büyüyüp küçülür (açan çiçek, önemli düğme). */
export function Breathe({ children, amp = 0.05, dur = 1400, style }: { children: ReactNode; amp?: number; dur?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReduceMotion();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) return;
    const l = loop(v, [[1, dur / 2], [0, dur / 2]]);
    l.start();
    return () => l.stop();
  }, [v, dur, reduce]);
  return (
    <Animated.View style={[style, { transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + amp] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Yatayda salınan, hafif yukarı aşağı kanat çırpan kelebek / uğur böceği. `top` yüzde, `lane` genişlik oranı. */
export function Flutter({ emoji = '🦋', top = '20%', dur = 9000, delay = 0, size = 20 }: { emoji?: string; top?: `${number}%`; dur?: number; delay?: number; size?: number }) {
  const reduce = useReduceMotion();
  const [x] = useState(() => new Animated.Value(0));
  const [y] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) return;
    const lx = loop(x, [[1, dur], [0, dur]], delay);
    const ly = loop(y, [[1, 700], [0, 700]], delay);
    lx.start();
    ly.start();
    return () => {
      lx.stop();
      ly.stop();
    };
  }, [x, y, dur, delay, reduce]);
  return (
    <Animated.Text
      pointerEvents="none"
      style={[
        styles.fly,
        {
          top,
          fontSize: size,
          transform: [
            { translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 230] }) },
            { translateY: y.interpolate({ inputRange: [0, 1], outputRange: [-8, 8] }) },
            { rotate: y.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '12deg'] }) },
          ],
        },
      ]}
    >
      {emoji}
    </Animated.Text>
  );
}

/** `fire` her arttığında emojiler yukarıdan aşağı yağar (sulama / gübre) ya da yukarı süzülür (sevgi). */
export function Shower({ fire, emoji, up }: { fire: number; emoji: string; up?: boolean }) {
  const [v] = useState(() => new Animated.Value(0));
  const [ended, setEnded] = useState(0);
  useEffect(() => {
    if (!fire) return;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => setEnded(fire));
  }, [fire, v]);
  if (!fire || fire <= ended) return null;
  return (
    <Animated.View pointerEvents="none" style={styles.shower}>
      {[0, 1, 2, 3, 4, 5].map(i => {
        const left = `${8 + i * 16}%` as `${number}%`;
        const dist = up ? -60 - (i % 3) * 14 : 60 + (i % 3) * 14;
        return (
          <Animated.Text
            key={i}
            style={[
              styles.drop,
              {
                left,
                top: up ? '70%' : '-10%',
                opacity: v.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] }),
                transform: [
                  { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, dist] }) },
                  { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, (i % 2 ? 1 : -1) * 8] }) },
                  { scale: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1.1, 0.8] }) },
                ],
              },
            ]}
          >
            {emoji}
          </Animated.Text>
        );
      })}
    </Animated.View>
  );
}

/** Büyümeyi gösteren minik parıltı: `on` değişince bir kere yanıp söner (ilk çizimde değil). */
export function Twinkle({ on }: { on: unknown }) {
  const [v] = useState(() => new Animated.Value(0));
  const prev = useRef(on);
  useEffect(() => {
    if (prev.current === on) return;
    prev.current = on;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();

  }, [on, v]);
  return (
    <>
      {[-1, 1].map(s => (
        <Animated.Text
          key={s}
          pointerEvents="none"
          style={[
            styles.twinkle,
            {
              left: s < 0 ? '12%' : undefined,
              right: s > 0 ? '12%' : undefined,
              opacity: v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
              transform: [
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [6, -22] }) },
                { scale: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1.2, 0.6] }) },
              ],
            },
          ]}
        >
          ✨
        </Animated.Text>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  fly: { position: 'absolute', left: 8, zIndex: 3 },
  shower: { ...StyleSheet.absoluteFill as object, zIndex: 6 },
  drop: { position: 'absolute', fontSize: 18 },
  twinkle: { position: 'absolute', top: 6, fontSize: 14, zIndex: 4 },
});
