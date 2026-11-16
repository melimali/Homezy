import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Animated, Easing, Image, Pressable, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

import { useReduceMotion } from '@/components/motion';
import { LAMP, MOON, ODA, ODA_H, ODA_W, PIVOT, STARS, ISIK, type OdaVariant } from '@/constants/oda';
import { useActive } from '@/hooks/useActive';
import type { SkyKind } from '@/lib/weather';

/** Saate göre oda: 19:00-06:59 gece, diğer saatler gündüz. */
export const odaOfHour = (h = new Date().getHours()): OdaVariant => (h >= 19 || h < 7 ? 'gece' : 'gunduz');

/** Oda resminin `cover` yerleşimi: ekran boyutundan ölçek ve kaydırma. Resim koordinatını ekrana çevirmek için. */
export const odaMap = (w: number, h: number) => {
  const s = Math.max(w / ODA_W, h / ODA_H);
  return { s, ox: (w - ODA_W * s) / 2, oy: (h - ODA_H * s) / 2 };
};

export type RoomTouch = 'lamba' | 'kupa' | 'surahi' | 'bitki' | 'pencere';
type Box = { x: number; y: number; w: number; h: number };
/** Dokunulabilir nesneler (oda resmi koordinatı). */
const HIT: Record<RoomTouch, Box> = {
  lamba: { x: 650, y: 760, w: 202, h: 170 },
  kupa: { x: 505, y: 468, w: 125, h: 262 },
  surahi: { x: 388, y: 402, w: 117, h: 160 },
  bitki: { x: 530, y: 890, w: 175, h: 170 },
  pencere: { x: 0, y: 380, w: 190, h: 600 },
};
/** Pencerenin üç camı (yağmur ve kar bunlarla sınırlı). */
const PANES: Box[] = [{ x: 58, y: 406, w: 105, h: 188 }, { x: 59, y: 604, w: 118, h: 164 }, { x: 59, y: 793, w: 116, h: 181 }];
/** Kahve sürahisinin ağzı (üst raf, kupanın solu): seri buharı buradan çıkar. */
const POT = { x: 452, y: 424 };
/** Rafın üstündeki ışık zinciri: 7 ampul (uzun seri ödülü, resimsiz). */
const CHAIN = Array.from({ length: 7 }, (_, i) => {
  const t = i / 6;
  return { x: 318 + t * 330, y: 372 + Math.sin(t * Math.PI) * 26 };
});

const sine = Easing.inOut(Easing.sin);

/** Değeri 0→1→0 yavaşça gidip getiren döngü. */
function loop(v: Animated.Value, ms: number, delay = 0) {
  return Animated.loop(Animated.sequence([
    Animated.delay(delay),
    Animated.timing(v, { toValue: 1, duration: ms, easing: sine, useNativeDriver: true }),
    Animated.timing(v, { toValue: 0, duration: ms, easing: sine, useNativeDriver: true }),
  ]));
}
/** Gidiş ve dönüş süresi farklı, her turda biraz değişen döngü: bitki, perde gibi doğal salınımlar için (mekanik durmaz). Son tur tamamlanınca durdurulabilir. */
function sway(v: Animated.Value, ms: number, delay = 0, jitter = 0.25) {
  let dead = false;
  const go = () => {
    if (dead) return;
    const a = ms * (1 - jitter / 2 + Math.random() * jitter);
    const b = ms * (1.1 - jitter / 2 + Math.random() * jitter);
    Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: a, easing: sine, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: b, easing: sine, useNativeDriver: true }),
    ]).start(go);
  };
  const t = setTimeout(go, delay);
  return { start: () => undefined, stop: () => { dead = true; clearTimeout(t); v.stopAnimation(); } };
}
/** Değeri 0'dan 1'e doğrusal akıtıp başa saran döngü (düşen ya da yükselen parçacık). */
function rise(v: Animated.Value, ms: number, delay = 0, easing: (t: number) => number = Easing.linear) {
  return Animated.loop(Animated.sequence([Animated.delay(delay), Animated.timing(v, { toValue: 1, duration: ms, easing, useNativeDriver: true }), Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true })]));
}
/** Lamba: yavaşça "nefes alır" (6 sn); 40-90 sn'de bir minicik tek titreşim. Sürekli titreme bozuk ampul gibi durur. */
function breathe(v: Animated.Value) {
  const flick = Animated.sequence([
    Animated.timing(v, { toValue: 0.78, duration: 90, easing: Easing.linear, useNativeDriver: true }),
    Animated.timing(v, { toValue: 0.97, duration: 140, easing: Easing.linear, useNativeDriver: true }),
  ]);
  const cycle = (n: number) => Array.from({ length: n }, () => [
    Animated.timing(v, { toValue: 1, duration: 3000, easing: sine, useNativeDriver: true }),
    Animated.timing(v, { toValue: 0.88, duration: 3000, easing: sine, useNativeDriver: true }),
  ]).flat();
  return Animated.loop(Animated.sequence([...cycle(7), flick, ...cycle(5 + Math.floor(Math.random() * 4)), flick]));
}

