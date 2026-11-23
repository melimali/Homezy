import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Image, Pressable, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

import Svg, { ClipPath, Defs, G, Image as Artwork, Path } from 'react-native-svg';

import { useReduceMotion } from '@/components/motion';
import { ISIK, MOTION, ODA, ODA_H, ODA_W, PARCA, type Box, type OdaLayers, type OdaPart, type OdaPhase, type OdaTouch, type Pt } from '@/constants/oda';
import { useActive } from '@/hooks/useActive';
import type { SkyKind } from '@/lib/weather';
import { clearNightCondition } from '@/domain/roomScene';

/** Saate göre oda: 06:30-16:29 sabah, 16:30-19:29 akşam, 19:30-06:29 gece. */
export function odaPhaseOf(d = new Date()): OdaPhase {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 19.5 || h < 6.5) return 'gece';
  return h >= 16.5 ? 'aksam' : 'sabah';
}
/** Moka'nın oturduğu nokta (o saatin resminde yastığın ortası). */
export const seatOf = (p: OdaPhase): Pt => ODA[p].seat;

/** Oda resminin `cover` yerleşimi: ekran boyutundan ölçek ve kaydırma. Resim koordinatını ekrana çevirmek için. */
export const odaMap = (w: number, h: number) => {
  const s = Math.max(w / ODA_W, h / ODA_H);
  return { s, ox: (w - ODA_W * s) / 2, oy: (h - ODA_H * s) / 2 };
};

export type RoomTouch = OdaTouch;
const PARTS = Object.keys(MOTION) as OdaPart[];
const sine = Easing.inOut(Easing.sin);
type Stop = { stop: () => void };

/** Değeri 0→1→0 yavaşça gidip getiren döngü. */
function loop(v: Animated.Value, ms: number, delay = 0): Stop {
  const a = Animated.loop(Animated.sequence([
    Animated.delay(delay),
    Animated.timing(v, { toValue: 1, duration: ms, easing: sine, useNativeDriver: true, isInteraction: false }),
    Animated.timing(v, { toValue: 0, duration: ms, easing: sine, useNativeDriver: true, isInteraction: false }),
  ]));
  a.start();
  return a;
}
/** Gidiş ve dönüş süresi her turda biraz değişen salınım: bitki gibi doğal, mekanik durmaz. */
function sway(v: Animated.Value, ms: number, delay = 0, jitter = 0.3): Stop {
  let dead = false;
  let movement: Animated.CompositeAnimation | undefined;
  const go = () => {
    if (dead) return;
    const a = ms * (1 - jitter / 2 + Math.random() * jitter);
    const b = ms * (1.1 - jitter / 2 + Math.random() * jitter);
    const peak = 0.75 + Math.random() * 0.25;
    movement = Animated.sequence([
      Animated.timing(v, { toValue: 0.5 + peak / 2, duration: a, easing: sine, useNativeDriver: true, isInteraction: false }),
      Animated.timing(v, { toValue: 0.5 - peak / 2, duration: b, easing: sine, useNativeDriver: true, isInteraction: false }),
    ]);
    movement.start(({ finished }) => { if (finished) go(); });
  };
  const t = setTimeout(go, delay);
  return { stop: () => { dead = true; clearTimeout(t); movement?.stop(); } };
}
/** Kitaplar: 7-14 sn'de bir hafifçe yana yatıp yaylanarak yerine oturur. */
function rock(v: Animated.Value, delay: number): Stop {
  let dead = false;
  let t: ReturnType<typeof setTimeout>;
  const go = () => {
    if (dead) return;
    Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }),
      Animated.spring(v, { toValue: 0.5, friction: 3, tension: 70, useNativeDriver: true, isInteraction: false }),
    ]).start(({ finished }) => { if (!dead && finished) t = setTimeout(go, 7000 + Math.random() * 7000); });
  };
  t = setTimeout(go, delay);
  return { stop: () => { dead = true; clearTimeout(t); v.stopAnimation(); } };
}
/** Değeri 0'dan 1'e akıtıp başa saran döngü (düşen ya da yükselen parçacık). */
function rise(v: Animated.Value, ms: number, delay = 0, easing: (t: number) => number = Easing.linear): Stop {
  const a = Animated.loop(Animated.sequence([Animated.delay(delay), Animated.timing(v, { toValue: 1, duration: ms, easing, useNativeDriver: true, isInteraction: false }), Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true, isInteraction: false })]));
  a.start();
  return a;
}
/** Uzun aralıklı tek seferlik olay (yaprak düşmesi, şimşek): bekle, oynat, yeniden bekle. */
function every(v: Animated.Value, minMs: number, maxMs: number, play: (v: Animated.Value) => Animated.CompositeAnimation, first = 3000): Stop {
  let dead = false;
  let t: ReturnType<typeof setTimeout>;
  let movement: Animated.CompositeAnimation | undefined;
  const schedule = () => { if (!dead) t = setTimeout(start, minMs + Math.random() * (maxMs - minMs)); };
  const start = () => {
    if (dead) return;
    v.stopAnimation();
    v.setValue(0);
    movement = play(v);
    movement.start(({ finished }) => { if (finished) schedule(); });
  };
  t = setTimeout(start, first);
  return {
    stop: () => { dead = true; clearTimeout(t); movement?.stop(); v.stopAnimation(); },
  };
}
/** Lamba: yavaşça "nefes alır" (6 sn); arada minicik tek titreşim. */
function breathe(v: Animated.Value): Stop {
  const flick = Animated.sequence([
    Animated.timing(v, { toValue: 0.78, duration: 90, easing: Easing.linear, useNativeDriver: true, isInteraction: false }),
    Animated.timing(v, { toValue: 0.97, duration: 140, easing: Easing.linear, useNativeDriver: true, isInteraction: false }),
  ]);
  const cycle = (n: number) => Array.from({ length: n }, () => [
    Animated.timing(v, { toValue: 1, duration: 3000, easing: sine, useNativeDriver: true, isInteraction: false }),
    Animated.timing(v, { toValue: 0.88, duration: 3000, easing: sine, useNativeDriver: true, isInteraction: false }),
  ]).flat();
  const a = Animated.loop(Animated.sequence([...cycle(7), flick, ...cycle(5 + Math.floor(Math.random() * 4)), flick]));
  a.start();
  return a;
}

