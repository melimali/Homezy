import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Animated, Easing, Image, View, type ImageSourcePropType } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';

import { WORN_CLOTHES } from '@/constants/wornClothes';
import { HeldItemModel, HOLDS } from './MokaHeldItem';
import { useReduceMotion } from '@/components/motion';
import { COSMETIC_IMG } from '@/constants/kozmetik-img';
import { COSMETIC, type SlotId } from '@/domain/kozmetik';
import { useActive } from '@/hooks/useActive';

/**
 * Katmanlı Moka (docs/moka-kozmetik-plani.md §4). Bütün katmanlar 1254×1254 tuvalde aynı yerde durur
 * (assets/moka/rig, scripts/make-moka-rig.py), bu yüzden üst üste konunca tek Moka olur.
 * Eşya, bağlı olduğu parçanın çocuğudur: baş eğilince şapka, kanat kalkınca el eşyası onunla gider.
 * Hepsi `Animated` + native driver (dönüş, ölçek, kaydırma). "Hareketi azalt" açıksa döngüler durur.
 */
const W = 1254;
// Pivotlar 1254 tuvalinde (x, y): boyun, göz ortası, omuzlar, kuyruk kökü.
const NECK = { x: 627, y: 700 };
const SHOULDER_A = { x: 790, y: 650 }; // ekranın sağındaki kanat
const SHOULDER_B = { x: 480, y: 650 }; // ekranın solundaki kanat
const TAIL = { x: 250, y: 1030 };

export type RigMood = 'neutral' | 'happy' | 'wow' | 'sleepy';

const rig = (fur: string | null | undefined): Record<'govde' | 'kuyruk' | 'bas' | 'kanat_a' | 'kanat_b' | 'gozler' | 'gaga', ImageSourcePropType> => {
  const f = fur && FUR_RIG[fur];
  return f || BASE_RIG;
};