type Vals = {
  cam: Animated.Value; a: Animated.Value; b: Animated.Value; c: Animated.Value; lamp: Animated.Value; moon: Animated.Value; sun: Animated.Value;
  stars: Animated.Value[]; dust: Animated.Value[]; steam: Animated.Value[]; rain: Animated.Value[]; boost: Animated.Value; nudgeC: Animated.Value; nudgeA: Animated.Value; pot: Animated.Value;
};
/** Loşluk için köşelere konan koyu haleler (oda resmi koordinatı). */
const VIGNETTE = [{ x: 0, y: 0, r: 700 }, { x: 852, y: 0, r: 700 }, { x: 0, y: 1846, r: 760 }, { x: 852, y: 1846, r: 760 }, { x: 0, y: 920, r: 420 }, { x: 852, y: 920, r: 420 }];
const MOTES = [
  { x: 690, y: 800, r: 3 }, { x: 740, y: 760, r: 2 }, { x: 800, y: 840, r: 3 }, { x: 640, y: 880, r: 2 }, { x: 560, y: 650, r: 2 }, { x: 330, y: 900, r: 3 },
  { x: 380, y: 1010, r: 2 }, { x: 300, y: 760, r: 2 }, { x: 460, y: 840, r: 3 }, { x: 700, y: 950, r: 2 }, { x: 250, y: 1100, r: 2 }, { x: 600, y: 1100, r: 3 },
];

