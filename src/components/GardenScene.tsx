import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useReduceMotion } from '@/components/motion';
import type { Sky } from '@/lib/weather';

/**
 * Bahçenin canlı sahnesi: günün saatine ve havaya göre gökyüzü, güneş / ay, yıldız, bulut, yağmur, kar,
 * tepeler, ateş böcekleri, uçuşan taç yapraklar. Hepsi arka plan; üstüne saksılar konur. Native driver.
 */

export type Phase = 'dawn' | 'day' | 'dusk' | 'night';

export function phaseOf(hour: number, sky?: Sky): Phase {
  if (sky?.live && !sky.day) return hour >= 4 && hour < 7 ? 'dawn' : hour >= 17 && hour < 21 ? 'dusk' : 'night';
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

const SKY: Record<Phase, [string, string]> = {
  dawn: ['#F6A8A0', '#FFE7C4'],
  day: ['#7EC0EE', '#E6F5FF'],
  dusk: ['#5E4F94', '#F7A67A'],
  night: ['#10173A', '#34457A'],
};
const GREY: Record<Phase, [string, string]> = {
  dawn: ['#9A9AAE', '#D9D3D6'],
  day: ['#8A98A6', '#CFD7DD'],
  dusk: ['#4D4968', '#B79A98'],
  night: ['#0E1430', '#2B3558'],
};
const HILL: Record<Phase, [string, string, string]> = {
  dawn: ['#B7D8B0', '#8EC49A', '#6FAF82'],
  day: ['#A8DCA0', '#7CC48C', '#5DAE74'],
  dusk: ['#7D8F8C', '#5E7E80', '#456B6E'],
  night: ['#2A4A57', '#1F3A4A', '#162E3D'],
};

/** Verilen aralıkta sonsuz döngülü 0→1 değer. */
function useLoop(dur: number, delay = 0, reduce = false) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) return;
    const l = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.linear, useNativeDriver: true }),
      ]),
    );
    l.start();
    return () => l.stop();
  }, [v, dur, delay, reduce]);
  return v;
}

/** Sağa doğru yavaşça kayan bulut. */
function Cloud({ top, size, dur, delay, w, tone }: { top: number; size: number; dur: number; delay: number; w: number; tone: string }) {
  const reduce = useReduceMotion();
  const v = useLoop(dur, delay, reduce);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        left: -size * 1.6,
        transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [reduce ? w * 0.3 : 0, w + size * 3.2] }) }],
      }}
    >
      <Svg width={size * 1.6} height={size * 0.75} viewBox="0 0 80 38">
        <Ellipse cx={40} cy={28} rx={36} ry={9} fill={tone} />
        <Circle cx={26} cy={22} r={13} fill={tone} />
        <Circle cx={44} cy={16} r={16} fill={tone} />
        <Circle cx={58} cy={24} r={11} fill={tone} />
      </Svg>
    </Animated.View>
  );
}

/** Yukarıdan aşağı düşen damla / kar tanesi. */
function Fall({ x, h, dur, delay, kind, drift }: { x: number; h: number; dur: number; delay: number; kind: 'rain' | 'snow' | 'petal'; drift: number }) {
  const reduce = useReduceMotion();
  const v = useLoop(dur, delay, reduce);
  if (reduce) return null;
  const common = {
    opacity: v.interpolate({ inputRange: [0, 0.08, 0.9, 1], outputRange: [0, 1, 1, 0] }),
    transform: [
      { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-20, h] }) },
      { translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, drift, -drift * 0.4] }) },
      ...(kind === 'petal' ? [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '320deg'] }) }] : []),
    ],
  };
  if (kind === 'rain') return <Animated.View pointerEvents="none" style={[styles.drop, { left: `${x}%`, ...common }]} />;
  if (kind === 'snow') return <Animated.View pointerEvents="none" style={[styles.flake, { left: `${x}%`, ...common }]} />;
  return (
    <Animated.Text pointerEvents="none" style={[styles.petal, { left: `${x}%`, ...common }]}>
      {x % 3 < 1 ? '🌸' : x % 3 < 2 ? '🌼' : '🍃'}
    </Animated.Text>
  );
}

