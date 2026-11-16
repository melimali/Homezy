import { useState, type JSX } from 'react';
import { Animated, View, type LayoutChangeEvent } from 'react-native';
import { Circle, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { ART, HEART, Piece, Sparkle, deg, kf, phase, roofPath, useLoop } from '@/components/introArt';

/** Tanıtım sayfalarının vektör sahneleri (300×130 çizim alanı, dar ekranda orantılı küçülür). Emoji yok. */
export type DecoKind = 'hello' | 'draw' | 'tasks' | 'house' | 'garden' | 'self';

const W = 300;
const H = 130;

export function IntroDeco({ kind, active = true }: { kind: DecoKind; active?: boolean }) {
  const [box, setBox] = useState({ w: W, h: H });
  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const scale = Math.min(1, box.w / W, box.h / H);
  const Scene = SCENES[kind];
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} onLayout={onLayout} pointerEvents="none">
      <View style={{ width: W, height: H, transform: [{ scale }] }}>
        <Scene active={active} />
      </View>
    </View>
  );
}

type SceneProps = { active: boolean };

/* ------------------------------------------------------------------ 1 · Merhaba: tüten kupa, uçuşan kalpler */
function Hello({ active }: SceneProps) {
  const t = useLoop(4200, 0.35, active);
  const steam = (i: number) => {
    const off = i * 0.33;
    return {
      opacity: phase(t, off, [0, 0.15, 0.6, 1], [0, 0.9, 0.35, 0]),
      transform: [
        { translateY: phase(t, off, [0, 1], [14, -16]) },
        { scaleX: phase(t, off, [0, 0.5, 1], [0.85, 1.1, 0.85]) },
      ],
    };
  };
  const heart = (off: number, dx: number) => ({
    opacity: phase(t, off, [0, 0.12, 0.5, 0.62, 1], [0, 1, 0.9, 0, 0]),
    transform: [
      { translateY: phase(t, off, [0, 0.62, 1], [16, -30, -30]) },
      { translateX: phase(t, off, [0, 0.2, 0.4, 0.62, 1], [0, dx, 0, dx, dx]) },
      { scale: phase(t, off, [0, 0.12, 0.62, 1], [0.4, 1, 0.8, 0.8]) },
    ],
  });
  const tw = (off: number) => ({ opacity: phase(t, off, [0, 0.1, 0.22, 1], [0, 1, 0, 0]), transform: [{ scale: phase(t, off, [0, 0.1, 0.22, 1], [0.2, 1, 0.2, 0.2]) }] });
  return (
    <>
      <Piece x={96} y={14} w={108} h={108}>
        <Defs>
          <RadialGradient id="hg" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={ART.glowSoft} stopOpacity={1} />
            <Stop offset="1" stopColor={ART.glowSoft} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={54} cy={54} r={54} fill="url(#hg)" />
      </Piece>
      {[0, 1, 2].map(i => (
        <Piece key={i} x={128 + i * 13} y={20} w={14} h={40} style={steam(i)}>
          <Path d="M7 38 C1 31 13 25 7 18 C1 11 12 6 7 1" stroke={ART.steam} strokeWidth={3.6} strokeLinecap="round" fill="none" />
        </Piece>
      ))}
      <Piece x={104} y={112} w={92} h={12}>
        <Ellipse cx={46} cy={6} rx={46} ry={6} fill={ART.shadow} />
      </Piece>
      <Piece x={106} y={100} w={88} h={16}>
        <Ellipse cx={44} cy={8} rx={44} ry={7} fill={ART.line} />
        <Ellipse cx={44} cy={6.5} rx={30} ry={4} fill={ART.cream} />
      </Piece>
      <Piece x={118} y={58} w={76} h={50}>
        <Circle cx={56} cy={22} r={11} stroke={ART.peachDeep} strokeWidth={7} fill="none" />
        <Path d="M2 6 H54 V30 Q54 48 36 48 H20 Q2 48 2 30 Z" fill={ART.peach} />
        <Path d="M2 6 H10 V30 Q10 44 22 47 Q2 46 2 30 Z" fill={ART.peachDeep} opacity={0.35} />
        <Ellipse cx={28} cy={6} rx={26} ry={5} fill={ART.peachDeep} />
        <Ellipse cx={28} cy={6.5} rx={21} ry={3.4} fill="#8A5A43" />
        <G transform="translate(19 20) scale(0.9)">
          <Path d={HEART} fill={ART.cream} />
        </G>
      </Piece>
      <Piece x={70} y={60} w={20} h={18} style={heart(0, -8)}>
        <Path d={HEART} fill={ART.roseDeep} />
      </Piece>
      <Piece x={214} y={54} w={20} h={18} style={heart(0.5, 8)}>
        <Path d={HEART} fill={ART.rose} />
      </Piece>
      <Sparkle x={86} y={30} s={14} style={tw(0.15)} />
      <Sparkle x={222} y={24} s={18} color={ART.peachDeep} style={tw(0.55)} />
      <Sparkle x={240} y={96} s={11} style={tw(0.8)} />
    </>
  );
}