/** Tek varyantın (gündüz ya da gece) taban, cam ve bitki katmanları. */
function Layers({ v, s, vals, opacity, tilt }: { v: OdaVariant; s: number; vals: Vals; opacity: number; tilt?: Animated.ValueXY }) {
  const L = ODA[v];
  const box = (b: Box) => ({ position: 'absolute' as const, left: b.x * s, top: b.y * s, width: b.w * s, height: b.h * s });
  // Hafif 3B: katmanlar farklı miktarda kayar (dp). Taban sabit; cam dışı az, asma bitkiler daha çok.
  const shift = (x: number, y: number) => (tilt ? [{ translateX: tilt.x.interpolate({ inputRange: [-1, 1], outputRange: [x, -x] }) }, { translateY: tilt.y.interpolate({ inputRange: [-1, 1], outputRange: [y, -y] }) }] : []);
  return (
    <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity }}>
      <Image source={L.taban} style={{ width: ODA_W * s, height: ODA_H * s }} resizeMode="stretch" accessibilityIgnoresInvertColors />
      <Animated.Image source={L.cam} style={[box(L.camBox), { transform: [{ translateX: vals.cam.interpolate({ inputRange: [0, 1], outputRange: [-6 * s, 6 * s] }) }, ...shift(2, 1)] }]} accessibilityIgnoresInvertColors />
      {(['a', 'b', 'c'] as const).map(k => {
        const p = PIVOT[k];
        const b = L.bitki[k];
        const nudge = k === 'c' ? vals.nudgeC : k === 'a' ? vals.nudgeA : null;
        const rot = vals[k].interpolate({ inputRange: [0, 1], outputRange: [`${-p.deg}deg`, `${p.deg}deg`] });
        return (
          <Animated.View key={k} style={{ position: 'absolute', left: p.x * s, top: p.y * s, width: 0, height: 0, transform: [...(k === 'c' ? [] : shift(5, 3)), { rotate: rot }] }}>
            <Animated.View style={{ transform: [{ rotate: nudge ? nudge.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-5deg', '0deg', '5deg'] }) : '0deg' }] }}>
              <Image source={b.src} style={{ position: 'absolute', left: (b.box.x - p.x) * s, top: (b.box.y - p.y) * s, width: b.box.w * s, height: b.box.h * s }} accessibilityIgnoresInvertColors />
            </Animated.View>
          </Animated.View>
        );
      })}
    </View>
  );
}

/**
 * Moka'nın canlı odası: tek resimden katmanlara ayrılmış (scripts/make-oda-layers.py).
 * - Gündüz ve gece resmi saate göre yumuşakça karışır (`mix`: 0 gündüz, 1 gece).
 * - Cam dışı kayar, bitkiler sallanır, lamba titrer, ay parlar, yıldızlar göz kırpar, tozlar uçuşur, kahve sürahisinden buhar çıkar (seri).
 * - Hava: yağmur/fırtına/kar/sis camda görünür. `warm` bugünkü işlerle ışığı ısıtır, `dust` uzun uğramamada toz ve loşluk ekler.
 * - Dokunulabilir nesneler (lamba, kupa, sürahi, bitki, pencere) `onTouch` ile haber verir.
 * - `tilt` verilirse katmanlar farklı miktarda kayar (hafif 3B); taban sabit.
 * Ekran odakta değilse ya da uygulama arka plandaysa döngüler durur. Resim `cover` ile ekranı doldurur.
 */
export function RoomBackdrop({ mix, sky = 'clear', warm = 0, dust = 0, lampOff = false, steam = 1, potGlow = false, brew = 0, chain = -1, tilt, onTouch, style, children }: {
  mix?: number; sky?: SkyKind; warm?: number; dust?: number;
  /** Lamba söndürüldü: hale yok, oda biraz loş. */ lampOff?: boolean;
  /** Sürahiden çıkan buhar çizgisi (0-3): seri durumuna göre. */ steam?: number;
  /** Sürahinin etrafında sıcak hale (kahve taze). */ potGlow?: boolean;
  /** Artınca sürahi bir kez "fokurdar" (buhar patlaması + parıltı). */ brew?: number;
  /** Işık zincirinde yanan ampul (0-7); -1 zincir yok. */ chain?: number;
  /** Katman kayması için eğim (useTilt). */ tilt?: Animated.ValueXY;
  onTouch?: (t: RoomTouch) => void; style?: StyleProp<ViewStyle>; children?: ReactNode;
}) {
  const night = mix ?? (odaOfHour() === 'gece' ? 1 : 0);
  const reduceM = useReduceMotion();
  const active = useActive();
  const run = !reduceM && active;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const vals = useMemo<Vals>(() => ({
    cam: new Animated.Value(0.5), a: new Animated.Value(0.5), b: new Animated.Value(0.5), c: new Animated.Value(0.5),
    lamp: new Animated.Value(0.9), moon: new Animated.Value(0.3), sun: new Animated.Value(0), boost: new Animated.Value(0),
    nudgeC: new Animated.Value(0), nudgeA: new Animated.Value(0), pot: new Animated.Value(0),
    stars: STARS.map(() => new Animated.Value(0.3)), dust: MOTES.map(() => new Animated.Value(0)), steam: [0, 1, 2].map(() => new Animated.Value(0)), rain: Array.from({ length: 14 }, () => new Animated.Value(0)),
  }), []);
  const wet = sky === 'rain' || sky === 'storm' || sky === 'snow';

  useEffect(() => {
    if (!run) return;
    const anims = [
      loop(vals.cam, 22000), sway(vals.a, PIVOT.a.ms, 0), sway(vals.b, PIVOT.b.ms, 900, 0.35), sway(vals.c, PIVOT.c.ms, 400, 0.3),
      breathe(vals.lamp), loop(vals.moon, 4200), loop(vals.sun, 7000),
      ...vals.stars.map((x, i) => sway(x, 900 + ((i * 677) % 1900), i * 430, 0.7)),
      ...vals.dust.map((x, i) => rise(x, 5200 + ((i * 937) % 3600), (i * 1130) % 6000, Easing.inOut(Easing.sin))),
      ...vals.steam.slice(0, steam).map((x, i) => rise(x, 3000 + i * 420, i * 1050 + i * i * 160, Easing.out(Easing.quad))),
      ...(wet ? vals.rain.map((x, i) => rise(x, sky === 'snow' ? 3600 + (i % 4) * 600 : 650 + (i % 3) * 150, i * 90)) : []),
    ];
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, [run, vals, wet, sky, steam]);

  // Fokurdama: sürahi parlar, buhar bir an büyür (günde bir, ilk işten sonra).
  useEffect(() => {
    if (!brew) return;
    vals.pot.setValue(0);
    const a = Animated.sequence([
      Animated.timing(vals.pot, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(vals.pot, { toValue: 0, duration: 1400, easing: sine, useNativeDriver: true }),
    ]);
    a.start();
    return () => a.stop();
  }, [brew, vals]);

  /** Dokununca kısa tepki: lamba parlar, bitki sallanır. */
  const react = (t: RoomTouch) => {
    if (t === 'lamba') Animated.sequence([Animated.timing(vals.boost, { toValue: 1, duration: 160, useNativeDriver: true }), Animated.delay(1600), Animated.timing(vals.boost, { toValue: 0, duration: 900, useNativeDriver: true })]).start();
    if (t === 'surahi') Animated.sequence([Animated.timing(vals.pot, { toValue: 0.7, duration: 180, useNativeDriver: true }), Animated.timing(vals.pot, { toValue: 0, duration: 1100, useNativeDriver: true })]).start();
    const n = t === 'bitki' ? vals.nudgeC : t === 'pencere' ? vals.nudgeA : null;
    if (n) Animated.sequence([Animated.timing(n, { toValue: 1, duration: 140, useNativeDriver: true }), Animated.spring(n, { toValue: 0, friction: 2, tension: 90, useNativeDriver: true })]).start();
    onTouch?.(t);
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
  const nightOp = night; // gece katmanı bunun kadar görünür
  const dim = Math.max(Math.min(0.4, dust * 0.4), lampOff ? 0.14 + 0.16 * night : 0);
  const lampOn = lampOff ? 0 : 1;

  return (
    <View onLayout={onLayout} style={[{ overflow: 'hidden' }, style]} pointerEvents="box-none">
      {s > 0 && (
        <View style={{ position: 'absolute', left: ox, top: oy, width: W, height: H }} pointerEvents="box-none">
          {nightOp < 0.99 && <Layers v="gunduz" s={s} vals={vals} opacity={1} tilt={tilt} />}
          {nightOp > 0.01 && <Layers v="gece" s={s} vals={vals} opacity={nightOp} tilt={tilt} />}

          {nightOp > 0.01 && glow(MOON.x, MOON.y, 70, '#FFF3C4', Animated.multiply(vals.moon.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] }), nightOp))}
          {nightOp > 0.01 && STARS.map((p, i) => (
            <Animated.View key={i} pointerEvents="none" style={{ position: 'absolute', left: (p.x - 2) * s, top: (p.y - 2) * s, width: 4 * s, height: 4 * s, borderRadius: 2 * s, backgroundColor: '#FFFBE0', opacity: Animated.multiply(vals.stars[i]!.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.95] }), nightOp) }} />
          ))}
          {nightOp < 0.99 && glow(300, 1000, 230, '#FFD68A', vals.sun.interpolate({ inputRange: [0, 1], outputRange: [0.02, 0.2 * (1 - nightOp)] }))}

          {/* Hava: camlarda yağmur, kar, sis, bulut */}
          {PANES.map((p, pi) => (
            <View key={pi} pointerEvents="none" style={[box(p), { overflow: 'hidden' }]}>
              {(sky === 'fog' || sky === 'cloudy') && <View style={{ ...box({ x: 0, y: 0, w: p.w, h: p.h }), backgroundColor: sky === 'fog' ? '#E6EDF2' : '#7A8696', opacity: sky === 'fog' ? 0.5 : 0.28 }} />}
              {sky === 'storm' && <View style={{ ...box({ x: 0, y: 0, w: p.w, h: p.h }), backgroundColor: '#1B2230', opacity: 0.4 }} />}
              {wet && vals.rain.map((r, i) => {
                const x = ((i * 37 + pi * 19) % 100) / 100;
                const snow = sky === 'snow';
                return (
                  <Animated.View
                    key={i}
                    style={{
                      position: 'absolute', left: x * p.w * s, top: 0,
                      width: (snow ? 4 : 1.5) * s, height: (snow ? 4 : 14) * s, borderRadius: snow ? 2 * s : 1, backgroundColor: snow ? '#fff' : '#CFE3F5', opacity: snow ? 0.9 : 0.55,
                      transform: [{ translateY: r.interpolate({ inputRange: [0, 1], outputRange: [-16 * s, (p.h + 4) * s] }) }, ...(snow ? [] : [{ rotate: '12deg' as const }])],
                    }}
                  />
                );
              })}
            </View>
          ))}

          {/* Toz zerreleri: lamba ve pencere ışığında */}
          {MOTES.map((m, i) => (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={{
                position: 'absolute', left: m.x * s, top: m.y * s, width: m.r * 2 * s, height: m.r * 2 * s, borderRadius: m.r * s, backgroundColor: '#FFE9B8',
                opacity: vals.dust[i]!.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, i % 3 === 0 || dust > 0.3 ? 0.75 : 0.45, 0] }),
                transform: [
                  { translateY: vals.dust[i]!.interpolate({ inputRange: [0, 1], outputRange: [0, -(26 + (i % 4) * 8) * s] }) },
                  { translateX: vals.dust[i]!.interpolate({ inputRange: [0, 0.35, 0.7, 1], outputRange: [0, (i % 2 ? 9 : -9) * s, (i % 2 ? -4 : 5) * s, (i % 2 ? 10 : -11) * s] }) },
                  { scale: vals.dust[i]!.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.7, 1.1, 0.8] }) },
                ],
              }}
            />
          ))}
          {/* Kahve sürahisi: taze iken sıcak hale, ağzından buhar (seri). Sürahi resimde hep dolu. */}
          {potGlow && glow(POT.x, POT.y + 60, 120, '#FFC98A', 0.22 + night * 0.12, 'potGlow')}
          {glow(POT.x, POT.y + 60, 150, '#FFD9A0', vals.pot.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }), 'potBrew')}
          {vals.steam.slice(0, steam).map((st, i) => (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={{
                position: 'absolute', left: (POT.x - 7 + (i - 1) * 11) * s, top: POT.y * s, width: 14 * s, height: 22 * s, borderRadius: 10 * s, backgroundColor: '#fff',
                opacity: Animated.multiply(st.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, steam > 1 ? 0.55 : 0.35, 0] }), vals.pot.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] })),
                transform: [
                  { translateY: st.interpolate({ inputRange: [0, 1], outputRange: [0, -70 * s] }) },
                  { translateX: st.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, 6 * s, -2 * s, -8 * s, -3 * s] }) },
                  { rotate: st.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-8deg', '10deg', '-14deg'] }) },
                  { scaleX: Animated.multiply(st.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.6] }), vals.pot.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] })) },
                  { scaleY: Animated.multiply(st.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.3] }), vals.pot.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] })) },
                ],
              }}
            />
          ))}
          {/* Işık zinciri: seride her gün bir ampul yanar (7'de hepsi). */}
          {chain >= 0 && (
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
              {CHAIN.slice(1).map((p, i) => {
                const q = CHAIN[i]!;
                const len = Math.hypot(p.x - q.x, p.y - q.y);
                return <View key={`w${i}`} style={{ position: 'absolute', left: ((p.x + q.x) / 2 - len / 2) * s, top: ((p.y + q.y) / 2) * s, width: len * s, height: Math.max(1, 1.6 * s), backgroundColor: '#3B2A20', opacity: 0.55, transform: [{ rotate: `${Math.atan2(p.y - q.y, p.x - q.x)}rad` }] }} />;
              })}
              {CHAIN.map((p, i) => {
                const on = i < chain;
                return (
                  <View key={i}>
                    {on && glow(p.x, p.y + 4, 26, '#FFC27A', 0.55 + night * 0.3, `cg${i}`)}
                    <View style={{ position: 'absolute', left: (p.x - 5) * s, top: (p.y - 1) * s, width: 10 * s, height: 13 * s, borderRadius: 5 * s, backgroundColor: on ? '#FFE3A3' : '#7A6656', borderWidth: Math.max(1, 1.2 * s), borderColor: '#3B2A20' }} />
                  </View>
                );
              })}
            </View>
          )}

          {lampOn > 0 && glow(LAMP.x, LAMP.y, 260, '#FFB44D', Animated.multiply(lampOp, 0.7 + 0.3 * night + warm * 0.4))}
          {lampOn > 0 && <Animated.Image
            source={ISIK}
            pointerEvents="none"
            style={{ position: 'absolute', left: (LAMP.x - 120) * s, top: (LAMP.y - 90) * s, width: 240 * s, height: 180 * s, tintColor: '#FFE9A8', opacity: Animated.add(vals.lamp.interpolate({ inputRange: [0.5, 1], outputRange: [0.15, 0.55], extrapolate: 'clamp' }), vals.boost.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] })) }}
          />}
          {/* Bugünkü işler lamba halesini büyütüp ısıtır (tam ekran perde yok). */}
          {warm > 0 && lampOn > 0 && glow(LAMP.x, LAMP.y + 120, 300 + warm * 160, '#FFC27A', Animated.multiply(vals.lamp, 0.12 + warm * 0.18))}
          {/* Günlerce uğranmadı: kenarlardan içe loşluk (vinyet). */}
          {dim > 0 && VIGNETTE.map((p, i) => glow(p.x, p.y, p.r, '#141B2E', Math.min(0.9, dim * 1.6), i))}
          {onTouch && (Object.keys(HIT) as RoomTouch[]).map(k => (
            <Pressable key={k} onPress={() => react(k)} accessibilityLabel={k} style={box(HIT[k])} />
          ))}
        </View>
      )}
      {children}
    </View>
  );
}