/** Havada asılı gibi dolanıp yanıp sönen ateş böceği. */
function Firefly({ x, y, dur, delay }: { x: number; y: number; dur: number; delay: number }) {
  const reduce = useReduceMotion();
  const v = useLoop(dur, delay, reduce);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.fly,
        {
          left: `${x}%`,
          top: `${y}%`,
          opacity: reduce ? 0.8 : v.interpolate({ inputRange: [0, 0.2, 0.5, 0.8, 1], outputRange: [0.1, 1, 0.3, 1, 0.1] }),
          transform: [
            { translateX: v.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, 16, -6, 10, 0] }) },
            { translateY: v.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -10, -22, -8, 0] }) },
          ],
        },
      ]}
    />
  );
}

/** Işıldayan yıldız. */
function Star({ x, y, size, dur, delay }: { x: number; y: number; size: number; dur: number; delay: number }) {
  const reduce = useReduceMotion();
  const v = useLoop(dur, delay, reduce);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: '#FFF8DC',
        opacity: reduce ? 0.8 : v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.25, 1, 0.25] }),
      }}
    />
  );
}

/** Güneşin / ayın yavaş nefes alan hâlesi. */
function Orb({ phase, kind }: { phase: Phase; kind: Sky['kind'] }) {
  const reduce = useReduceMotion();
  const v = useLoop(6000, 0, reduce);
  const night = phase === 'night';
  const hidden = kind === 'rain' || kind === 'storm' || kind === 'fog';
  if (hidden) return null;
  const core = night ? '#F6F1D4' : phase === 'dusk' ? '#FFB36B' : phase === 'dawn' ? '#FFD39A' : '#FFE27A';
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: phase === 'dusk' || phase === 'dawn' ? 38 : 6,
        right: 22,
        transform: [
          { scale: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.08, 1] }) },
          { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', night || reduce ? '0deg' : '45deg'] }) },
        ],
      }}
    >
      <Svg width={96} height={96} viewBox="0 0 96 96">
        <Defs>
          <RadialGradient id="orb" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={core} stopOpacity={0.9} />
            <Stop offset="0.45" stopColor={core} stopOpacity={0.35} />
            <Stop offset="1" stopColor={core} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={48} cy={48} r={48} fill="url(#orb)" />
        <Circle cx={48} cy={48} r={night ? 15 : 17} fill={core} />
        {night && <Circle cx={54} cy={44} r={13} fill={SKY.night[1]} fillOpacity={0.55} />}
      </Svg>
    </Animated.View>
  );
}

/** Saat 0-23'e göre güneşten uzak bir ışık perdesi (gündoğumu / günbatımı sıcaklığı). */
function Glow({ phase }: { phase: Phase }) {
  if (phase === 'day') return null;
  const col = phase === 'night' ? '#0B1030' : phase === 'dusk' ? '#FF8A5C' : '#FFC58A';
  const op = phase === 'night' ? 0.28 : 0.16;
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: col, opacity: op }]} />;
}

