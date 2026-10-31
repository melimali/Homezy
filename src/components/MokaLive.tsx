import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { useReduceMotion } from '@/components/motion';

/** Dokunma/uzun basma tepkileri için tutamaç. */
export type MokaLiveHandle = { tickle: () => void; cuddle: () => void };

const HEARTS = ['💗', '💛', '💗', '🤎'];

/**
 * Moka'ya can verir: nefes, yan salınım ve tepkiler. Sadece `Animated` (native driver).
 * `children` Moka resmidir. Hareketi azalt açıksa yalnız tepkiler (kısa) çalışır.
 */
export function MokaLive({ children, size, handleRef }: { children: ReactNode; size: number; handleRef?: MutableRefObject<MokaLiveHandle | null> }) {
  const reduce = useReduceMotion();
  const breath = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const wiggle = useRef(new Animated.Value(0)).current;
  const heart = useRef(new Animated.Value(0)).current;
  const [heartKey, setHeartKey] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const loop = (v: Animated.Value, dur: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
    const a = loop(breath, 1700);
    const b = loop(sway, 3100);
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [reduce, breath, sway]);

  useEffect(() => {
    if (!handleRef) return;
    handleRef.current = {
      tickle: () => {
        wiggle.setValue(0);
        Animated.sequence([
          ...[1, -1, 1, -1, 0].map(t => Animated.timing(wiggle, { toValue: t, duration: 70, useNativeDriver: true })),
        ]).start();
      },
      cuddle: () => {
        setHeartKey(k => k + 1);
        heart.setValue(0);
        Animated.timing(heart, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      },
    };
    return () => {
      handleRef.current = null;
    };
  }, [handleRef, wiggle, heart]);

  const transform = [
    { translateY: breath.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.015] }) },
    { scaleY: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) },
    { scaleX: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985] }) },
    { rotate: sway.interpolate({ inputRange: [0, 1], outputRange: ['-1.5deg', '1.5deg'] }) },
    { rotate: wiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-7deg', '7deg'] }) },
  ];

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={{ transform }}>{children}</Animated.View>
      {heartKey > 0 && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill} key={heartKey}>
          {HEARTS.map((h, i) => (
            <Animated.Text
              key={i}
              style={[
                styles.heart,
                { left: size * (0.18 + i * 0.2), fontSize: size * 0.2 },
                {
                  opacity: heart.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] }),
                  transform: [{ translateY: heart.interpolate({ inputRange: [0, 1], outputRange: [0, -size * (0.35 + (i % 2) * 0.15)] }) }],
                },
              ]}
            >
              {h}
            </Animated.Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ heart: { position: 'absolute', top: 0 } });

/** Güne göre poz: gece uyku, sabah kahve. Başka durumda verilen poz. */
export function timePose<T extends string>(pose: T, hour = new Date().getHours()): T | 'blanket' | 'sipping' {
  if (pose !== 'happy' && pose !== 'wink') return pose;
  if (hour >= 22 || hour < 6) return 'blanket';
  if (hour >= 6 && hour < 10) return 'sipping';
  return pose;
}