// Ayaklar kıyafetin önünde kalsın diye ayrı katman (gövdeden kopya, kahverengi: kürk tonundan etkilenmez).
const AYAK: ImageSourcePropType = require('../../assets/moka/rig/ayak.webp');
const BASE_RIG = {
  govde: require('../../assets/moka/rig/govde.webp'),
  kuyruk: require('../../assets/moka/rig/kuyruk.webp'),
  bas: require('../../assets/moka/rig/bas.webp'),
  kanat_a: require('../../assets/moka/rig/kanat_a.webp'),
  kanat_b: require('../../assets/moka/rig/kanat_b.webp'),
  gozler: require('../../assets/moka/rig/gozler.webp'),
  gaga: require('../../assets/moka/rig/gaga.webp'),
};
const furSet = (t: string) => ({
  ...BASE_RIG,
  govde: FUR_IMG[t].govde, kuyruk: FUR_IMG[t].kuyruk, bas: FUR_IMG[t].bas, kanat_a: FUR_IMG[t].kanat_a, kanat_b: FUR_IMG[t].kanat_b,
});
const FUR_IMG: Record<string, Record<'govde' | 'kuyruk' | 'bas' | 'kanat_a' | 'kanat_b', ImageSourcePropType>> = {
  kahve: { govde: require('../../assets/moka/rig/fur/kahve/govde.webp'), kuyruk: require('../../assets/moka/rig/fur/kahve/kuyruk.webp'), bas: require('../../assets/moka/rig/fur/kahve/bas.webp'), kanat_a: require('../../assets/moka/rig/fur/kahve/kanat_a.webp'), kanat_b: require('../../assets/moka/rig/fur/kahve/kanat_b.webp') },
  gri: { govde: require('../../assets/moka/rig/fur/gri/govde.webp'), kuyruk: require('../../assets/moka/rig/fur/gri/kuyruk.webp'), bas: require('../../assets/moka/rig/fur/gri/bas.webp'), kanat_a: require('../../assets/moka/rig/fur/gri/kanat_a.webp'), kanat_b: require('../../assets/moka/rig/fur/gri/kanat_b.webp') },
  mavi: { govde: require('../../assets/moka/rig/fur/mavi/govde.webp'), kuyruk: require('../../assets/moka/rig/fur/mavi/kuyruk.webp'), bas: require('../../assets/moka/rig/fur/mavi/bas.webp'), kanat_a: require('../../assets/moka/rig/fur/mavi/kanat_a.webp'), kanat_b: require('../../assets/moka/rig/fur/mavi/kanat_b.webp') },
  mor: { govde: require('../../assets/moka/rig/fur/mor/govde.webp'), kuyruk: require('../../assets/moka/rig/fur/mor/kuyruk.webp'), bas: require('../../assets/moka/rig/fur/mor/bas.webp'), kanat_a: require('../../assets/moka/rig/fur/mor/kanat_a.webp'), kanat_b: require('../../assets/moka/rig/fur/mor/kanat_b.webp') },
  pembe: { govde: require('../../assets/moka/rig/fur/pembe/govde.webp'), kuyruk: require('../../assets/moka/rig/fur/pembe/kuyruk.webp'), bas: require('../../assets/moka/rig/fur/pembe/bas.webp'), kanat_a: require('../../assets/moka/rig/fur/pembe/kanat_a.webp'), kanat_b: require('../../assets/moka/rig/fur/pembe/kanat_b.webp') },
  turuncu: { govde: require('../../assets/moka/rig/fur/turuncu/govde.webp'), kuyruk: require('../../assets/moka/rig/fur/turuncu/kuyruk.webp'), bas: require('../../assets/moka/rig/fur/turuncu/bas.webp'), kanat_a: require('../../assets/moka/rig/fur/turuncu/kanat_a.webp'), kanat_b: require('../../assets/moka/rig/fur/turuncu/kanat_b.webp') },
  kirmizi: { govde: require('../../assets/moka/rig/fur/kirmizi/govde.webp'), kuyruk: require('../../assets/moka/rig/fur/kirmizi/kuyruk.webp'), bas: require('../../assets/moka/rig/fur/kirmizi/bas.webp'), kanat_a: require('../../assets/moka/rig/fur/kirmizi/kanat_a.webp'), kanat_b: require('../../assets/moka/rig/fur/kirmizi/kanat_b.webp') },
};
const FUR_RIG: Record<string, ReturnType<typeof furSet>> = Object.fromEntries(Object.keys(FUR_IMG).map(t => [t, furSet(t)]));

const sine = Easing.inOut(Easing.sin);

/** Katmanı (w×w) bir noktası etrafında döndürür / ölçekler: RN merkezden döndürür, bu yüzden kaydır-döndür-geri kaydır. */
function Pivot({ s, p, rotate, rotate2, scale, scaleY, scaleX, tx, ty, children }: { s: number; p: { x: number; y: number }; rotate?: Animated.AnimatedInterpolation<string> | string; rotate2?: Animated.AnimatedInterpolation<string> | string; scale?: number; scaleY?: Val; scaleX?: Val; tx?: Val | number; ty?: Val | number; children: ReactNode }) {
  const px = ((p.x - W / 2) / W) * s;
  const py = ((p.y - W / 2) / W) * s;
  const tr: object[] = [];
  if (tx) tr.push({ translateX: tx });
  if (ty) tr.push({ translateY: ty });
  tr.push({ translateX: px }, { translateY: py });
  if (rotate) tr.push({ rotate });
  if (rotate2) tr.push({ rotate: rotate2 });
  if (scale && scale !== 1) tr.push({ scale });
  if (scaleX) tr.push({ scaleX });
  if (scaleY) tr.push({ scaleY });
  tr.push({ translateX: -px }, { translateY: -py });
  return <Animated.View pointerEvents="none" style={{ position: 'absolute', width: s, height: s, transform: tr as never }}>{children}</Animated.View>;
}

const Layer = ({ src, s }: { src: ImageSourcePropType; s: number }) => <Image source={src} style={{ position: 'absolute', width: s, height: s }} resizeMode="contain" fadeDuration={0} />;