/* ------------------------------------------------------------------ 2 · Evini çiz: plan kartı, odalar boyanır */
const ROOMS = [
  { x: 74, y: 20, w: 76, h: 52, c: ART.lavender, d: ART.lavenderDeep },
  { x: 154, y: 20, w: 72, h: 40, c: ART.peach, d: ART.peachDeep },
  { x: 74, y: 76, w: 56, h: 34, c: ART.sky, d: ART.blue },
  { x: 134, y: 64, w: 92, h: 46, c: ART.sage, d: ART.sageDeep },
];
function Draw({ active }: SceneProps) {
  const t = useLoop(5600, 0.8, active);
  const a = (i: number) => 0.06 + i * 0.16;
  const room = (i: number) => {
    const s = a(i);
    return {
      opacity: kf(t, [0, s, s + 0.07, 0.86, 0.95, 1], [0, 0, 1, 1, 0, 0]),
      transform: [{ scale: kf(t, [0, s, s + 0.05, s + 0.09, 1], [0.6, 0.6, 1.06, 1, 1]) }],
    };
  };
  // Kalem her odanın ortasına gider (ucu sol altta).
  const cx = ROOMS.map(r => r.x + r.w / 2);
  const cy = ROOMS.map(r => r.y + r.h / 2);
  const ins = [0, a(0), a(1), a(2), a(3), 0.8, 0.92, 1];
  const pen = {
    opacity: kf(t, [0, 0.03, 0.78, 0.86, 1], [0, 1, 1, 0, 0]),
    transform: [
      { translateX: kf(t, ins, [40, cx[0]!, cx[1]!, cx[2]!, cx[3]!, cx[3]!, 40, 40]) },
      { translateY: kf(t, ins, [70, cy[0]! - 38, cy[1]! - 38, cy[2]! - 38, cy[3]! - 38, cy[3]! - 38, 70, 70]) },
      { rotate: deg(kf(t, [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 1], [0, -6, 4, -6, 4, -6, 4, 0, 0]), 30) },
    ],
  };
  const done = { opacity: kf(t, [0, 0.66, 0.72, 0.84, 0.9, 1], [0, 0, 1, 1, 0, 0]), transform: [{ scale: kf(t, [0, 0.66, 0.72, 0.84, 1], [0.2, 0.2, 1.2, 1, 1]) }, { rotate: deg(kf(t, [0, 1], [0, 90]), 90) }] };
  return (
    <>
      <Piece x={68} y={120} w={164} h={10}>
        <Ellipse cx={82} cy={5} rx={82} ry={5} fill={ART.shadow} />
      </Piece>
      <Piece x={64} y={10} w={172} h={110}>
        <Rect x={0} y={0} width={172} height={110} rx={18} fill={ART.cream} />
        <Rect x={0.75} y={0.75} width={170.5} height={108.5} rx={17.5} fill="none" stroke={ART.line} strokeWidth={1.5} />
        {Array.from({ length: 8 }, (_, i) => Array.from({ length: 5 }, (_, j) => (
          <Circle key={`${i}-${j}`} cx={14 + i * 20.6} cy={14 + j * 20.5} r={1.4} fill={ART.line} />
        )))}
      </Piece>
      {ROOMS.map((r, i) => (
        <Piece key={i} x={r.x} y={r.y} w={r.w} h={r.h} style={room(i)}>
          <Rect x={0} y={0} width={r.w} height={r.h} rx={10} fill={r.c} />
          <Rect x={4} y={4} width={r.w - 8} height={Math.min(10, r.h / 4)} rx={5} fill="#fff" opacity={0.35} />
          <Rect x={r.w / 2 - 8} y={r.h - 3} width={16} height={3} rx={1.5} fill={r.d} />
        </Piece>
      ))}
      <Piece x={0} y={0} w={40} h={40} style={pen}>
        <G transform="translate(2 38) rotate(-45)">
          <Rect x={8} y={-5} width={30} height={10} rx={2} fill={ART.sun} />
          <Rect x={8} y={-5} width={30} height={3.4} rx={1.5} fill="#fff" opacity={0.4} />
          <Rect x={36} y={-5} width={7} height={10} rx={2.5} fill={ART.roseDeep} />
          <Path d="M8 -5 L0 0 L8 5 Z" fill={ART.paper} />
          <Path d="M2.6 -1.6 L0 0 L2.6 1.6 Z" fill={ART.ink} />
        </G>
      </Piece>
      <Sparkle x={232} y={14} s={20} color={ART.sun} style={done} />
    </>
  );
}