type Vals = {
  part: Record<OdaPart, Animated.Value>; nudge: Record<OdaPart, Animated.Value>;
  lamp: Animated.Value; moon: Animated.Value; sun: Animated.Value; beam: Animated.Value; cloud: Animated.Value; halo: Animated.Value;
  twinkle: Animated.Value[]; cup: Animated.Value[]; chainLights: Animated.Value[]; chainSweep: Animated.Value; fest: Animated.Value; stars: Animated.Value[]; dust: Animated.Value[]; steam: Animated.Value[];
  rain: Animated.Value[]; drops: Animated.Value[]; drift: Animated.Value; flash: Animated.Value; weather: Animated.Value; leaf: Animated.Value; tapLeaf: Animated.Value; boost: Animated.Value; pot: Animated.Value; ivy: Animated.Value;
};
/** Loşluk için köşelere konan koyu haleler (oda resmi koordinatı). */
const VIGNETTE = [{ x: 0, y: 0, r: 700 }, { x: 852, y: 0, r: 700 }, { x: 0, y: 1846, r: 760 }, { x: 852, y: 1846, r: 760 }, { x: 0, y: 920, r: 420 }, { x: 852, y: 920, r: 420 }];
const MOTES = {
  day: [
    { x: 250, y: 790, r: 2 }, { x: 315, y: 860, r: 3 }, { x: 380, y: 920, r: 2 },
    { x: 435, y: 980, r: 2 }, { x: 500, y: 1040, r: 3 }, { x: 565, y: 1100, r: 2 },
  ],
  night: [
    { x: 650, y: 710, r: 2 }, { x: 700, y: 760, r: 3 }, { x: 755, y: 800, r: 2 },
    { x: 815, y: 850, r: 2 }, { x: 690, y: 900, r: 3 }, { x: 770, y: 980, r: 2 },
  ],
} as const;
/** Havaya göre camın rengi ve yoğunluğu. */
const GLASS: Partial<Record<SkyKind, { tone: string; op: number }>> = {
  cloudy: { tone: '#8C97A8', op: 0.36 }, rain: { tone: '#55657A', op: 0.48 }, storm: { tone: '#1E2533', op: 0.6 },
  snow: { tone: '#E6EDF5', op: 0.38 }, fog: { tone: '#EEF1F4', op: 0.58 },
};
const RAIN_N = 12;

