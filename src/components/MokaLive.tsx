import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { useReduceMotion } from '@/components/motion';
import { progressOf } from '@/domain/play';
import { useSky } from '@/lib/weather';
import { onMokaReact, reactMoka } from '@/lib/mokaReact';
import { useStore } from '@/store/AppStore';

/** Dokunma/uzun basma tepkileri için tutamaç. */
export type MokaLiveHandle = { tickle: () => void; cuddle: () => void };

const HEARTS = ['💗', '💛', '💗', '🤎'];

/**
 * Moka'ya can verir: nefes, yan salınım ve tepkiler. Sadece `Animated` (native driver).
 * `children` Moka resmidir. Hareketi azalt açıksa yalnız tepkiler (kısa) çalışır.
 */
export function MokaLive({ children, size, handleRef, weather }: { children: ReactNode; size: number; handleRef?: MutableRefObject<MokaLiveHandle | null>; weather?: boolean }) {
  const reduce = useReduceMotion();
  const sky = useSky(!!weather);
  const gear = !weather ? null : sky.kind === 'rain' || sky.kind === 'storm' ? '☂️' : sky.kind === 'snow' ? '🧣' : null;
  const breath = useState(() => new Animated.Value(0))[0];
  const sway = useState(() => new Animated.Value(0))[0];
  const wiggle = useState(() => new Animated.Value(0))[0];
  const heart = useState(() => new Animated.Value(0))[0];
  const hop = useState(() => new Animated.Value(0))[0];
  const [heartKey, setHeartKey] = useState(0);
  const [stars, setStars] = useState(0);
  const { state } = useStore();
  const level = progressOf(state.play).level;
  const lastLevel = useRef(level);
  useEffect(() => {
    if (level > lastLevel.current) reactMoka('confetti');
    lastLevel.current = level;
  }, [level]);

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

  useEffect(
    () =>
      onMokaReact(r => {
        if (r === 'hug') return handleRef?.current?.cuddle();
        if (r === 'confetti') setStars(k => k + 1);
        hop.setValue(0);
        Animated.sequence([
          Animated.timing(hop, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(hop, { toValue: 0, duration: 160, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(hop, { toValue: 1, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.spring(hop, { toValue: 0, friction: 3, tension: 160, useNativeDriver: true }),
        ]).start();
      }),
    [handleRef, hop],
  );

  const transform = [
    { translateY: hop.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.14] }) },
    { rotate: hop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-5deg'] }) },
    { translateY: breath.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.015] }) },
    { scaleY: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) },
    { scaleX: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985] }) },
    { rotate: sway.interpolate({ inputRange: [0, 1], outputRange: ['-1.5deg', '1.5deg'] }) },
    { rotate: wiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-7deg', '7deg'] }) },
  ];

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={{ transform }}>{children}</Animated.View>
      {!!gear && (
        <Text pointerEvents="none" style={[styles.heart, { right: size * 0.04, left: undefined, top: size * 0.02, fontSize: size * 0.24 }]}>
          {gear}
        </Text>
      )}
      {stars > 0 && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill} key={`s${stars}`}>
          {['⭐', '🎉', '✨', '⭐'].map((h, i) => (
            <Animated.Text
              key={i}
              style={[
                styles.heart,
                { left: size * (0.1 + i * 0.25), fontSize: size * 0.18 },
                {
                  opacity: hop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
                  transform: [{ translateY: hop.interpolate({ inputRange: [0, 1], outputRange: [0, -size * (0.2 + (i % 2) * 0.2)] }) }],
                },
              ]}
            >
              {h}
            </Animated.Text>
          ))}
        </View>
      )}
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