/* ------------------------------------------------------------------ 3 · Günlük işler: liste tek tek tamamlanır */
const TAGS = [ART.peach, ART.lavender, ART.rose];
function Tasks({ active }: SceneProps) {
  const t = useLoop(5200, 0.8, active);
  const a = (i: number) => 0.12 + i * 0.2;
  const check = (i: number) => ({ opacity: kf(t, [0, a(i), a(i) + 0.04, 0.88, 0.96, 1], [0, 0, 1, 1, 0, 0]), transform: [{ scale: kf(t, [0, a(i), a(i) + 0.05, a(i) + 0.09, 1], [0.3, 0.3, 1.25, 1, 1]) }] });
  const strike = (i: number) => ({ opacity: kf(t, [0, 0.88, 0.96, 1], [1, 1, 0, 0]), transform: [{ scaleX: kf(t, [0, a(i) + 0.04, a(i) + 0.12, 1], [0, 0, 1, 1]) }], transformOrigin: 'left' as const });
  const fill = {
    transform: [{ scaleX: kf(t, [0, a(0) + 0.05, a(0) + 0.1, a(1) + 0.05, a(1) + 0.1, a(2) + 0.05, a(2) + 0.1, 0.88, 0.96, 1], [0.04, 0.04, 0.34, 0.34, 0.67, 0.67, 1, 1, 0.04, 0.04]) }],
    transformOrigin: 'left' as const,
  };
  const star = { opacity: kf(t, [0, 0.62, 0.67, 0.84, 0.9, 1], [0, 0, 1, 1, 0, 0]), transform: [{ scale: kf(t, [0, 0.62, 0.68, 0.74, 1], [0.2, 0.2, 1.3, 1, 1]) }] };
  return (
    <>
      <Piece x={58} y={122} w={184} h={8}>
        <Ellipse cx={92} cy={4} rx={92} ry={4} fill={ART.shadow} />
      </Piece>
      <Piece x={54} y={2} w={192} h={120}>
        <Rect x={0} y={0} width={192} height={120} rx={20} fill={ART.cream} />
        <Rect x={0.75} y={0.75} width={190.5} height={118.5} rx={19.5} fill="none" stroke={ART.line} strokeWidth={1.5} />
        {[0, 1, 2].map(i => (
          <G key={i} transform={`translate(0 ${16 + i * 30})`}>
            <Circle cx={22} cy={10} r={9} fill="none" stroke={ART.line} strokeWidth={2.5} />
            <Rect x={40} y={5} width={i === 1 ? 84 : 104} height={10} rx={5} fill={ART.line} />
            <Rect x={156} y={3} width={22} height={14} rx={7} fill={TAGS[i]} />
          </G>
        ))}
        <Rect x={16} y={104} width={160} height={7} rx={3.5} fill={ART.line} />
      </Piece>
      {[0, 1, 2].map(i => (
        <Piece key={`c${i}`} x={54 + 12} y={2 + 16 + i * 30} w={20} h={20} style={check(i)}>
          <Circle cx={10} cy={10} r={10} fill={ART.sageDeep} />
          <Path d="M5.5 10.4 L8.6 13.4 L14.6 7" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Piece>
      ))}
      {[0, 1, 2].map(i => (
        <Piece key={`s${i}`} x={54 + 40} y={2 + 16 + i * 30 + 5} w={i === 1 ? 84 : 104} h={10} style={strike(i)}>
          <Rect x={0} y={0} width={i === 1 ? 84 : 104} height={10} rx={5} fill={ART.sage} />
        </Piece>
      ))}
      <Piece x={54 + 16} y={2 + 104} w={160} h={7} style={fill}>
        <Rect x={0} y={0} width={160} height={7} rx={3.5} fill={ART.sageDeep} />
      </Piece>
      <Sparkle x={246} y={8} s={24} color={ART.sun} style={star} />
      <Sparkle x={40} y={100} s={12} color={ART.peachDeep} style={star} />
    </>
  );
}

