import { memo, useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useIsDark } from '@/theme';

import { useReduceMotion } from './motion';

/** Sekme başına renk tonu: üst köşe, orta ve alt renkleri. */
export type Tone = 'peach' | 'sage' | 'lavender' | 'rose' | 'sky';

const TONES: Record<Tone, { light: [string, string, string]; dark: [string, string, string]; dot: string }> = {
  peach: { light: ['#F8EFE4', '#F7F2EA', '#F4ECE1'], dark: ['#222A3B', '#1C2230', '#1A202D'], dot: '#F7C9B0' },
  sage: { light: ['#EEF1E6', '#F7F2EA', '#F4ECE1'], dark: ['#202B33', '#1C2230', '#1A202D'], dot: '#BFD8C4' },
  lavender: { light: ['#F1ECE9', '#F7F2EA', '#F4ECE1'], dark: ['#242A3E', '#1C2230', '#1A202D'], dot: '#D9CDEB' },
  rose: { light: ['#F8ECE6', '#F7F2EA', '#F4ECE1'], dark: ['#262A3A', '#1C2230', '#1A202D'], dot: '#F2C6CF' },
  sky: { light: ['#ECEFEC', '#F7F2EA', '#F4ECE1'], dark: ['#202B3C', '#1C2230', '#1A202D'], dot: '#B9D2E3' },
};

/**
 * Aşağı kaydırdıkça zeminin döndüğü daha koyu, doygun ton (Screen kaydırmayla bu renge geçer).
 * Kart içi yazılar kartın kendi zemininde durduğu için kontrast bozulmaz; sayfa yazısı (ink / muted) bu tonlarda da AA.
 */
export const DEEP: Record<Tone, { light: string; dark: string }> = {
  peach: { light: '#F0DCC9', dark: '#2A2431' },
  sage: { light: '#DCE6D5', dark: '#1D2A2B' },
  lavender: { light: '#E3DBEC', dark: '#242238' },
  rose: { light: '#F0D8D5', dark: '#2C2231' },
  sky: { light: '#D8E3EA', dark: '#192637' },
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
      {false && !reduce && DOTS.map(([x, s, d, dl, tr], i) => (
        <Dot key={i} x={x} size={s} dur={d} delay={dl} travel={tr} color={dark ? 'rgba(255,255,255,0.35)' : t.dot} />
      ))}
    </View>
  );
});