export function GardenScene({ hour, sky, blooms, children, style }: { hour: number; sky: Sky; blooms: number; children?: ReactNode; style?: object }) {
  const [size, setSize] = useState({ w: 320, h: 420 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - size.w) > 1 || Math.abs(height - size.h) > 1) setSize({ w: width, h: height });
  };
  const phase = phaseOf(hour, sky);
  const bad = sky.kind === 'rain' || sky.kind === 'storm' || sky.kind === 'fog' || sky.kind === 'snow';
  const [top, bottom] = bad ? GREY[phase] : SKY[phase];
  const hills = HILL[phase];
  const night = phase === 'night';
  const cloudTone = night ? '#46527E' : bad ? '#9AA4AE' : phase === 'dusk' ? '#F8D6C4' : '#FFFFFF';
  const showClouds = sky.kind !== 'clear' || phase !== 'night';
  const cloudCount = bad || sky.kind === 'cloudy' ? 4 : 2;

  return (
    <View style={[StyleSheet.absoluteFill, style]} onLayout={onLayout} pointerEvents="box-none">
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" pointerEvents="none">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={top} />
            <Stop offset="1" stopColor={bottom} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={100} fill="url(#sky)" />
      </Svg>

      {night && !bad && [
        [8, 8, 2, 2600, 0], [22, 18, 1.6, 3100, 600], [36, 6, 2.2, 2800, 1200], [52, 14, 1.6, 3400, 300],
        [64, 5, 2, 2500, 900], [78, 20, 1.6, 3000, 1500], [90, 10, 2.2, 2700, 200], [14, 28, 1.4, 3300, 1800], [70, 30, 1.4, 2900, 700],
      ].map(([x, y, s, d, dl], i) => <Star key={i} x={x} y={y} size={s} dur={d} delay={dl} />)}

      <Orb phase={phase} kind={sky.kind} />

      {showClouds && Array.from({ length: cloudCount }, (_, i) => (
        <Cloud
          key={i}
          top={10 + i * 26 + (i % 2) * 8}
          size={34 + (i % 3) * 14}
          dur={42000 + i * 9000}
          delay={-i * 9000}
          w={size.w}
          tone={cloudTone}
        />
      ))}

      <Svg style={[styles.hills, { height: Math.max(120, size.h * 0.55) }]} width="100%" height="100%" viewBox="0 0 100 60" preserveAspectRatio="none" pointerEvents="none">
        <Path d="M0 28 Q16 12 34 24 T70 18 T100 26 L100 60 L0 60 Z" fill={hills[0]} />
        <Path d="M0 38 Q20 24 42 34 T82 30 T100 36 L100 60 L0 60 Z" fill={hills[1]} />
        <Path d="M0 48 Q26 38 52 46 T100 44 L100 60 L0 60 Z" fill={hills[2]} />
      </Svg>

      {(sky.kind === 'rain' || sky.kind === 'storm') && Array.from({ length: 16 }, (_, i) => (
        <Fall key={i} kind="rain" x={4 + i * 6} h={size.h} dur={700 + (i % 4) * 150} delay={i * 90} drift={-6} />
      ))}
      {sky.kind === 'snow' && Array.from({ length: 14 }, (_, i) => (
        <Fall key={i} kind="snow" x={3 + i * 7} h={size.h} dur={5200 + (i % 5) * 900} delay={i * 400} drift={10 + (i % 3) * 4} />
      ))}
      {sky.kind === 'fog' && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', opacity: 0.22 }]} />}

      {night && !bad && [[14, 52, 3800, 0], [32, 68, 4400, 700], [55, 58, 4100, 1300], [74, 72, 4700, 400], [88, 56, 3900, 1900], [44, 80, 5000, 1000]].map(([x, y, d, dl], i) => (
        <Firefly key={i} x={x} y={y} dur={d} delay={dl} />
      ))}

      {blooms > 0 && !bad && Array.from({ length: Math.min(8, 3 + blooms * 2) }, (_, i) => (
        <Fall key={i} kind="petal" x={6 + i * 12} h={size.h} dur={9000 + (i % 4) * 1800} delay={i * 1300} drift={22 + (i % 3) * 8} />
      ))}

      <Glow phase={phase} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  hills: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  drop: { position: 'absolute', top: 0, width: 1.6, height: 14, borderRadius: 2, backgroundColor: 'rgba(180,215,245,0.8)' },
  flake: { position: 'absolute', top: 0, width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFFFFF' },
  petal: { position: 'absolute', top: 0, fontSize: 14 },
  fly: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF3A0',
    shadowColor: '#FFF3A0',
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
});
