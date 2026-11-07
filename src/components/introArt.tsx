import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useReduceMotion } from '@/components/motion';

/**
 * Açılış ve tanıtım çizimleri için ortak vektör seti. Sahneler react-native-svg ile çizilir;
 * hareket sadece parçaları saran Animated.View'ların opacity / transform değerlerindedir (native driver).
 * Renkler krem temaya sabittir (bu ekranlar her zaman açık temada).
 */
export const ART = {
  ink: '#283044',
  cream: '#FFFDF9',
  paper: '#FFF8EF',
  wall: '#FBEBDD',
  wallShade: '#F1D9C4',
  roof: '#C48F78',
  roofHi: '#D6A58D',
  roofLo: '#AE7A64',
  door: '#8B786D',
  glow: '#FFD594',
  glowSoft: '#FFE9C7',
  pane: '#E7DED3',
  sage: '#BFD8C4',
  sageDeep: '#8DB399',
  leaf: '#78A585',
  peach: '#F7C9B0',
  peachDeep: '#EDAA8A',
  rose: '#F2C6CF',
  roseDeep: '#E59AAA',
  lavender: '#D9CDEB',
  lavenderDeep: '#B3A2D6',
  sky: '#C9E2E4',
  blue: '#78A1BB',
  clay: '#BFA89E',
  line: '#E8DFD2',
  sun: '#F6C77B',
  dust: '#A39488',
  shadow: 'rgba(40,48,68,0.10)',
  steam: '#CDBFB3',
};

type AnimStyle = ComponentProps<typeof Animated.View>['style'];

/** Mutlak konumlu, kendi SVG'sini taşıyan hareketli parça. */
export function Piece({ x, y, w, h, style, children }: { x: number; y: number; w: number; h: number; style?: AnimStyle; children: ReactNode }) {
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x, top: y, width: w, height: h }, style]}>
      <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        {children}
      </Svg>
    </Animated.View>
  );
}

/** 0→1 sürekli döngü. "Hareketi azalt" açıkken `still` değerinde durur. */
export function useLoop(ms: number, still = 0.7, active = true) {
  const reduce = useReduceMotion();
  const [t] = useState(() => new Animated.Value(still));
  useEffect(() => {
    if (reduce || !active) {
      t.setValue(still);
      return;
    }
    t.setValue(0);
    const a = Animated.loop(Animated.timing(t, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [t, ms, reduce, still, active]);
  return t;
}

/** Anahtar kareler (giriş aralığı sınırda sabitlenir). */
export const kf = (t: Animated.Value | Animated.AnimatedInterpolation<number>, ins: number[], outs: number[]) =>
  (t as Animated.Value).interpolate<number>({ inputRange: ins, outputRange: outs, extrapolate: 'clamp' });

const at = (ins: number[], outs: number[], u: number) => {
  if (u <= ins[0]!) return outs[0]!;
  for (let i = 1; i < ins.length; i++) {
    if (u <= ins[i]!) {
      const a = ins[i - 1]!;
      const b = ins[i]!;
      return b === a ? outs[i]! : outs[i - 1]! + ((outs[i]! - outs[i - 1]!) * (u - a)) / (b - a);
    }
  }
  return outs[outs.length - 1]!;
};

/**
 * Aynı döngüde faz kaydırılmış anahtar kareler: parçalar tek bir zamanlayıcıyla sırayla akar.
 * f(0) ile f(1) eşit olmalı (yoksa döngü başında sıçrar).
 */
export function phase(t: Animated.Value, off: number, ins: number[], outs: number[]) {
  const o = ((off % 1) + 1) % 1;
  if (o === 0) return kf(t, ins, outs);
  const pts: [number, number][] = ins.map((x, i) => [(x + o) % 1, outs[i]!]);
  const edge = at(ins, outs, 1 - o);
  pts.push([0, edge], [1, edge]);
  pts.sort((p, q) => p[0] - q[0]);
  return kf(t, pts.map(p => p[0]), pts.map(p => p[1]));
}

export const deg = (v: Animated.AnimatedInterpolation<number>, range = 360) =>
  v.interpolate({ inputRange: [-range, range], outputRange: [`${-range}deg`, `${range}deg`] });

/** Dört köşeli, içe kıvrık parıltı. */
export function sparklePath(s: number) {
  const m = s / 2;
  return `M${m} 0 Q${m} ${m} ${s} ${m} Q${m} ${m} ${m} ${s} Q${m} ${m} 0 ${m} Q${m} ${m} ${m} 0 Z`;
}

export function Sparkle({ x, y, s, color = ART.sun, style }: { x: number; y: number; s: number; color?: string; style?: AnimStyle }) {
  return (
    <Piece x={x - s / 2} y={y - s / 2} w={s} h={s} style={style}>
      <Path d={sparklePath(s)} fill={color} />
    </Piece>
  );
}

/** 20×18 kalp. */
export const HEART = 'M10 17.5 C4 12.6 0 9.2 0 5.2 C0 2.2 2.4 0 5.2 0 C7.3 0 9 1.2 10 3 C11 1.2 12.7 0 14.8 0 C17.6 0 20 2.2 20 5.2 C20 9.2 16 12.6 10 17.5 Z';

/** Yuvarlatılmış üçgen çatı, w×h kutuda. */
export function roofPath(w: number, h: number) {
  const r = 6;
  return `M${r} ${h} Q0 ${h} ${r * 0.8} ${h - r} L${w / 2 - r} ${r * 0.9} Q${w / 2} 0 ${w / 2 + r} ${r * 0.9} L${w - r * 0.8} ${h - r} Q${w} ${h} ${w - r} ${h} Z`;
}