type Val = Animated.Value | Animated.AnimatedInterpolation<number>;
/** Hem Animated.Value hem interpolation/çarpım ile çalışır (hepsinde `interpolate` var). */
const ip = <T extends number | string>(v: Val, inputRange: number[], outputRange: T[]) => (v as Animated.Value).interpolate({ inputRange, outputRange: outputRange as never }) as Animated.AnimatedInterpolation<T>;
const deg = (v: Val, a: number) => ip(v, [-1, 1], [`${-a}deg`, `${a}deg`]);

function cosmeticSeed(id: string) {
  let value = 0;
  for (let i = 0; i < id.length; i++) value = (value * 31 + id.charCodeAt(i)) >>> 0;
  return value;
}

function animateCosmetic(value: Animated.Value, id: string | undefined, reduce: boolean, active: boolean) {
  value.stopAnimation();
  if (!id || reduce || !active) {
    value.setValue(0);
    return;
  }
  const seed = cosmeticSeed(id);
  const phase = ((seed >>> 5) % 51) / 100 - 0.25;
  const half = 1000 + (seed % 800);
  value.setValue(phase);
  const loop = Animated.loop(Animated.sequence([
    Animated.timing(value, { toValue: 1, duration: Math.round(half * (1 - phase)), easing: sine, useNativeDriver: true }),
    Animated.timing(value, { toValue: -1, duration: half * 2, easing: sine, useNativeDriver: true }),
    Animated.timing(value, { toValue: phase, duration: Math.round(half * (1 + phase)), easing: sine, useNativeDriver: true }),
  ]));
  loop.start();
  return () => { loop.stop(); value.stopAnimation(); };
}

// Her baş eşyası, çizimdeki temas noktasından Moka'nın saç çizgisine oturur.
const HEAD_TARGET = { x: 256, y: 88 };
type HeadFit = { anchorX: number; anchorY: number; targetY?: number; scale: number; tilt: number; sway: number };
const HEAD_FIT: Record<string, HeadFit> = {
  bas_balkabagi: { anchorX: 256, anchorY: 138, scale: 0.92, tilt: 0, sway: 0.65 },
  bas_kahve_cekirdegi_tac: { anchorX: 256, anchorY: 116, scale: 1.02, tilt: -1, sway: 0.6 },
  bas_mantar: { anchorX: 256, anchorY: 112, targetY: 75, scale: 1, tilt: 0, sway: 0.7 },
  bas_kus_yuvasi: { anchorX: 256, anchorY: 124, scale: 0.9, tilt: -1, sway: 0.55 },
  bas_cay_demligi: { anchorX: 256, anchorY: 129, targetY: 77, scale: 1, tilt: 0, sway: 0.45 },
  bas_kruvasan: { anchorX: 256, anchorY: 110, targetY: 76, scale: 1, tilt: 0, sway: 0.85 },
  bas_uyku_takkesi: { anchorX: 256, anchorY: 118, targetY: 76, scale: 1, tilt: 0, sway: 0.9 },
  bas_cicek_saksi: { anchorX: 256, anchorY: 136, targetY: 71, scale: 1, tilt: 0, sway: 0.55 },
  bas_dondurma: { anchorX: 256, anchorY: 139, targetY: 75, scale: 1, tilt: 0, sway: 0.6 },
  bas_yagmur_bulutu: { anchorX: 256, anchorY: 109, targetY: 73, scale: 1, tilt: 0, sway: 0.6 },
  bas_hasir_sapka: { anchorX: 256, anchorY: 118, targetY: 76, scale: 1, tilt: 0, sway: 0.55 },
  bas_kedi_kulagi: { anchorX: 256, anchorY: 83, targetY: 60, scale: 1, tilt: 0, sway: 0.7 },
  bas_asci_sapkasi: { anchorX: 256, anchorY: 140, targetY: 79, scale: 1, tilt: 0, sway: 0.55 },
  bas_tac: { anchorX: 256, anchorY: 106, scale: 1.04, tilt: -0.5, sway: 0.65 },
  bas_kulaklik: { anchorX: 256, anchorY: 49, targetY: 34, scale: 1, tilt: 0, sway: 0.5 },
  bas_yilbasi: { anchorX: 256, anchorY: 130, targetY: 78, scale: 1, tilt: 0, sway: 0.65 },
  bas_buyucu: { anchorX: 256, anchorY: 151, targetY: 79, scale: 1, tilt: 0, sway: 0.6 },
  bas_korsan: { anchorX: 256, anchorY: 139, targetY: 76, scale: 1, tilt: 0, sway: 0.6 },
  bas_pamuk_seker: { anchorX: 256, anchorY: 108, targetY: 71, scale: 1, tilt: 0, sway: 0.7 },
  bas_kar_adam: { anchorX: 256, anchorY: 122, targetY: 68, scale: 1, tilt: 0, sway: 0.5 },
};