/* ------------------------------------------------------------------ 4 · Evin büyür: kat çıkar, toz tutar, yeniden parlar */
function Tree({ x, s = 1, c = ART.sage }: { x: number; s?: number; c?: string }) {
  return (
    <Piece x={x} y={120 - 54 * s} w={36 * s} h={54 * s}>
      <G transform={`scale(${s})`}>
        <Rect x={16} y={30} width={4} height={24} rx={2} fill={ART.door} />
        <Circle cx={18} cy={20} r={16} fill={c} />
        <Circle cx={12} cy={14} r={6} fill="#fff" opacity={0.25} />
      </G>
    </Piece>
  );
}

function House({ active }: SceneProps) {
  const t = useLoop(6400, 0.8, active);
  const grow = kf(t, [0, 0.1, 0.22, 1], [0, 0, 1, 1]);
  const all = { opacity: kf(t, [0, 0.04, 0.93, 1], [0, 1, 1, 0]) };
  const floor2 = { transform: [{ scaleY: kf(t, [0, 0.1, 0.2, 0.24, 1], [0, 0, 1.06, 1, 1]) }], transformOrigin: 'bottom' as const };
  const roof = { transform: [{ translateY: kf(t, [0, 0.1, 0.2, 0.24, 1], [32, 32, -3, 0, 0]) }] };
  const dust = { opacity: kf(t, [0, 0.32, 0.42, 0.54, 0.62, 1], [0, 0, 0.62, 0.62, 0, 0]) };
  const puff = (dx: number, off: number) => ({
    opacity: kf(t, [0, 0.32 + off, 0.42 + off, 0.54, 0.62, 1], [0, 0, 0.8, 0.8, 0, 0]),
    transform: [{ translateX: kf(t, [0, 0.32, 0.62, 1], [0, 0, dx, dx]) }, { scale: kf(t, [0, 0.32, 0.45, 0.62, 1], [0.5, 0.5, 1, 1.2, 1.2]) }],
  });
  const lit = { opacity: kf(t, [0, 0.3, 0.42, 0.56, 0.64, 1], [1, 1, 0.15, 0.15, 1, 1]) };
  const halo = { opacity: kf(t, [0, 0.58, 0.66, 0.8, 0.9, 1], [0, 0, 1, 0.6, 0, 0]), transform: [{ scale: kf(t, [0, 0.58, 0.7, 1], [0.6, 0.6, 1.1, 1.1]) }] };
  const pop = (d: number) => ({ opacity: kf(t, [0, 0.6 + d, 0.65 + d, 0.76 + d, 0.82 + d, 1], [0, 0, 1, 1, 0, 0]), transform: [{ scale: kf(t, [0, 0.6 + d, 0.66 + d, 0.72 + d, 1], [0.2, 0.2, 1.25, 1, 1]) }] });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: W, height: H }, all]}>
      <Piece x={20} y={114} w={260} h={14}>
        <Rect x={0} y={4} width={260} height={8} rx={4} fill={ART.sage} opacity={0.55} />
        <Ellipse cx={130} cy={6} rx={70} ry={5} fill={ART.shadow} />
      </Piece>
      <Tree x={46} s={0.95} />
      <Tree x={78} s={0.7} c={ART.sageDeep} />
      <Tree x={214} s={0.85} c={ART.sageDeep} />
      {/* Halo pencerelerin arkasında */}
      <Piece x={96} y={20} w={108} h={108} style={halo}>
        <Defs>
          <RadialGradient id="hh" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={ART.glow} stopOpacity={0.75} />
            <Stop offset="1" stopColor={ART.glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={54} cy={54} r={54} fill="url(#hh)" />
      </Piece>
      {/* 1. kat */}
      <Piece x={112} y={76} w={76} h={44}>
        <Rect x={0} y={0} width={76} height={44} rx={6} fill={ART.wall} />
        <Rect x={0} y={36} width={76} height={8} rx={4} fill={ART.wallShade} />
        <Rect x={44} y={14} width={18} height={30} rx={8} fill={ART.door} />
        <Circle cx={57} cy={30} r={1.6} fill={ART.glowSoft} />
        <Rect x={10} y={12} width={22} height={18} rx={5} fill={ART.pane} />
      </Piece>
      <Piece x={122} y={88} w={22} h={18} style={lit}>
        <Rect x={0} y={0} width={22} height={18} rx={5} fill={ART.glow} />
        <Rect x={10} y={0} width={2} height={18} fill={ART.wall} />
        <Rect x={0} y={8} width={22} height={2} fill={ART.wall} />
      </Piece>
      {/* 2. kat */}
      <Piece x={112} y={44} w={76} h={34} style={[floor2, { opacity: grow }]}>
        <Rect x={0} y={0} width={76} height={36} rx={6} fill={ART.wall} />
        <Rect x={0} y={30} width={76} height={4} fill={ART.wallShade} />
        <Rect x={12} y={8} width={18} height={16} rx={5} fill={ART.glow} />
        <Rect x={46} y={8} width={18} height={16} rx={5} fill={ART.glow} />
        <Rect x={20} y={8} width={2} height={16} fill={ART.wall} />
        <Rect x={54} y={8} width={2} height={16} fill={ART.wall} />
      </Piece>
      {/* Çatı ve baca */}
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: W, height: H }, roof]}>
        <Piece x={164} y={8} w={12} h={26}>
          <Rect x={0} y={0} width={12} height={26} rx={3} fill={ART.roofLo} />
          <Rect x={-1} y={0} width={14} height={5} rx={2.5} fill={ART.roof} />
        </Piece>
        <Piece x={100} y={4} w={100} h={44}>
          <Path d={roofPath(100, 44)} fill={ART.roof} />
          <Path d="M50 6 L18 32" stroke={ART.roofHi} strokeWidth={4} strokeLinecap="round" opacity={0.7} />
          <Rect x={4} y={38} width={92} height={6} rx={3} fill={ART.roofLo} />
        </Piece>
      </Animated.View>
      {/* Toz: evin üstüne gri perde ve uçuşan toz bulutları */}
      <Piece x={100} y={4} w={100} h={116} style={dust}>
        <Path d={roofPath(100, 44)} fill={ART.dust} />
        <Rect x={12} y={40} width={76} height={76} rx={6} fill={ART.dust} />
        <Path d="M22 60 q6 -8 12 0 M60 86 q5 -6 10 0" stroke="#8A7C71" strokeWidth={2} fill="none" strokeLinecap="round" />
      </Piece>
      {([[84, 70, -14, 0], [196, 50, 14, 0.03], [174, 96, 10, 0.05], [96, 100, -10, 0.02]] as const).map(([x, y, dx, off], i) => (
        <Piece key={i} x={x} y={y} w={30} h={18} style={puff(dx, off)}>
          <Circle cx={9} cy={11} r={7} fill={ART.dust} opacity={0.55} />
          <Circle cx={18} cy={8} r={8} fill={ART.dust} opacity={0.45} />
          <Circle cx={24} cy={12} r={5} fill={ART.dust} opacity={0.5} />
        </Piece>
      ))}
      <Sparkle x={98} y={34} s={18} style={pop(0)} />
      <Sparkle x={206} y={60} s={22} color={ART.peachDeep} style={pop(0.03)} />
      <Sparkle x={190} y={16} s={13} style={pop(0.06)} />
      <Sparkle x={104} y={92} s={12} color={ART.peachDeep} style={pop(0.08)} />
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ 5 · Bahçe: su damlar, çiçekler açar */
const FLOWERS = [
  { x: 104, h: 46, c: ART.roseDeep, l: ART.rose },
  { x: 150, h: 60, c: ART.peachDeep, l: ART.peach },
  { x: 196, h: 40, c: ART.lavenderDeep, l: ART.lavender },
];
function Bloom({ c, l }: { c: string; l: string }) {
  return (
    <G>
      {[0, 72, 144, 216, 288].map(r => (
        <Ellipse key={r} cx={15} cy={7.5} rx={6} ry={8} fill={r % 144 === 0 ? c : l} transform={`rotate(${r} 15 15)`} />
      ))}
      <Circle cx={15} cy={15} r={5.5} fill={ART.sun} />
      <Circle cx={13.5} cy={13.5} r={2} fill="#fff" opacity={0.6} />
    </G>
  );
}
function Garden({ active }: SceneProps) {
  const t = useLoop(6400, 0.8, active);
  const a = (i: number) => 0.04 + i * 0.2;
  const drop = (i: number) => ({
    opacity: kf(t, [0, a(i), a(i) + 0.02, a(i) + 0.09, a(i) + 0.11, 1], [0, 0, 1, 1, 0, 0]),
    transform: [{ translateY: kf(t, [0, a(i), a(i) + 0.1, 1], [0, 0, 112 - FLOWERS[i]!.h - 20, 112 - FLOWERS[i]!.h - 20]) }],
  });
  const stem = (i: number) => ({ transform: [{ scaleY: kf(t, [0, a(i) + 0.08, a(i) + 0.18, 0.88, 0.97, 1], [0, 0, 1, 1, 0, 0]) }], transformOrigin: 'bottom' as const });
  const bloom = (i: number) => ({
    opacity: kf(t, [0, a(i) + 0.16, a(i) + 0.18, 0.88, 0.94, 1], [0, 0, 1, 1, 0, 0]),
    transform: [
      { scale: kf(t, [0, a(i) + 0.16, a(i) + 0.22, a(i) + 0.26, 0.88, 0.95, 1], [0, 0, 1.2, 1, 1, 0.2, 0]) },
      { rotate: deg(kf(t, [0, a(i) + 0.16, 0.9, 1], [-40, -40, 20, 20]), 90) },
    ],
  });
  const cloud = { transform: [{ translateX: kf(t, [0, 0.5, 1], [0, 26, 0]) }] };
  const sun = { transform: [{ rotate: deg(kf(t, [0, 1], [0, 45]), 90) }] };
  const butterfly = {
    opacity: kf(t, [0, 0.55, 0.62, 0.86, 0.92, 1], [0, 0, 1, 1, 0, 0]),
    transform: [
      { translateX: kf(t, [0, 0.55, 0.92, 1], [0, 0, 70, 70]) },
      { translateY: kf(t, [0, 0.55, 0.65, 0.75, 0.85, 0.92, 1], [0, 0, -10, 2, -12, -4, -4]) },
      { scaleX: kf(t, [0, 0.58, 0.6, 0.62, 0.64, 0.66, 0.68, 0.7, 0.72, 0.74, 0.76, 0.78, 0.8, 0.82, 0.84, 1], [1, 1, 0.4, 1, 0.4, 1, 0.4, 1, 0.4, 1, 0.4, 1, 0.4, 1, 0.4, 1]) },
    ],
  };
  return (
    <>
      <Piece x={236} y={6} w={44} h={44} style={sun}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map(r => (
          <Rect key={r} x={20.5} y={1} width={3} height={8} rx={1.5} fill={ART.sun} transform={`rotate(${r} 22 22)`} />
        ))}
        <Circle cx={22} cy={22} r={11} fill={ART.sun} />
      </Piece>
      <Piece x={18} y={18} w={64} h={26} style={cloud}>
        <Circle cx={18} cy={16} r={10} fill="#fff" />
        <Circle cx={32} cy={11} r={11} fill="#fff" />
        <Circle cx={46} cy={16} r={9} fill="#fff" />
        <Rect x={10} y={16} width={44} height={10} rx={5} fill="#fff" />
      </Piece>
      <Piece x={0} y={100} w={300} h={30}>
        <Path d="M0 14 Q75 0 150 10 T300 8 V30 H0 Z" fill={ART.sage} />
        <Path d="M0 22 Q90 12 170 20 T300 18 V30 H0 Z" fill={ART.sageDeep} opacity={0.55} />
      </Piece>
      {FLOWERS.map((f, i) => (
        <Piece key={`d${i}`} x={f.x - 4} y={4} w={8} h={12} style={drop(i)}>
          <Path d="M4 0 C4 0 0 5.5 0 8 A4 4 0 0 0 8 8 C8 5.5 4 0 4 0 Z" fill={ART.blue} />
        </Piece>
      ))}
      {FLOWERS.map((f, i) => (
        <Piece key={`s${i}`} x={f.x - 14} y={112 - f.h} w={28} h={f.h} style={stem(i)}>
          <Rect x={12.5} y={0} width={3} height={f.h} rx={1.5} fill={ART.leaf} />
          <Path d={`M14 ${f.h * 0.6} Q2 ${f.h * 0.5} 3 ${f.h * 0.36} Q12 ${f.h * 0.4} 14 ${f.h * 0.6} Z`} fill={ART.leaf} />
          <Path d={`M14 ${f.h * 0.78} Q26 ${f.h * 0.68} 25 ${f.h * 0.54} Q16 ${f.h * 0.58} 14 ${f.h * 0.78} Z`} fill={ART.sageDeep} />
        </Piece>
      ))}
      {FLOWERS.map((f, i) => (
        <Piece key={`b${i}`} x={f.x - 15} y={112 - f.h - 14} w={30} h={30} style={bloom(i)}>
          <Bloom c={f.c} l={f.l} />
        </Piece>
      ))}
      <Piece x={60} y={50} w={22} h={16} style={butterfly}>
        <Ellipse cx={6} cy={6} rx={6} ry={5} fill={ART.lavenderDeep} />
        <Ellipse cx={16} cy={6} rx={6} ry={5} fill={ART.lavenderDeep} />
        <Ellipse cx={7} cy={12} rx={4} ry={3.4} fill={ART.lavender} />
        <Ellipse cx={15} cy={12} rx={4} ry={3.4} fill={ART.lavender} />
        <Rect x={10} y={3} width={2} height={12} rx={1} fill={ART.ink} />
      </Piece>
    </>
  );
}

