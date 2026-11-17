import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Animated, Easing, Image, View, type ImageSourcePropType } from 'react-native';

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
const EYES = { x: 636, y: 343 };
const SHOULDER_A = { x: 790, y: 650 }; // ekranın sağındaki kanat
const SHOULDER_B = { x: 480, y: 650 }; // ekranın solundaki kanat
const TAIL = { x: 250, y: 1030 };

export type RigMood = 'neutral' | 'happy' | 'wow' | 'sleepy';

const rig = (fur: string | null | undefined): Record<'govde' | 'kuyruk' | 'bas' | 'kanat_a' | 'kanat_b' | 'gozler' | 'gaga', ImageSourcePropType> => {
  const f = fur && FUR_RIG[fur];
  return f || BASE_RIG;
};

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
function Pivot({ s, p, rotate, scaleY, scaleX, tx, ty, children }: { s: number; p: { x: number; y: number }; rotate?: Animated.AnimatedInterpolation<string>; rotate2?: Animated.AnimatedInterpolation<string>; scaleY?: Val; scaleX?: Val; tx?: Val; ty?: Val; children: ReactNode }) {
  const px = ((p.x - W / 2) / W) * s;
  const py = ((p.y - W / 2) / W) * s;
  const tr: object[] = [];
  if (tx) tr.push({ translateX: tx });
  if (ty) tr.push({ translateY: ty });
  tr.push({ translateX: px }, { translateY: py });
  if (rotate) tr.push({ rotate });
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

const HAT = { x: 627, y: 300 }; // şapkanın oturduğu yer (baş üstü): ikincil hareket pivotu

/**
 * Katmanlar + hareket girdileri (zamanlayıcı yok). Sürücüler: `MokaRig` (kendi kendine) ve `RoomMoka` (odadaki Moka).
 * Girdiler -1..1 (sway, wing, tail, look), blink = göz ölçeği y (1 açık), mouth 0..1, lag = şapkanın geç kalan eğilmesi.
 */
export function RigBody({ size, fur, worn, sway, lag, wing, tail, blink, look, mouth, breath }: {
  size: number; fur?: string | null; worn?: Partial<Record<SlotId, string | undefined>>;
  sway: Val; lag: Val; wing: Val; tail: Val; blink: Val; look: Val; mouth: Val; breath: Val;
}) {
  const L = useMemo(() => rig(fur), [fur]);
  const k = size / W;
  const headLate = ip(breath, [0, 1], [0, -size * 0.004]);
  const wingRise = ip(breath, [0, 1], [0, -size * 0.003]);
  const eyeX = ip(look, [-1, 1], [-14 * k, 14 * k]);
  const beakY = ip(mouth, [0, 1], [0, 16 * k]);
  const item = (slot: SlotId) => {
    const id = worn?.[slot];
    return id && COSMETIC[id] && COSMETIC_IMG[id] ? <Layer src={COSMETIC_IMG[id]} s={size} /> : null;
  };
  const hat = worn?.bas && COSMETIC[worn.bas] && COSMETIC_IMG[worn.bas] ? <Layer src={COSMETIC_IMG[worn.bas]} s={size} /> : null;
  return (
    <>
      <Pivot s={size} p={TAIL} rotate={deg(tail, 3)}><Layer src={L.kuyruk} s={size} /></Pivot>
      <Layer src={L.govde} s={size} />
      {item('govde')}
      <Pivot s={size} p={NECK} rotate={deg(sway, 2.2)} ty={headLate}>
        <Layer src={L.bas} s={size} />
        <Pivot s={size} p={EYES} scaleY={blink} tx={eyeX}><Layer src={L.gozler} s={size} /></Pivot>
        <Pivot s={size} p={EYES} ty={beakY}><Layer src={L.gaga} s={size} /></Pivot>
        {hat && <Pivot s={size} p={HAT} rotate={deg(lag, 1.1)}>{hat}</Pivot>}
      </Pivot>
      <Pivot s={size} p={SHOULDER_B} rotate={deg(wing, -2.5)} ty={wingRise}><Layer src={L.kanat_b} s={size} /></Pivot>
      <Pivot s={size} p={SHOULDER_A} rotate={deg(wing, 2.5)} ty={wingRise}>
        <Layer src={L.kanat_a} s={size} />
        {item('el')}
      </Pivot>
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
  const [mouth] = useState(() => new Animated.Value(0));
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
  const baseEye = mood === 'sleepy' ? 0.22 : mood === 'happy' ? 0.92 : mood === 'wow' ? 1.06 : 1;
  useEffect(() => {
    Animated.timing(blink, { toValue: baseEye, duration: reduce ? 0 : 260, easing: sine, useNativeDriver: true }).start();
  }, [baseEye, blink, reduce]);
  useEffect(() => {
    if (!run || mood === 'sleepy') return;
    let dead = false;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      if (dead) return;
      t = setTimeout(() => {
        const one = Animated.sequence([
          Animated.timing(blink, { toValue: 0.06, duration: 70, useNativeDriver: true }),
          Animated.delay(60),
          Animated.timing(blink, { toValue: baseEye, duration: 110, useNativeDriver: true }),
        ]);
        (Math.random() < 0.2 ? Animated.sequence([one, Animated.delay(120), one]) : one).start(next);
      }, 2500 + Math.random() * 3800);
    };
    next();
    return () => { dead = true; clearTimeout(t); };
  }, [run, mood, baseEye, blink]);

  // Etrafa bakış: gözler hafifçe kayar.
  useEffect(() => {
    if (!run) return;
    let dead = false;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      if (dead) return;
      t = setTimeout(() => {
        Animated.sequence([
          Animated.timing(look, { toValue: Math.random() < 0.5 ? -1 : 1, duration: 260, easing: sine, useNativeDriver: true }),
          Animated.delay(900 + Math.random() * 900),
          Animated.timing(look, { toValue: 0, duration: 320, easing: sine, useNativeDriver: true }),
        ]).start(next);
      }, 4000 + Math.random() * 5000);
    };
    next();
    return () => { dead = true; clearTimeout(t); };
  }, [run, look]);

  // Konuşurken gaga: farklı açıklıkta heceler.
  useEffect(() => {
    if (!talking) { mouth.stopAnimation(); mouth.setValue(0); return; }
    let stop = false;
    const step = () => {
      if (stop) return;
      Animated.sequence([
        Animated.timing(mouth, { toValue: 0.5 + Math.random() * 0.5, duration: 90 + Math.random() * 70, useNativeDriver: true }),
        Animated.timing(mouth, { toValue: 0, duration: 80 + Math.random() * 60, useNativeDriver: true }),
        Animated.delay(Math.random() < 0.3 ? 160 : 30),
      ]).start(step);
    };
    step();
    return () => { stop = true; mouth.stopAnimation(); };
  }, [talking, mouth]);

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
        <RigBody size={size} fur={fur} worn={worn} sway={sway} lag={lag} wing={wing} tail={tail} blink={blink} look={look} mouth={mouth} breath={breath} />
      </Animated.View>
    </View>
  );
}