// Kaynak katmanlar 512 × 512. İki gözün merkezleri farklı yükseklikte.
const EYE_CENTERS = [{ x: 207, y: 155 }, { x: 324, y: 138 }];
const BEAK_HINGE = { x: 298 * W / 512, y: 166 * W / 512 };

function RigFace({ size, eyes, beak, blink, look, mouth, sleeping }: {
  size: number; eyes: ImageSourcePropType; beak: ImageSourcePropType;
  blink: Val; look: Val; mouth: Val; sleeping: boolean;
}) {
  const unit = size / 512;
  const gaze = ip(look, [-1, 1], [-3 * unit, 3 * unit]);
  const visibility = (value: Val, range: number[], opacity: number[]) =>
    (value as Animated.Value).interpolate({ inputRange: range, outputRange: opacity, extrapolate: 'clamp' });
  const eyesVisible = visibility(blink, [0.17, 0.21], [0, 1]);
  const lidsVisible = visibility(blink, [0.17, 0.21], [1, 0]);
  const jawVisible = visibility(mouth, [0, 0.14], [0, 1]);
  const closedLid = sleeping
    ? 'M-20 -2 C-12 6 7 9 18 -3 C14 9 -9 15 -20 1 Q-22 -4 -20 -2Z'
    : 'M-20 3 C-14 -9 4 -14 18 -4 Q20 -1 17 -2 C3 -8 -10 -5 -18 5 Q-21 7 -20 3Z';

  return (
    <>
      {EYE_CENTERS.map(({ x, y }) => (
        <Animated.View key={x} pointerEvents="none" style={{
          position: 'absolute', left: (x - 66) * unit, top: (y - 60) * unit,
          width: 132 * unit, height: 120 * unit, overflow: 'hidden',
          opacity: eyesVisible, transform: [{ translateX: gaze }, { scaleY: blink }],
        }}>
          <Image source={eyes} resizeMode="contain" fadeDuration={0} style={{
            position: 'absolute', left: (66 - x) * unit, top: (60 - y) * unit, width: size, height: size,
          }} />
        </Animated.View>
      ))}
      <Animated.View pointerEvents="none" style={{ position: 'absolute', width: size, height: size, opacity: lidsVisible }}>
        <Svg width={size} height={size} viewBox="0 0 512 512">
          <Ellipse cx={189} cy={177} rx={12} ry={4.5} fill="#DC9781" opacity={0.32} />
          <Ellipse cx={337} cy={160} rx={11} ry={4.3} fill="#DC9781" opacity={0.32} />
          {EYE_CENTERS.map(({ x, y }) => (
            <Path key={x} d={closedLid} translateX={x} translateY={y} fill="#4A3025" />
          ))}
        </Svg>
      </Animated.View>
      <Pivot s={size} p={BEAK_HINGE} rotate={ip(mouth, [0, 1], ['0deg', '-15deg'])}>
        <Animated.View style={{ position: 'absolute', width: size, height: size, opacity: jawVisible }}>
          <Svg width={size} height={size} viewBox="0 0 512 512">
            <Path d="M252 176Q271 183 296 166C300 179 292 197 282 201C270 203 257 189 252 176Z" fill="#C9834F" stroke="#593A2D" strokeWidth={2.3} strokeLinejoin="round" />
            <Path d="M253 176Q272 180 295 168C294 182 287 194 280 197C272 197 259 187 253 176Z" fill="#61372E" />
            <Path d="M266 190Q273 185 283 190Q285 193 282 196Q275 199 266 190Z" fill="#DF927C" />
          </Svg>
        </Animated.View>
      </Pivot>
      <Pivot s={size} p={BEAK_HINGE} rotate={ip(mouth, [0, 1], ['0deg', '2.4deg'])}>
        <Svg width={size} height={size} viewBox="0 0 512 512" style={{ position: 'absolute' }}>
          <Path d="M240 172Q253 180 261 177Q280 186 300 168Q295 191 282 196Q273 198 261 183Q250 192 240 181Z" fill="#DDA357" />
        </Svg>
        <Layer src={beak} s={size} />
        <Svg width={size} height={size} viewBox="0 0 512 512" style={{ position: 'absolute' }}>
          <Ellipse cx={256} cy={152} rx={1.9} ry={2.5} fill="#805637" opacity={0.72} />
          <Ellipse cx={277} cy={147} rx={1.45} ry={1.9} fill="#805637" opacity={0.54} />
        </Svg>
      </Pivot>
    </>
  );
}

