import { useEffect, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { sfx } from '@/lib/sfx';

/**
 * Cozy temanın hareketleri: yumuşak beliriş, basınca esneyen kartlar, hafifçe süzülen emojiler
 * ve iş bitince saçılan yıldızlar. Sadece React Native `Animated` kullanır (ek paket yok).
 * Telefonda "hareketi azalt" açıksa döngüler ve saçılma çalışmaz.
 */

let reduceNow = false;
AccessibilityInfo.isReduceMotionEnabled?.()
  .then(v => (reduceNow = v))
  .catch(() => {});

export function useReduceMotion() {
  const [reduce, setReduce] = useState(reduceNow);
  useEffect(() => {
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', v => {
      reduceNow = v;
      setReduce(v);
    });
    return () => sub?.remove();
  }, []);
  return reduce;
}

/** İlk göründüğünde aşağıdan yaylanarak gelir. `index` sırayla (kademeli) gelmesini sağlar. */
export function Appear({ children, index = 0, style }: { children: ReactNode; index?: number; style?: StyleProp<ViewStyle> }) {
  const [v] = useState(() => new Animated.Value(reduceNow ? 1 : 0));
  useEffect(() => {
    if (reduceNow) return;
    const a = Animated.spring(v, { toValue: 1, delay: Math.min(index, 10) * 55, friction: 7, tension: 70, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [v, index]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
            { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// Dış kutunun yerleşimini belirleyen stiller Pressable'a, görünüm (zemin, gölge, iç boşluk) esneyen iç kutuya gider.
const OUTER = new Set([
  'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'width', 'minWidth', 'maxWidth', 'alignSelf',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical',
  'position', 'top', 'bottom', 'left', 'right', 'zIndex',
]);

function split(style: StyleProp<ViewStyle>) {
  const flat = (StyleSheet.flatten(style) || {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const k in flat) (OUTER.has(k) ? outer : inner)[k] = flat[k];
  return [outer as ViewStyle, inner as ViewStyle] as const;
}

/** Basınca içine çöküp bırakınca zıplayan dokunma alanı. */
export function Squish({
  children, style, scaleTo = 0.94, quiet, dim = true, onPressIn, onPressOut, ...rest
}: Omit<PressableProps, 'style' | 'children'> & { children: ReactNode; style?: StyleProp<ViewStyle>; scaleTo?: number; quiet?: boolean; dim?: boolean }) {
  const [s] = useState(() => new Animated.Value(1));
  const to = (toValue: number, spring: boolean) =>
    (spring
      ? Animated.spring(s, { toValue, friction: 4, tension: 220, useNativeDriver: true })
      : Animated.timing(s, { toValue, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true })
    ).start();
  const [outer, inner] = split(style);
  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      onPressIn={e => {
        if (!quiet) sfx('tap');
        to(scaleTo, false);
        onPressIn?.(e);
      }}
      onPressOut={e => {
        to(1, true);
        onPressOut?.(e);
      }}
      style={outer}
    >
      <Animated.View style={[{ flexGrow: 1 }, inner, { transform: [{ scale: s }] }, dim && rest.disabled && { opacity: 0.55 }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Yerinde hafifçe süzülür (emoji, maskot). */
export function Float({ children, amp = 3, dur = 1800, delay = 0, style }: { children: ReactNode; amp?: number; dur?: number; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReduceMotion();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) return;
    const half = (toValue: number) => Animated.timing(v, { toValue, duration: dur / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true });
    const loop = Animated.loop(Animated.sequence([Animated.delay(delay), half(1), half(0)]));
    loop.start();
    return () => loop.stop();
  }, [v, dur, delay, reduce]);
  return (
    <Animated.View style={[style, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -amp] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Değeri değiştiğinde bir kez zıplar (sayaç, rozet). */
export function Pulse({ children, on, style }: { children: ReactNode; on: unknown; style?: StyleProp<ViewStyle> }) {
  const [v] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduceNow) return;
    v.setValue(1.25);
    Animated.spring(v, { toValue: 1, friction: 3, tension: 180, useNativeDriver: true }).start();
  }, [on, v]);
  return <Animated.View style={[style, { transform: [{ scale: v }] }]}>{children}</Animated.View>;
}

const SPARKS = ['✨', '⭐', '💖', '🌟', '✨', '🫧', '⭐', '💫'];

/** `fire` her arttığında ortadan dışa doğru küçük yıldızlar saçılır. Ebeveyn `position: relative` olmalı. */
export function Burst({ fire }: { fire: number }) {
  const [v] = useState(() => new Animated.Value(0));
  // Bitmiş saçılmanın numarası; `fire` ondan büyükse saçılma ekranda.
  const [ended, setEnded] = useState(0);
  useEffect(() => {
    if (!fire || reduceNow) return;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 750, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => setEnded(fire));
  }, [fire, v]);
  if (!fire || fire <= ended || reduceNow) return null;
  return (
    <Animated.View pointerEvents="none" style={styles.burst}>
      {SPARKS.map((e, i) => {
        const a = (i / SPARKS.length) * Math.PI * 2;
        const d = 34 + (i % 3) * 10;
        return (
          <Animated.Text
            key={i}
            style={[
              styles.spark,
              {
                opacity: v.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
                transform: [
                  { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * d] }) },
                  { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * d] }) },
                  { scale: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1.1, 0.7] }) },
                ],
              },
            ]}
          >
            {e}
          </Animated.Text>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  burst: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  spark: { position: 'absolute', fontSize: 16 },
});
