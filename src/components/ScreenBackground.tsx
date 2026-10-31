import { memo, useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useIsDark } from '@/theme';

import { useReduceMotion } from './motion';

/** Sekme başına renk tonu: üst köşe, orta ve alt renkleri. */
export type Tone = 'peach' | 'sage' | 'lavender' | 'rose' | 'sky';

const TONES: Record<Tone, { light: [string, string, string]; dark: [string, string, string]; dot: string }> = {
  peach: { light: ['#FDEBDD', '#FBF4EA', '#F8E3E0'], dark: ['#3A2F3B', '#2B2A35', '#2F2A3A'], dot: '#F7C9B0' },
  sage: { light: ['#E6F0E8', '#FBF4EA', '#F4ECDD'], dark: ['#2C3A36', '#2B2A35', '#2E3034'], dot: '#BFD8C4' },
  lavender: { light: ['#EEE8F6', '#FBF4EA', '#F8E4E8'], dark: ['#363250', '#2B2A35', '#332C3C'], dot: '#D9CDEB' },
  rose: { light: ['#FAE4E8', '#FBF4EA', '#FCE8DC'], dark: ['#3D2E3A', '#2B2A35', '#35292F'], dot: '#F2C6CF' },
  sky: { light: ['#E4EEF5', '#FBF4EA', '#EEE8F6'], dark: ['#2B3445', '#2B2A35', '#322F45'], dot: '#B9D2E3' },
};

// Sabit parçacık düzeni: [x%, boyut, süre ms, gecikme ms, yol]
const DOTS: [number, number, number, number, number][] = [
  [8, 10, 9000, 0, 90], [24, 6, 12000, 2000, 120], [42, 14, 10500, 800, 70], [58, 7, 13000, 4000, 130],
  [74, 11, 9500, 1500, 100], [90, 8, 11500, 3000, 85], [34, 5, 14000, 5500, 140], [66, 9, 10000, 6500, 110],
];

function Dot({ x, size, dur, delay, travel, color }: { x: number; size: number; dur: number; delay: number; travel: number; color: string }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [v, dur, delay]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: `${x}%`, bottom: -20, width: size, height: size, borderRadius: size / 2, backgroundColor: color,
        opacity: v.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.55, 0.35, 0] }),
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -travel * 6] }) },
          { translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 14, -6] }) },
        ],
      }}
    />
  );
}

/**
 * Ekran arkası: tona göre yumuşak degrade ve yukarı süzülen minik parçacıklar.
 * Degrade tek bir SVG (ucuz), parçacıklar yerel sürücüyle döner; "hareketi azalt" açıksa durur.
 */
export const ScreenBackground = memo(function ScreenBackground({ tone = 'peach' }: { tone?: Tone }) {
  const dark = useIsDark();
  const reduce = useReduceMotion();
  const t = TONES[tone];
  const [a, b, c] = dark ? t.dark : t.light;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="g" x1="0" y1="0" x2="0.35" y2="1">
            <Stop offset="0" stopColor={a} />
            <Stop offset="0.5" stopColor={b} />
            <Stop offset="1" stopColor={c} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#g)" />
      </Svg>
      {!reduce && DOTS.map(([x, s, d, dl, tr], i) => (
        <Dot key={i} x={x} size={s} dur={d} delay={dl} travel={tr} color={dark ? 'rgba(255,255,255,0.35)' : t.dot} />
      ))}
    </View>
  );
});