/* ------------------------------------------------------------------ 6 · Kendin için: spor, günlük, iç huzur + 7 günlük seri */
function Dumbbell() {
  return (
    <G>
      <Rect x={9} y={16.5} width={18} height={3} rx={1.5} fill={ART.ink} opacity={0.75} />
      <Rect x={5} y={10} width={6} height={16} rx={2.5} fill={ART.sageDeep} />
      <Rect x={25} y={10} width={6} height={16} rx={2.5} fill={ART.sageDeep} />
      <Rect x={2} y={13} width={4} height={10} rx={2} fill={ART.leaf} />
      <Rect x={30} y={13} width={4} height={10} rx={2} fill={ART.leaf} />
    </G>
  );
}
function Book() {
  return (
    <G>
      <Path d="M18 10 Q11 6 4 8 V27 Q11 25 18 29 Z" fill={ART.lavenderDeep} />
      <Path d="M18 10 Q25 6 32 8 V27 Q25 25 18 29 Z" fill={ART.lavender} />
      <Path d="M8 13 H14 M8 17 H14 M22 13 H28 M22 17 H28" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" opacity={0.8} />
    </G>
  );
}
function Calm() {
  return (
    <G transform="translate(8 10) scale(1)">
      <Path d={HEART} fill={ART.roseDeep} />
      <Path d="M5 4.5 Q6.5 2.8 8.5 3.6" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" fill="none" opacity={0.7} />
    </G>
  );
}
const BADGES = [
  { x: 70, ring: ART.sage, Icon: Dumbbell },
  { x: 150, ring: ART.lavender, Icon: Book },
  { x: 230, ring: ART.rose, Icon: Calm },
];
function Self({ active }: SceneProps) {
  const t = useLoop(5600, 0.8, active);
  const a = (i: number) => 0.06 + i * 0.14;
  const badge = (i: number) => ({
    opacity: kf(t, [0, a(i), a(i) + 0.05, 0.9, 0.97, 1], [0, 0, 1, 1, 0, 0]),
    transform: [{ translateY: kf(t, [0, a(i), a(i) + 0.06, 1], [12, 12, 0, 0]) }, { scale: kf(t, [0, a(i), a(i) + 0.05, a(i) + 0.09, 1], [0.6, 0.6, 1.08, 1, 1]) }],
  });
  const bob = (i: number) => ({ transform: [{ translateY: phase(t, i * 0.33, [0, 0.5, 1], [0, -4, 0]) }] });
  const ring = (i: number) => ({ opacity: kf(t, [0, a(i) + 0.05, a(i) + 0.08, a(i) + 0.2, 1], [0, 0, 0.9, 0, 0]), transform: [{ scale: kf(t, [0, a(i) + 0.05, a(i) + 0.2, 1], [1, 1, 1.45, 1.45]) }] });
  const day = (k: number) => {
    const s = 0.46 + k * 0.05;
    return { opacity: kf(t, [0, s, s + 0.03, 0.9, 0.97, 1], [0, 0, 1, 1, 0, 0]), transform: [{ scale: kf(t, [0, s, s + 0.03, s + 0.06, 1], [0.3, 0.3, 1.3, 1, 1]) }] };
  };
  const shine = { opacity: kf(t, [0, 0.8, 0.84, 0.9, 1], [0, 0, 1, 0, 0]), transform: [{ scale: kf(t, [0, 0.8, 0.86, 1], [0.3, 0.3, 1.2, 1.2]) }] };
  return (
    <>
      {BADGES.map((b, i) => (
        <Animated.View key={i} style={[{ position: 'absolute', left: b.x - 34, top: 6, width: 68, height: 76 }, badge(i)]}>
          <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 68, height: 68 }, bob(i)]}>
            <Piece x={0} y={0} w={68} h={68} style={ring(i)}>
              <Circle cx={34} cy={34} r={30} fill="none" stroke={b.ring} strokeWidth={4} />
            </Piece>
            <Piece x={4} y={4} w={60} h={60}>
              <Circle cx={30} cy={32} r={28} fill={ART.shadow} />
              <Circle cx={30} cy={30} r={28} fill={ART.cream} />
              <Circle cx={30} cy={30} r={23} fill={b.ring} opacity={0.45} />
              <G transform="translate(12 11)">
                <b.Icon />
              </G>
            </Piece>
          </Animated.View>
        </Animated.View>
      ))}
      <Piece x={74} y={100} w={152} h={20}>
        <Rect x={0} y={0} width={152} height={20} rx={10} fill={ART.cream} />
        {Array.from({ length: 7 }, (_, k) => (
          <Circle key={k} cx={16 + k * 20} cy={10} r={5} fill={ART.line} />
        ))}
      </Piece>
      {Array.from({ length: 7 }, (_, k) => (
        <Piece key={k} x={74 + 16 + k * 20 - 6} y={104} w={12} h={12} style={day(k)}>
          <Circle cx={6} cy={6} r={6} fill={k === 6 ? ART.peachDeep : ART.sun} />
        </Piece>
      ))}
      <Sparkle x={236} y={104} s={18} color={ART.sun} style={shine} />
    </>
  );
}

const SCENES: Record<DecoKind, (p: SceneProps) => JSX.Element> = {
  hello: Hello,
  draw: Draw,
  tasks: Tasks,
  house: House,
  garden: Garden,
  self: Self,
};