/** Zincirin 7 ampulü: iki uç arasında hafifçe sarkar. */
const chainPts = (L: OdaLayers) => Array.from({ length: 7 }, (_, i) => {
  const t = i / 6;
  const [a, b] = L.chain;
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) + Math.sin(t * Math.PI) * 26 };
});
function Chain({ pts, lights, sweep, s, night }: { pts: Pt[]; lights: Animated.Value[]; sweep: Animated.Value; s: number; night: boolean }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
      {pts.slice(1).map((p, i) => {
        const q = pts[i]!;
        const len = Math.hypot(p.x - q.x, p.y - q.y);
        return <View key={'wire-' + i} style={{ position: 'absolute', left: ((p.x + q.x) / 2 - len / 2) * s, top: ((p.y + q.y) / 2) * s, width: len * s, height: Math.max(1, 1.6 * s), backgroundColor: '#3B2A20', opacity: 0.55, transform: [{ rotate: Math.atan2(p.y - q.y, p.x - q.x) + 'rad' }] }} />;
      })}
      {pts.map((p, i) => {
        const center = 0.14 + i * 0.115;
        const glimmer = sweep.interpolate({
          inputRange: [center - 0.14, center, center + 0.14],
          outputRange: [0, night ? 0.65 : 0.42, 0], extrapolate: 'clamp',
        });
        const light = Animated.add(Animated.multiply(lights[i]!, 0.82), glimmer).interpolate({
          inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp',
        });
        const glowOpacity = light.interpolate({ inputRange: [0, 1], outputRange: [0, night ? 0.85 : 0.55] });
        const r = 26;
        return (
          <View key={'bulb-' + i}>
            <Animated.Image source={ISIK} pointerEvents="none" style={{ position: 'absolute', left: (p.x - r) * s, top: (p.y + 4 - r) * s, width: 2 * r * s, height: 2 * r * s, tintColor: '#FFC27A', opacity: glowOpacity }} />
            <View style={{ position: 'absolute', left: (p.x - 5) * s, top: (p.y - 1) * s, width: 10 * s, height: 13 * s, borderRadius: 5 * s, backgroundColor: '#75604D', borderWidth: Math.max(1, 1.2 * s), borderColor: '#3B2A20', overflow: 'hidden' }}>
              <Animated.View style={{ position: 'absolute', left: Math.max(1, s), right: Math.max(1, s), top: Math.max(1, s), bottom: Math.max(1, s), borderRadius: 4 * s, backgroundColor: '#FFE3A3', opacity: light }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

// The old cutouts isolate the ropes and leaves. The pot was missed by that mask,
// so its visible silhouette comes from the aligned PNG through a separate clip.
const PLANTER = {
  sabah: {
    cutout: require('../../assets/oda/sabah_asma.webp'), box: [22, 42, 319, 592], joint: [236, 316],
    split: 'M89 323H228L236 313H374V665H0V356Z',
    crown: 'M0 0H374V316H237L228 328H89L0 357Z',
    pot: 'M61 274Q102 255 140 268Q187 262 224 288Q236 291 230 309Q221 341 208 345Q185 354 150 351L105 347Q87 341 79 325Q67 301 61 274Z',
  },
  aksam: {
    cutout: require('../../assets/oda/aksam_asma.webp'), box: [23, 26, 330, 648], joint: [246, 344],
    split: 'M48 357H104L124 372H221L244 343H382V712H0V390Z',
    crown: 'M0 0H382V349H245L223 378H122L104 363H48L0 396Z',
    pot: 'M78 300Q116 280 151 291Q201 291 219 308L229 337Q232 364 211 376Q172 388 124 374Q98 363 92 343Z',
  },
  gece: {
    cutout: require('../../assets/oda/gece_asma.webp'), box: [24, 27, 329, 648], joint: [246, 344],
    split: 'M48 357H104L124 372H221L244 343H382V712H0V390Z',
    crown: 'M0 0H382V349H245L223 378H122L104 363H48L0 396Z',
    pot: 'M78 300Q116 280 151 291Q201 291 219 308L229 337Q232 364 211 376Q172 388 124 374Q98 363 92 343Z',
  },
} as const;

function HangingPlanter({ phase, s, ivy }: { phase: OdaPhase; s: number; ivy: Animated.Value }) {
  const id = 'ivy-' + useId().replace(/[^a-z0-9]/gi, '');
  const { box: scene, pivot, src } = ODA[phase].parts.asma;
  const art = PLANTER[phase];
  const [x, y, width, height] = art.box;
  const [jx, jy] = art.joint;
  const image = <Artwork href={art.cutout} x={x} y={y} width={width} height={height} />;
  const viewBox = `0 0 ${scene.w} ${scene.h}`;
  const dx = (jx - scene.w / 2) * s;
  const dy = (jy - scene.h / 2) * s;
  const frame = { position: 'absolute' as const, left: (scene.x - pivot.x) * s, top: (scene.y - pivot.y) * s, width: scene.w * s, height: scene.h * s };
  return <>
    <Animated.View pointerEvents="none" style={[frame, { transform: [
      { translateX: dx }, { translateY: dy },
      { rotate: ivy.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-4deg', '0deg', '4deg'] }) },
      { translateX: -dx }, { translateY: -dy },
    ] }]}>
      <Svg width={frame.width} height={frame.height} viewBox={viewBox}>
        <Defs><ClipPath id={id + '-vine'}><Path d={art.split} /></ClipPath></Defs>
        <G clipPath={`url(#${id}-vine)`}>{image}</G>
      </Svg>
    </Animated.View>
    <Svg pointerEvents="none" style={frame} width={frame.width} height={frame.height} viewBox={viewBox}>
      <Defs>
        <ClipPath id={id + '-crown'}><Path d={art.crown} /></ClipPath>
        <ClipPath id={id + '-pot'}><Path d={art.pot} /></ClipPath>
      </Defs>
      <G clipPath={`url(#${id}-pot)`}><Artwork href={src} width={scene.w} height={scene.h} /></G>
      <G clipPath={`url(#${id}-crown)`}>{image}</G>
    </Svg>
  </>;
}

/** Bir saatin (sabah/akşam/gece) resmi: taban, cam havası, hareketli parçalar, düşen yaprak. */
function PhaseLayer({ phase, s, vals, sky, chain, tilt, opacity, weatherOpacity, onReady }: { phase: OdaPhase; s: number; vals: Vals; sky: SkyKind; chain: number; tilt?: Animated.ValueXY; opacity: Animated.Value | number; weatherOpacity: Animated.Value; onReady?: () => void }) {
  const L = ODA[phase];
  const box = (b: Box) => ({ position: 'absolute' as const, left: b.x * s, top: b.y * s, width: b.w * s, height: b.h * s });
  const shift = (x: number, y: number) => (tilt ? [{ translateX: tilt.x.interpolate({ inputRange: [-1, 1], outputRange: [x, -x] }) }, { translateY: tilt.y.interpolate({ inputRange: [-1, 1], outputRange: [y, -y] }) }] : []);
  const glass = GLASS[sky];
  const wet = sky === 'rain' || sky === 'storm';
  const snow = sky === 'snow';
  const clouds = sky === 'cloudy' || wet;
  const big = L.cells.filter(c => c.w >= 60);
  const asma = L.parts.asma;
  // Yaprak asma saksının alt ucundan kopar.
  const leafFrom = { x: asma.box.x + asma.box.w * 0.62, y: asma.box.y + asma.box.h * 0.82 };
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: ODA_W * s, height: ODA_H * s, opacity }}>
      <Image source={L.taban} fadeDuration={0} onLoad={onReady} onError={onReady} style={{ width: ODA_W * s, height: ODA_H * s }} resizeMode="stretch" accessibilityIgnoresInvertColors />

      {/* Cam: havaya göre renk, içinde bulut, yağmur, kar, damlalar, şimşek. */}
      {glass && <Animated.Image source={L.cam.src} style={[box(L.cam.box), { tintColor: glass.tone, opacity: Animated.multiply(weatherOpacity, glass.op) }]} />}
      {sky === 'storm' && <Animated.Image source={L.cam.src} style={[box(L.cam.box), { tintColor: '#F4F7FF', opacity: Animated.multiply(weatherOpacity, vals.flash.interpolate({ inputRange: [0, 0.08, 0.16, 0.24, 1], outputRange: [0, 0.85, 0.1, 0.6, 0] })) }]} />}
      {(clouds || wet || snow) && L.cells.map((c, ci) => (
        <View key={ci} style={[box(c), { overflow: 'hidden' }]}>
          {clouds && c.w >= 60 && (
            <Animated.Image
              source={PARCA.bulut}
              style={{
                position: 'absolute', top: (c.h * 0.12 + (ci % 2) * 24) * s, width: 150 * s, height: 112 * s, opacity: Animated.multiply(weatherOpacity, wet ? 0.45 : 0.6), tintColor: wet ? '#C9D1DC' : undefined,
                transform: [{ translateX: vals.drift.interpolate({ inputRange: [0, 1], outputRange: [-150 * s - ci * 20 * s, (c.w + 40) * s] }) }],
              }}
            />
          )}
          {(wet || snow) && vals.rain.map((r, i) => {
            if (i % L.cells.length !== ci || (snow && c.w < 60)) return null;
            const x = (2 + ((i * 37 + ci * 23) % 96)) / 100;
            const move = { translateY: r.interpolate({ inputRange: [0, 1], outputRange: [-(snow ? 14 : 30) * s, (c.h + 6) * s] }) };
            return snow ? (
              <Animated.Image
                key={i}
                source={PARCA.kar}
                style={{
                  position: 'absolute', left: x * c.w * s, top: 0, width: (9 + (i % 3) * 3) * s, height: (8 + (i % 3) * 3) * s, opacity: Animated.multiply(weatherOpacity, 0.95),
                  transform: [move, { translateX: r.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, (i % 2 ? 9 : -9) * s, 0] }) }, { rotate: r.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${i % 2 ? 120 : -120}deg`] }) }],
                }}
              />
            ) : (
              <Animated.View key={i} style={{ position: 'absolute', left: x * c.w * s, top: 0, width: Math.max(1, 2 * s), height: (22 + (i % 4) * 6) * s, borderRadius: 2, backgroundColor: '#DCEBFA', opacity: Animated.multiply(weatherOpacity, ci < 2 ? 0.85 : 0.68), transform: [move, { rotate: '10deg' }] }} />
            );
          })}
        </View>
      ))}
      {wet && big.map((c, ci) => vals.drops.map((d, i) => i !== ci ? null : (
        <Animated.Image
          key={`d${ci}-${i}`}
          source={PARCA.damla}
          style={{
            position: 'absolute', left: (c.x + c.w * (0.18 + ((i * 41 + ci * 17) % 64) / 100)) * s, top: (c.y + c.h * (0.08 + ((i * 29 + ci * 11) % 40) / 100)) * s,
            width: 11 * s, height: 14 * s, opacity: Animated.multiply(d.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 0.85, 0.85, 0] }), weatherOpacity),
            transform: [{ translateY: d.interpolate({ inputRange: [0, 0.3, 0.45, 1], outputRange: [0, 4 * s, 10 * s, c.h * 0.5 * s] }) }],
          }}
        />
      )))}

      {/* Pencerenin önündekiler (çerçeve, yapraklar) havanın üstünde kalır. */}
      {(glass || clouds || snow) && <Animated.Image source={L.onCam.src} style={[box(L.onCam.box), { opacity: weatherOpacity }]} />}

      {/* Işık zinciri bitkilerin arkasında: seride her gün bir ampul yanar (7'de hepsi). */}
      {chain >= 0 && <Chain pts={chainPts(L)} lights={vals.chainLights} sweep={vals.chainSweep} s={s} night={phase === 'gece'} />}

      {/* Hareketli parçalar: bitkiler salınır, kupalar sarkaç gibi, kitaplar arada bir sallanır. */}
      {PARTS.map(k => {
        const P = L.parts[k];
        const m = MOTION[k];
        const rot = Animated.add(vals.part[k], vals.nudge[k]).interpolate({ inputRange: [-1, 0, 0.5, 1, 2], outputRange: [`${-m.deg * 5}deg`, `${-m.deg}deg`, '0deg', `${m.deg}deg`, `${m.deg * 5}deg`] });
        return (
          <Animated.View key={k} style={{ position: 'absolute', left: P.pivot.x * s, top: P.pivot.y * s, width: 0, height: 0, transform: [...shift(m.tilt, m.tilt * 0.6), { rotate: rot }] }}>
            {k === 'asma' ? <HangingPlanter phase={phase} s={s} ivy={vals.ivy} /> : (
              <Image source={P.src} resizeMode="stretch" fadeDuration={0} style={{ position: 'absolute', left: (P.box.x - P.pivot.x) * s, top: (P.box.y - P.pivot.y) * s, width: P.box.w * s, height: P.box.h * s }} accessibilityIgnoresInvertColors />
            )}
          </Animated.View>
        );
      })}

      {/* Pervazdaki gövde ve saksı sabit. Yapraklar saksının ağzından esner. */}
      <Animated.View style={{ position: 'absolute', left: 158 * s, top: 951 * s, width: 0, height: 0, transform: [{
        rotate: Animated.add(vals.part.pencerebitki, vals.nudge.pencerebitki).interpolate({
          inputRange: [-1, 0.5, 2], outputRange: ['-1.9deg', '0deg', '1.9deg'], extrapolate: 'clamp',
        }),
      }] }}>
        <Image source={L.sillLeaves} resizeMode="stretch" fadeDuration={0} style={{ position: 'absolute', left: -124 * s, top: -126 * s, width: 237 * s, height: 143 * s }} />
      </Animated.View>

      {/* Asma saksıdan arada bir, dokununca da bir yaprak süzülüp düşer. */}
      {[vals.leaf, vals.tapLeaf].map((leaf, i) => (
        <Animated.Image
          key={`falling-leaf-${i}`}
          source={L.yaprak.src}
          pointerEvents="none"
          style={{
            position: 'absolute', left: leafFrom.x * s, top: leafFrom.y * s, width: L.yaprak.w * 0.7 * s, height: L.yaprak.h * 0.7 * s,
            opacity: leaf.interpolate({ inputRange: [0, 0.04, 0.85, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateY: leaf.interpolate({ inputRange: [0, 1], outputRange: [0, 520 * s] }) },
              { translateX: leaf.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: [0, 34 * s, -6 * s, 40 * s, 4 * s, 46 * s] }) },
              { rotate: leaf.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: ['0deg', '40deg', '-25deg', '45deg', '-15deg', '30deg'] }) },
            ],
          }}
        />
      ))}
    </Animated.View>
  );
}

/**
 * Moka'nın canlı odası (v6 resimleri).
 * - Saate göre sabah, akşam ya da gece resmi; saat değişince yumuşakça geçer.
 * - Bitkiler salınır, asılı kupalar sallanır, kitaplar arada bir oynar, yaprak düşer, lamba nefes alır, toz uçuşur,
 *   kahve sürahisinden ve kupadan buhar çıkar (seri), gece yıldızlar göz kırpar.
 * - Hava camda: bulut geçer, yağmur ve kar yağar, camda damlalar kayar, fırtınada şimşek çakar, sis camı buğular.
 * - `warm` bugünkü işlerle ışığı ısıtır, `dust` uzun uğramamada loşluk ekler. Dokunulabilir nesneler `onTouch` ile haber verir.
 * - `tilt` verilirse katmanlar farklı miktarda kayar (hafif 3B).
 * Ekran odakta değilse, uygulama arka plandaysa ya da "hareketi azalt" açıksa döngüler durur.
 */
export function RoomBackdrop({ cheer = 0, phase: phaseProp, mix, sky = 'clear', warm = 0, dust = 0, lampOff = false, steam = 1, potGlow = false, brew = 0, chain = -1, tilt, onTouch, onReady, style, children }: {
  /** Her artışta kutlama: lamba parlar, sürahi parıldar. */ cheer?: number;
  /** Saat resmi; verilmezse saate göre seçilir. */ phase?: OdaPhase;
  /** Eski API: 0 gündüz, 1 gece (phase yoksa kullanılır). */ mix?: number;
  sky?: SkyKind; warm?: number; dust?: number;
  /** Lamba söndürüldü: hale yok, oda biraz loş. */ lampOff?: boolean;
  /** Sürahiden çıkan buhar çizgisi (0-3): seri durumuna göre. */ steam?: number;
  /** Sürahinin etrafında sıcak hale (kahve taze). */ potGlow?: boolean;
  /** Artınca sürahi bir kez "fokurdar". */ brew?: number;
  /** Işık zincirinde yanan ampul (0-7); -1 zincir yok. */ chain?: number;
  /** Katman kayması için eğim (useTilt). */ tilt?: Animated.ValueXY;
  onTouch?: (t: RoomTouch) => void; onReady?: () => void; style?: StyleProp<ViewStyle>; children?: ReactNode;
}) {
  const phase: OdaPhase = phaseProp ?? (mix === undefined ? odaPhaseOf() : mix > 0.5 ? 'gece' : 'sabah');
  const L = ODA[phase];
  const night = phase === 'gece' ? 1 : 0;
  const dusk = phase === 'aksam' ? 1 : 0;
  const reduceM = useReduceMotion();
  const active = useActive();
  const run = !reduceM && active;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const vals = useMemo<Vals>(() => ({
    part: Object.fromEntries(PARTS.map(k => [k, new Animated.Value(0.5)])) as Record<OdaPart, Animated.Value>,
    nudge: Object.fromEntries(PARTS.map(k => [k, new Animated.Value(0)])) as Record<OdaPart, Animated.Value>,
    lamp: new Animated.Value(0.9), moon: new Animated.Value(0.3), sun: new Animated.Value(0), boost: new Animated.Value(0), pot: new Animated.Value(0), ivy: new Animated.Value(0),
    beam: new Animated.Value(0), cloud: new Animated.Value(0), halo: new Animated.Value(0), fest: new Animated.Value(0),
    twinkle: [0, 1, 2, 3].map(() => new Animated.Value(0)), cup: [0, 1].map(() => new Animated.Value(0)), chainSweep: new Animated.Value(0), chainLights: Array.from({ length: 7 }, () => new Animated.Value(0)),
    stars: Array.from({ length: 8 }, () => new Animated.Value(0.3)), dust: MOTES.day.map(() => new Animated.Value(0)), steam: [0, 1, 2].map(() => new Animated.Value(0)),
    rain: Array.from({ length: RAIN_N }, () => new Animated.Value(0)), drops: [0, 1, 2].map(() => new Animated.Value(0)),
    drift: new Animated.Value(0), flash: new Animated.Value(0), weather: new Animated.Value(1), leaf: new Animated.Value(0), tapLeaf: new Animated.Value(0),
  }), []);
  const wet = sky === 'rain' || sky === 'storm' || sky === 'snow';
  const rainy = sky === 'rain' || sky === 'storm';
  const clearNight = clearNightCondition(night, sky);
  const motes = night ? MOTES.night : MOTES.day;

  // Saat değişince yeni resim eskinin üstünde 1,6 sn'de belirir (hareketi azaltta hemen geçer).
  const [layers, setLayers] = useState<{ p: OdaPhase; a: Animated.Value }[]>(() => [{ p: phase, a: new Animated.Value(1) }]);
  const top = layers[layers.length - 1]!;
  if (top.p !== phase) setLayers(ls => (run ? [...ls.slice(-1), { p: phase, a: new Animated.Value(0) }] : [{ p: phase, a: new Animated.Value(1) }]));
  useEffect(() => {
    if (layers.length < 2) return;
    const a = layers[layers.length - 1]!.a;
    const t = Animated.timing(a, { toValue: 1, duration: 1600, easing: sine, useNativeDriver: true });
    t.start(({ finished }) => { if (finished) setLayers(ls => ls.filter(l => l.a === a)); });
    return () => { t.stop(); a.setValue(1); };
  }, [layers]);

  useEffect(() => {
    vals.weather.stopAnimation();
    if (!run || sky === 'clear') {
      vals.weather.setValue(1);
      return;
    }
    vals.weather.setValue(0);
    const transition = Animated.timing(vals.weather, { toValue: 1, duration: 1100, easing: sine, useNativeDriver: true, isInteraction: false });
    transition.start();
    return () => transition.stop();
  }, [run, sky, vals]);

  useEffect(() => {
    if (!run) return;
    const leafFall = every(vals.leaf, 22000, 40000, v => Animated.timing(v, { toValue: 1, duration: 7000, easing: Easing.inOut(Easing.quad), useNativeDriver: true, isInteraction: false }), 6000);
    const anims: Stop[] = [
      ...PARTS.map(k => {
        const m = MOTION[k];
        const v = vals.part[k];
        return m.kind === 'rock' ? rock(v, m.delay) : m.kind === 'swing' ? sway(v, m.ms, m.delay, 0.12) : sway(v, m.ms, m.delay, 0.35);
      }),
      breathe(vals.lamp),
      ...(night ? [loop(vals.moon, 4200)] : []),
      ...(!night ? [loop(vals.sun, 7000)] : []),
      loop(vals.beam, 13000),
      loop(vals.halo, 4800, 600),
      // Bulut gölgesi: ışık huzmesi 30 sn'de bir kararıp geri gelir.
      (() => { const a = Animated.loop(Animated.sequence([Animated.delay(14000), Animated.timing(vals.cloud, { toValue: 1, duration: 4200, easing: sine, useNativeDriver: true, isInteraction: false }), Animated.delay(1800), Animated.timing(vals.cloud, { toValue: 0, duration: 5200, easing: sine, useNativeDriver: true, isInteraction: false }), Animated.delay(5000)])); a.start(); return a; })(),
      ...vals.twinkle.map((x, i) => { const a = Animated.loop(Animated.sequence([Animated.delay(i * 1300 + 600), Animated.timing(x, { toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }), Animated.timing(x, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true, isInteraction: false }), Animated.delay(3600 + i * 700)])); a.start(); return a; }),
      ...vals.cup.map((x, i) => rise(x, 3000 + i * 600, i * 1400, Easing.out(Easing.quad))),
      ...(night ? vals.stars.map((x, i) => sway(x, 900 + ((i * 677) % 1900), i * 430, 0.7)) : []),
      ...vals.dust.map((x, i) => rise(x, 5200 + ((i * 937) % 3600), (i * 1130) % 6000, Easing.inOut(Easing.sin))),
      leafFall,
    ];
    return () => {
      anims.forEach(a => a.stop());
    };
  }, [run, vals, phase, night]);

  useEffect(() => {
    if (!run) return;
    if (wet) vals.rain.forEach(v => v.setValue(0));
    if (rainy) vals.drops.forEach(v => v.setValue(0));
    if (sky === 'cloudy' || rainy) vals.drift.setValue(0);
    if (sky === 'storm') vals.flash.setValue(0);
    const anims: Stop[] = [
      ...(wet ? vals.rain.map((x, i) => rise(x, sky === 'snow' ? 4200 + (i % 4) * 700 : 700 + (i % 3) * 160, i * (sky === 'snow' ? 330 : 30))) : []),
      ...(rainy ? vals.drops.map((x, i) => rise(x, 5200 + i * 1300, i * 2100, Easing.in(Easing.quad))) : []),
      ...(sky === 'cloudy' || rainy ? [rise(vals.drift, 38000)] : []),
      ...(sky === 'storm' ? [every(vals.flash, 9000, 16000, v => Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true, isInteraction: false }), 4000)] : []),
    ];
    return () => anims.forEach(a => a.stop());
  }, [run, vals, sky, wet, rainy]);

  useEffect(() => {
    if (!run || !steam) return;
    const anims = vals.steam.slice(0, steam).map((x, i) => rise(x, 3200 + i * 420, i * 1050 + i * i * 160, Easing.out(Easing.quad)));
    return () => anims.forEach(a => a.stop());
  }, [run, vals, steam]);

  // Seri ampulleri: mevcut yananlar korunur, yeni ampuller yavaşça sırayla açılır.
  const chainLit = useRef(0);
  useEffect(() => {
    const count = Math.max(0, Math.min(vals.chainLights.length, Math.floor(chain)));
    if (!run) {
      vals.chainLights.forEach((light, index) => light.setValue(index < count ? 1 : 0));
      chainLit.current = count;
      return;
    }
    const alreadyLit = Math.min(chainLit.current, count);
    vals.chainLights.forEach((light, index) => light.setValue(index < alreadyLit ? 1 : 0));
    const pending = vals.chainLights.slice(alreadyLit, count);
    chainLit.current = count;
    if (!pending.length) return;
    const animation = Animated.stagger(850, pending.map(light => Animated.timing(light, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true })));
    animation.start();
    return () => animation.stop();
  }, [chain, run, vals]);
  const showChain = chain >= 0;
  useEffect(() => {
    vals.chainSweep.setValue(0);
    if (!run || !showChain) return;
    const wave = rise(vals.chainSweep, 10500, 1250);
    return () => wave.stop();
  }, [run, showChain, vals]);
  // Fokurdama: sürahi parlar, buhar bir an büyür.
  useEffect(() => {
    if (!brew || !run) return;
    vals.pot.setValue(0);
    const a = Animated.sequence([
      Animated.timing(vals.pot, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(vals.pot, { toValue: 0, duration: 1400, easing: sine, useNativeDriver: true }),
    ]);
    a.start();
    return () => a.stop();
  }, [brew, run, vals]);

  // Kutlama: lamba parlar, sürahi parıldar, kupalar ve bitkiler bir sevinçle sallanır.
  const lastCheer = useRef(cheer);
  useEffect(() => {
    if (cheer === lastCheer.current) return;
    lastCheer.current = cheer;
    if (!cheer || !run) return;
    vals.fest.setValue(0);
    const celebration = Animated.parallel([
      Animated.sequence([Animated.timing(vals.boost, { toValue: 1, duration: 200, useNativeDriver: true }), Animated.delay(1400), Animated.timing(vals.boost, { toValue: 0, duration: 1100, useNativeDriver: true })]),
      Animated.sequence([Animated.timing(vals.pot, { toValue: 0.8, duration: 260, useNativeDriver: true }), Animated.delay(900), Animated.timing(vals.pot, { toValue: 0, duration: 1400, useNativeDriver: true })]),
      Animated.timing(vals.fest, { toValue: 1, duration: 2600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ...(['kupa1', 'kupa2', 'kitapust'] as OdaPart[]).map((k, i) => Animated.sequence([Animated.delay(i * 120), Animated.timing(vals.nudge[k], { toValue: 1.2, duration: 150, useNativeDriver: true }), Animated.spring(vals.nudge[k], { toValue: 0, friction: 2.4, tension: 80, useNativeDriver: true })])),
    ]);
    celebration.start();
    return () => celebration.stop();
  }, [cheer, run, vals]);

  /** Dokununca kısa tepki: lamba parlar, sürahi parlar, kupalar ya da bitki sallanır. */
  const kick = (k: OdaPart, amt = 1.4) => Animated.sequence([Animated.timing(vals.nudge[k], { toValue: amt, duration: 140, useNativeDriver: true }), Animated.spring(vals.nudge[k], { toValue: 0, friction: 2.2, tension: 90, useNativeDriver: true })]);
  const [reaction] = useState(() => new Map<RoomTouch | OdaPart, Animated.CompositeAnimation>());
  useEffect(() => {

    return () => {
      reaction.forEach(a => a.stop());
      reaction.clear();
      PARTS.forEach(k => { vals.nudge[k].setValue(0); vals.part[k].setValue(0.5); });
      vals.ivy.setValue(0);
      vals.boost.setValue(0);
      vals.pot.setValue(0);
      vals.fest.setValue(0);
    };
  }, [run, vals, reaction]);
  const react = (t: RoomTouch, plant: OdaPart = 'sehpabitki') => {
    onTouch?.(t);
    if (!run) return;
    const target = t === 'bitki' ? plant : t;
    const start = (animation: Animated.CompositeAnimation) => {
      reaction.get(target)?.stop();
      reaction.set(target, animation);
      animation.start();
    };
    if (t === 'lamba') start(Animated.sequence([Animated.timing(vals.boost, { toValue: 1, duration: 160, useNativeDriver: true }), Animated.delay(1600), Animated.timing(vals.boost, { toValue: 0, duration: 900, useNativeDriver: true })]));
    if (t === 'surahi') start(Animated.sequence([Animated.timing(vals.pot, { toValue: 0.7, duration: 180, useNativeDriver: true }), Animated.timing(vals.pot, { toValue: 0, duration: 1100, useNativeDriver: true })]));
    if (t === 'kupa') start(Animated.stagger(110, [kick('kupa1', 1.8), kick('kupa2', -1.6)]));
    if (t === 'bitki' && plant === 'asma') {
      vals.tapLeaf.stopAnimation();
      vals.tapLeaf.setValue(0);
      start(Animated.parallel([
        kick('asma', 1.35),
        Animated.sequence([
          Animated.delay(65),
          Animated.timing(vals.ivy, { toValue: 0.82, duration: 210, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.spring(vals.ivy, { toValue: 0, friction: 3.1, tension: 43, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(80),
          Animated.timing(vals.tapLeaf, { toValue: 1, duration: 7000, easing: Easing.inOut(Easing.quad), useNativeDriver: true, isInteraction: false }),
        ]),
      ]));
    } else if (t === 'bitki') start(kick(plant, 0.65));
  };

  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const s = size.w ? Math.max(size.w / ODA_W, size.h / ODA_H) : 0;
  const W = ODA_W * s;
  const H = ODA_H * s;
  const ox = (size.w - W) / 2;
  const oy = (size.h - H) / 2;
  const box = (b: Box) => ({ position: 'absolute' as const, left: b.x * s, top: b.y * s, width: b.w * s, height: b.h * s });
  const glow = (x: number, y: number, r: number, color: string, opacity: Animated.AnimatedInterpolation<number> | Animated.Value | number, key?: string | number) => (
    <Animated.Image key={key} source={ISIK} pointerEvents="none" style={{ position: 'absolute', left: (x - r) * s, top: (y - r) * s, width: 2 * r * s, height: 2 * r * s, tintColor: color, opacity }} />
  );
  const lampOp = Animated.add(vals.lamp.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.4] }), vals.boost.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }));
  const dim = Math.max(Math.min(0.4, dust * 0.4), lampOff ? 0.14 + 0.16 * night : 0);
  const lampOn = !lampOff;
  const LAMP = L.lamp;
  const POT = L.chemex;
  // Gece yıldızları: büyük cam gözlerinin üst kısmına serpiştirilir.
  const starPts = useMemo(() => {
    const cs = ODA.gece.cells.filter(c => c.w >= 60);
    return vals.stars.map((_, i) => {
      const c = cs[i % cs.length]!;
      return { x: c.x + c.w * (0.15 + ((i * 53) % 70) / 100), y: c.y + c.h * (0.1 + ((i * 37) % 45) / 100) };
    });
  }, [vals]);
  return (
    <View onLayout={onLayout} style={[{ overflow: 'hidden' }, style]} pointerEvents="box-none">
      {s > 0 && (
        <View style={{ position: 'absolute', left: ox, top: oy, width: W, height: H }} pointerEvents="box-none">
          {layers.map(l => <PhaseLayer key={l.p} phase={l.p} s={s} vals={vals} sky={sky} chain={chain} tilt={tilt} opacity={l.a} weatherOpacity={vals.weather} onReady={onReady} />)}

          {L.moon && clearNight && glow(L.moon.x, L.moon.y, 70, '#FFF3C4', vals.moon.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] }))}
          {clearNight && starPts.map((p, i) => (
            <Animated.Image key={`st${i}`} source={PARCA.yildiz} pointerEvents="none" style={{ position: 'absolute', left: (p.x - 6) * s, top: (p.y - 6) * s, width: 12 * s, height: 12 * s, tintColor: '#FFFBE0', opacity: vals.stars[i]!.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.95] }), transform: [{ scale: vals.stars[i]!.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }} />
          ))}
          {!night && glow(300, 1000, 230, dusk ? '#FFB870' : '#FFD68A', vals.sun.interpolate({ inputRange: [0, 1], outputRange: [0.02, dusk ? 0.24 : 0.18] }))}

          {/* Pencere ışığı: sabah sıcak, akşam altın, gece soğuk bir huzme yerde yavaşça kayar; bulut geçince söner. */}
          {sky !== 'storm' && [0, 1].map(k => (
            <Animated.Image
              key={`beam${k}`}
              source={ISIK}
              pointerEvents="none"
              style={{
                position: 'absolute', left: (150 + k * 40) * s, top: (640 + k * 150) * s, width: 760 * s, height: 150 * s, tintColor: night ? '#B7CBFF' : dusk ? '#FFC27A' : '#FFE7B0',
                opacity: Animated.multiply(Animated.multiply(Animated.multiply(vals.beam.interpolate({ inputRange: [0, 1], outputRange: k ? [0.08, 0.16] : [0.18, 0.1] }), vals.cloud.interpolate({ inputRange: [0, 1], outputRange: [1, 0.15] })), vals.weather), (night ? 0.5 : 1) * (wet || sky === 'cloudy' ? 0.45 : 1)),
                transform: [{ translateX: vals.beam.interpolate({ inputRange: [0, 1], outputRange: [-18 * s * (k ? -1 : 1), 24 * s * (k ? -1 : 1)] }) }, { rotate: `${16 + k * 7}deg` }],
              }}
            />
          ))}

          {/* Toz zerreleri: lamba ve pencere ışığında */}
          {motes.map((m, i) => (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={{
                position: 'absolute', left: m.x * s, top: m.y * s, width: m.r * 2 * s, height: m.r * 2 * s, borderRadius: m.r * s, backgroundColor: '#FFE9B8',
                opacity: vals.dust[i]!.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, i % 3 === 0 || dust > 0.3 ? 0.75 : 0.45, 0] }),
                transform: [
                  ...(tilt ? [{ translateX: tilt.x.interpolate({ inputRange: [-1, 1], outputRange: [(8 + (i % 3) * 5) * s, -(8 + (i % 3) * 5) * s] }) }] : []),
                  { translateY: vals.dust[i]!.interpolate({ inputRange: [0, 1], outputRange: [0, -(26 + (i % 4) * 8) * s] }) },
                  { translateX: vals.dust[i]!.interpolate({ inputRange: [0, 0.35, 0.7, 1], outputRange: [0, (i % 2 ? 9 : -9) * s, (i % 2 ? -4 : 5) * s, (i % 2 ? 10 : -11) * s] }) },
                  { scale: vals.dust[i]!.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.7, 1.1, 0.8] }) },
                ],
              }}
            />
          ))}

          {/* Kahve sürahisi (seri): taze iken sıcak hale, ağzından kıvrılan buhar. */}
          {potGlow && glow(POT.x, POT.y + 60, 120, '#FFC98A', 0.22 + night * 0.12, 'potGlow')}
          {glow(POT.x, POT.y + 60, 150, '#FFD9A0', vals.pot.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }), 'potBrew')}
          {vals.steam.slice(0, steam).map((st, i) => (
            <Animated.View
              key={`sb${i}`}
              pointerEvents="none"
              style={{
                position: 'absolute', left: (POT.x - 8 + (i - 1) * 12) * s, top: (POT.y - 6) * s, width: 16 * s, height: 24 * s, borderRadius: 12 * s, backgroundColor: '#FFFFFF',
                opacity: Animated.multiply(st.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, steam > 1 ? 0.5 : 0.34, 0] }), vals.pot.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] })),
                transform: [
                  { translateY: st.interpolate({ inputRange: [0, 1], outputRange: [0, -74 * s] }) },
                  { translateX: st.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, 6 * s, -2 * s, -8 * s, -3 * s] }) },
                  { scaleX: Animated.multiply(st.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.7] }), vals.pot.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] })) },
                  { scaleY: st.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.3] }) },
                ],
              }}
            />
          ))}
          {vals.steam.slice(0, steam).map((st, i) => (
            <Animated.Image
              key={`sm${i}`}
              source={PARCA.buhar}
              pointerEvents="none"
              style={{
                position: 'absolute', left: (POT.x - 11 + (i - 1) * 14) * s, top: (POT.y - 80) * s, width: 22 * s, height: 80 * s, tintColor: '#FFFFFF',
                opacity: st.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.75, 0] }),
                transform: [{ translateY: st.interpolate({ inputRange: [0, 1], outputRange: [14 * s, -36 * s] }) }, { scaleX: st.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.4] }) }],
              }}
            />
          ))}
          {/* Raftaki kupadan ince buhar. */}
          {vals.cup.map((st, i) => (
            <Animated.Image
              key={`cup${i}`}
              source={PARCA.buhar}
              pointerEvents="none"
              style={{
                position: 'absolute', left: (L.mug.x - 10 + i * 12) * s, top: (L.mug.y - 56) * s, width: 18 * s, height: 56 * s, tintColor: '#FFFFFF',
                opacity: st.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.7, 0] }),
                transform: [{ translateY: st.interpolate({ inputRange: [0, 1], outputRange: [8 * s, -30 * s] }) }, { scaleX: st.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.5] }) }],
              }}
            />
          ))}
          {/* Sürahi ve kupa: parıltılar sırayla yanıp söner (kutlamada hepsi). */}
          {[{ x: POT.x - 30, y: POT.y + 50 }, { x: POT.x + 30, y: POT.y + 90 }, { x: L.mug.x + 20, y: L.mug.y + 10 }, { x: L.mug.x - 10, y: L.mug.y + 50 }].map((p, i) => (
            <Animated.Image
              key={`tw${i}`}
              source={PARCA.yildiz}
              pointerEvents="none"
              style={{
                position: 'absolute', left: (p.x - 10) * s, top: (p.y - 10) * s, width: 20 * s, height: 20 * s, tintColor: '#FFF3C4',
                opacity: Animated.add(vals.twinkle[i]!, vals.fest.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.8, 0] })),
                transform: [{ scale: vals.twinkle[i]!.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }, { rotate: vals.twinkle[i]!.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '70deg'] }) }],
              }}
            />
          ))}
          {lampOn && (
            <Animated.Image
              source={ISIK}
              pointerEvents="none"
              style={{ position: 'absolute', left: (LAMP.x - 260) * s, top: (LAMP.y - 260) * s, width: 520 * s, height: 520 * s, tintColor: '#FFB44D', opacity: Animated.multiply(lampOp, 0.6 + 0.25 * dusk + 0.4 * night + warm * 0.4), transform: [{ scale: Animated.add(vals.halo.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.05] }), vals.boost.interpolate({ inputRange: [0, 1], outputRange: [0, 0.08] })) }] }}
            />
          )}
          {lampOn && (
            <Animated.Image
              source={ISIK}
              pointerEvents="none"
              style={{ position: 'absolute', left: (LAMP.x - 120) * s, top: (LAMP.y - 90) * s, width: 240 * s, height: 180 * s, tintColor: '#FFE9A8', opacity: Animated.add(vals.lamp.interpolate({ inputRange: [0.5, 1], outputRange: [0.12, 0.45], extrapolate: 'clamp' }), vals.boost.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] })) }}
            />
          )}
          {/* Bugünkü işler lamba halesini büyütüp ısıtır. */}
          {warm > 0 && lampOn && glow(LAMP.x, LAMP.y + 120, 300 + warm * 160, '#FFC27A', Animated.multiply(vals.lamp, 0.12 + warm * 0.18))}
          {/* Günlerce uğranmadı: kenarlardan içe loşluk. */}
          {dim > 0 && VIGNETTE.map((p, i) => glow(p.x, p.y, p.r, '#141B2E', Math.min(0.9, dim * 1.6), i))}
          {onTouch && (Object.keys(L.hit) as RoomTouch[]).map(k => (
            <Pressable key={k} onPress={() => react(k)} accessibilityLabel={k} style={box(L.hit[k])} />
          ))}
          {onTouch && <>
            <Pressable accessible={false} onPress={() => react('bitki', 'asma')} style={box({ x: 0, y: L.parts.asma.pivot.y + 85, w: 320, h: 308 })} />
            <Pressable accessible={false} onPress={() => react('bitki', 'asma')} style={box({ x: 202, y: L.parts.asma.pivot.y + 393, w: 112, h: 245 })} />
            <Pressable accessible={false} onPress={() => react('bitki', 'pencerebitki')} style={box({ x: 60, y: 855, w: 230, h: 232 })} />
          </>}
        </View>
      )}
      {children}
    </View>
  );
}