/** Bir sözcükte 2–4 hece, ilk hecede vurgu, sözcük sonunda kısa soluk. */
export function useSpeechMouth(speaking: boolean) {
  const [mouth] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!speaking) return;
    let animation: Animated.CompositeAnimation;
    let active = true;
    const word = () => {
      const count = 2 + Math.floor(Math.random() * 3);
      const beats = Array.from({ length: count }, (_, index) => {
        const open = index === 0 ? 0.72 + Math.random() * 0.20 : 0.36 + Math.random() * 0.34;
        return Animated.sequence([
          Animated.timing(mouth, { toValue: open, duration: 85 + open * 55, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(mouth, { toValue: index === count - 1 ? 0 : 0.1, duration: 95 + open * 40, easing: sine, useNativeDriver: true }),
        ]);
      });
      animation = Animated.sequence([...beats, Animated.delay(145 + Math.random() * 180)]);
      animation.start(({ finished }) => { if (active && finished) word(); });
    };
    word();
    return () => { active = false; animation.stop(); mouth.setValue(0); };
  }, [mouth, speaking]);
  return mouth;
}

/** Oda ve dolap aynı çizimleri ve temas noktalarını kullanır. */
export function RigBody({ size, fur, worn, sway, lag, wing, tail, blink, look, mouth, breath, sleeping = false }: {
  size: number; fur?: string | null; worn?: Partial<Record<SlotId, string | undefined>>;
  sway: Val; lag: Val; wing: Val; tail: Val; blink: Val; look: Val; mouth: Val; breath: Val; sleeping?: boolean;
}) {
  const L = useMemo(() => rig(fur), [fur]);
  const reduce = useReduceMotion();
  const active = useActive();
  const headId = worn?.bas && COSMETIC[worn.bas] && COSMETIC_IMG[worn.bas] ? worn.bas : undefined;
  const bodyId = worn?.govde && COSMETIC[worn.govde] && COSMETIC_IMG[worn.govde] ? worn.govde : undefined;
  const handId = worn?.el && COSMETIC[worn.el] && COSMETIC_IMG[worn.el] ? worn.el : undefined;
  const [headMotion] = useState(() => new Animated.Value(0));
  const [bodyMotion] = useState(() => new Animated.Value(0));
  const [handMotion] = useState(() => new Animated.Value(0));
  useEffect(() => animateCosmetic(headMotion, headId, reduce, active), [headId, reduce, active, headMotion]);
  useEffect(() => animateCosmetic(bodyMotion, bodyId, reduce, active), [bodyId, reduce, active, bodyMotion]);
  useEffect(() => animateCosmetic(handMotion, handId, reduce, active), [handId, reduce, active, handMotion]);
  const headLate = ip(breath, [0, 1], [0, -size * 0.004]);
  const wingRise = ip(breath, [0, 1], [0, -size * 0.003]);
  const bodyItem = bodyId ? WORN_CLOTHES[bodyId] ?? COSMETIC_IMG[bodyId] : null;
  const headItem = headId ? COSMETIC_IMG[headId] : null;
  const hold = handId ? HOLDS[handId] : undefined;
  const headFit = headId ? HEAD_FIT[headId] : undefined;
  const headTarget = headFit ? { x: HEAD_TARGET.x, y: headFit.targetY ?? HEAD_TARGET.y } : HEAD_TARGET;
  const headRoot = { x: (headTarget.x * W) / 512, y: (headTarget.y * W) / 512 };
  const headPivot = headFit ? { x: (headFit.anchorX * W) / 512, y: (headFit.anchorY * W) / 512 } : headRoot;
  const headTx = headFit ? ((headTarget.x - headFit.anchorX) * size) / 512 : 0;
  const headTy = headFit ? ((headTarget.y - headFit.anchorY) * size) / 512 : 0;
  const cape = bodyId === 'govde_pelerin' || bodyId === 'govde_kral_pelerini';
  const clothSwing = cape ? 0.7 : 0.35;
  return (
    <>
      <Pivot s={size} p={TAIL} rotate={deg(tail, 3)}><Layer src={L.kuyruk} s={size} /></Pivot>
      <Layer src={L.govde} s={size} />
      {bodyId && bodyItem && (
        <Pivot s={size} p={NECK} rotate={deg(bodyMotion, clothSwing)}>
          <Layer src={bodyItem} s={size} />
        </Pivot>
      )}
      <Layer src={AYAK} s={size} />
      <Pivot s={size} p={NECK} rotate={deg(sway, 2.2)} ty={headLate}>
        <Layer src={L.bas} s={size} />
        <RigFace size={size} eyes={L.gozler} beak={L.gaga} blink={blink} look={look} mouth={mouth} sleeping={sleeping} />
        {headItem && headFit && (
          <Pivot s={size} p={headRoot} rotate={deg(lag, 0.8)}>
            <Pivot s={size} p={headPivot} tx={headTx} ty={headTy} rotate={headFit.tilt + 'deg'} scale={headFit.scale}>
              <Pivot s={size} p={headPivot} rotate={deg(headMotion, headFit.sway)} ty={ip(headMotion, [-1, 1], [-size * 0.0015, size * 0.0015])}>
                <Layer src={headItem} s={size} />
              </Pivot>
            </Pivot>
          </Pivot>
        )}
      </Pivot>
      {handId && hold ? (
        <HeldItemModel key={handId} size={size} pose={hold} id={handId} fur={fur} motion={handMotion} animated={active && !reduce} />
      ) : (
        <>
          <Pivot s={size} p={SHOULDER_B} rotate={deg(wing, -2.5)} ty={wingRise}><Layer src={L.kanat_b} s={size} /></Pivot>
          <Pivot s={size} p={SHOULDER_A} rotate={deg(wing, 2.5)} ty={wingRise}><Layer src={L.kanat_a} s={size} /></Pivot>
        </>
      )}
    </>
  );
}

export function MokaRig({ size, fur, worn, mood = 'happy', talking = false, pop = 0 }: { size: number; fur?: string | null; worn?: Partial<Record<SlotId, string | undefined>>; mood?: RigMood; talking?: boolean; /** Artınca küçük bir sevinç zıplaması (eşya giydirince). */ pop?: number }) {
  const reduce = useReduceMotion();
  const active = useActive();
  const run = !reduce && active;
  const [breath] = useState(() => new Animated.Value(0));
  const [sway] = useState(() => new Animated.Value(0)); // baş eğme -1..1
  const [lag] = useState(() => new Animated.Value(0)); // şapka: baştan biraz geç
  const [wing] = useState(() => new Animated.Value(0)); // kanat sallanma -1..1
  const [tail] = useState(() => new Animated.Value(0));
  const [blink] = useState(() => new Animated.Value(1)); // göz ölçeği y
  const [look] = useState(() => new Animated.Value(0));
  const mouth = useSpeechMouth(run && talking);
  const [hop] = useState(() => new Animated.Value(0));

  const loop = (v: Animated.Value, ms: number, from = 0, to = 1) => Animated.loop(Animated.sequence([
    Animated.timing(v, { toValue: to, duration: ms, easing: sine, useNativeDriver: true }),
    Animated.timing(v, { toValue: from, duration: ms, easing: sine, useNativeDriver: true }),
  ]));

  // Nefes, baş eğme, kanat ve kuyruk: farklı hızlarda, birbirini tutmaz. Şapka başı 170 ms geriden izler.
  useEffect(() => {
    if (!run) return;
    const a = [loop(breath, 1900), loop(sway, 3100, -1, 1), loop(wing, 2600, -1, 1), loop(tail, 1500, -1, 1)];
    a.forEach(x => x.start());
    const t = setTimeout(() => { const l = loop(lag, 3100, -1, 1); l.start(); a.push(l); }, 170);
    return () => { clearTimeout(t); a.forEach(x => x.stop()); };
  }, [run, breath, sway, lag, wing, tail]);

  // Göz kırpma: düzensiz aralık; uykuda yarı kapalı, sevinçte kısık.
  const baseEye = mood === 'sleepy' ? 0.04 : mood === 'happy' ? 0.92 : mood === 'wow' ? 1.06 : 1;
  useEffect(() => {
    const pose = Animated.timing(blink, { toValue: baseEye, duration: reduce ? 0 : 230, easing: sine, useNativeDriver: true });
    pose.start();
    return () => pose.stop();
  }, [baseEye, blink, reduce]);
  useEffect(() => {
    if (!run || mood === 'sleepy') return;
    let current: Animated.CompositeAnimation | undefined;
    let dead = false;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      if (dead) return;
      t = setTimeout(() => {
        const one = Animated.sequence([
          Animated.timing(blink, { toValue: 0.02, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.delay(85),
          Animated.timing(blink, { toValue: baseEye, duration: 190, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]);
        current = one;
        current.start(({ finished }) => { if (finished) next(); });
      }, 2500 + Math.random() * 3800);
    };
    next();
    return () => { dead = true; clearTimeout(t); current?.stop(); blink.setValue(baseEye); };
  }, [run, mood, baseEye, blink]);

  // Etrafa bakış: gözler hafifçe kayar.
  useEffect(() => {
    if (!run) return;
    let current: Animated.CompositeAnimation | undefined;
    let dead = false;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      if (dead) return;
      t = setTimeout(() => {
        current = Animated.sequence([
          Animated.timing(look, { toValue: Math.random() < 0.5 ? -1 : 1, duration: 260, easing: sine, useNativeDriver: true }),
          Animated.delay(900 + Math.random() * 900),
          Animated.timing(look, { toValue: 0, duration: 320, easing: sine, useNativeDriver: true }),
        ]);
        current.start(({ finished }) => { if (finished) next(); });
      }, 4000 + Math.random() * 5000);
    };
    next();
    return () => { dead = true; clearTimeout(t); current?.stop(); look.setValue(0); };
  }, [run, look]);

  // Sevinç zıplaması: çömel, zıpla, otur.
  useEffect(() => {
    if (!pop || reduce) return;
    Animated.sequence([
      Animated.timing(hop, { toValue: -0.35, duration: 110, useNativeDriver: true }),
      Animated.timing(hop, { toValue: 1, duration: 230, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(hop, { toValue: 0, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [pop, reduce, hop]);

  const sBreath = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.018] });
  const lift = breath.interpolate({ inputRange: [0, 1], outputRange: [0, -(0.018 * size) / 2] }); // alt sabit kalsın
  const hopY = hop.interpolate({ inputRange: [-0.35, 0, 1], outputRange: [size * 0.012, 0, -size * 0.07] });
  const hopS = hop.interpolate({ inputRange: [-0.35, 0, 1], outputRange: [0.94, 1, 1.03] });
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={{ width: size, height: size, transform: [{ translateY: hopY }, { translateY: lift }, { scaleY: Animated.multiply(sBreath, hopS) }] }}>
        <RigBody size={size} fur={fur} worn={worn} sway={sway} lag={lag} wing={wing} tail={tail} blink={blink} look={look} mouth={mouth} breath={breath} sleeping={mood === 'sleepy'} />
      </Animated.View>
    </View>
  );
}
