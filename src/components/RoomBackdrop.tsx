import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Image, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

import { useReduceMotion } from '@/components/motion';
import { LAMP, MOON, ODA, ODA_H, ODA_W, PIVOT, STARS, ISIK, type OdaVariant } from '@/constants/oda';
import { useActive } from '@/hooks/useActive';

/** Saate göre oda: 19:00-06:59 gece, diğer saatler gündüz. */
export const odaOfHour = (h = new Date().getHours()): OdaVariant => (h >= 19 || h < 7 ? 'gece' : 'gunduz');

/** Oda resminin `cover` yerleşimi: ekran boyutundan ölçek ve kaydırma. Resim koordinatını ekrana çevirmek için. */
export const odaMap = (w: number, h: number) => {
  const s = Math.max(w / ODA_W, h / ODA_H);
  return { s, ox: (w - ODA_W * s) / 2, oy: (h - ODA_H * s) / 2 };
};

const sine = Easing.inOut(Easing.sin);

/** Değeri 0→1→0 yavaşça gidip getiren döngü. */
function loop(v: Animated.Value, ms: number, delay = 0) {
  return Animated.loop(Animated.sequence([
    Animated.delay(delay),
    Animated.timing(v, { toValue: 1, duration: ms, easing: sine, useNativeDriver: true }),
    Animated.timing(v, { toValue: 0, duration: ms, easing: sine, useNativeDriver: true }),
  ]));
}

/** Lamba titremesi: düzensiz süre ve parlaklık. */
function flicker(v: Animated.Value) {
  const steps: [number, number][] = [[0.86, 260], [0.62, 140], [0.95, 320], [0.7, 120], [0.8, 380], [0.55, 160], [0.9, 240], [0.72, 200], [1, 420]];
  return Animated.loop(Animated.sequence(steps.map(([to, d]) => Animated.timing(v, { toValue: to, duration: d, easing: Easing.linear, useNativeDriver: true }))));
}

/**
 * Moka'nın canlı odası: tek resimden katmanlara ayrılmış (scripts/make-oda-layers.py).
 * Cam dışı yavaşça kayar, bitkiler hafifçe sallanır, lamba titrer, gece ay parlar ve yıldızlar göz kırpar.
 * Ekran odakta değilse ya da uygulama arka plandaysa döngüler durur. Resim `cover` ile ekranı doldurur.
 */
export function RoomBackdrop({ variant, style }: { variant?: OdaVariant; style?: StyleProp<ViewStyle> }) {
  const v = variant ?? odaOfHour();
  const L = ODA[v];
  const reduceM = useReduceMotion();
  const active = useActive();
  const run = !reduceM && active;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const vals = useMemo(() => ({
    cam: new Animated.Value(0.5), a: new Animated.Value(0.5), b: new Animated.Value(0.5), c: new Animated.Value(0.5),
    lamp: new Animated.Value(0.8), moon: new Animated.Value(0.3), sun: new Animated.Value(0), stars: STARS.map(() => new Animated.Value(0.3)),
  }), []);

  useEffect(() => {
    if (!run) return;
    const anims = [
      loop(vals.cam, 22000), loop(vals.a, PIVOT.a.ms), loop(vals.b, PIVOT.b.ms, 900), loop(vals.c, PIVOT.c.ms, 400),
      flicker(vals.lamp), loop(vals.moon, 4200), loop(vals.sun, 7000),
      ...vals.stars.map((s, i) => loop(s, 1400 + i * 370, i * 300)),
    ];
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, [run, vals]);

  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const s = size.w ? Math.max(size.w / ODA_W, size.h / ODA_H) : 0;
  const W = ODA_W * s;
  const H = ODA_H * s;
  const ox = (size.w - W) / 2;
  const oy = (size.h - H) / 2;
  const box = (b: { x: number; y: number; w: number; h: number }) => ({ position: 'absolute' as const, left: b.x * s, top: b.y * s, width: b.w * s, height: b.h * s });
  const glow = (x: number, y: number, r: number, color: string, opacity: Animated.AnimatedInterpolation<number> | Animated.Value, scale?: Animated.AnimatedInterpolation<number>) => (
    <Animated.Image
      source={ISIK}
      pointerEvents="none"
      style={{ position: 'absolute', left: (x - r) * s, top: (y - r) * s, width: 2 * r * s, height: 2 * r * s, tintColor: color, opacity, transform: scale ? [{ scale }] : undefined }}
    />
  );

  return (
    <View onLayout={onLayout} style={[{ overflow: 'hidden' }, style]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {s > 0 && (
        <View style={{ position: 'absolute', left: ox, top: oy, width: W, height: H }}>
          <Image source={L.taban} style={{ width: W, height: H }} resizeMode="stretch" accessibilityIgnoresInvertColors />
          <Animated.Image
            source={L.cam}
            style={[box(L.camBox), { transform: [{ translateX: vals.cam.interpolate({ inputRange: [0, 1], outputRange: [-6 * s, 6 * s] }) }] }]}
            accessibilityIgnoresInvertColors
          />
          {v === 'gece' && glow(MOON.x, MOON.y, 70, '#FFF3C4', vals.moon.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] }))}
          {v === 'gece' && STARS.map((p, i) => (
            <Animated.View key={i} style={{ position: 'absolute', left: (p.x - 2) * s, top: (p.y - 2) * s, width: 4 * s, height: 4 * s, borderRadius: 2 * s, backgroundColor: '#FFFBE0', opacity: vals.stars[i]!.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.95] }) }} />
          ))}
          {v === 'gunduz' && glow(300, 1000, 230, '#FFD68A', vals.sun.interpolate({ inputRange: [0, 1], outputRange: [0.02, 0.2] }))}
          {(['a', 'b', 'c'] as const).map(k => {
            const p = PIVOT[k];
            const b = L.bitki[k];
            return (
              <Animated.View
                key={k}
                style={{ position: 'absolute', left: p.x * s, top: p.y * s, width: 0, height: 0, transform: [{ rotate: vals[k].interpolate({ inputRange: [0, 1], outputRange: [`${-p.deg}deg`, `${p.deg}deg`] }) }] }}
              >
                <Image source={b.src} style={{ position: 'absolute', left: (b.box.x - p.x) * s, top: (b.box.y - p.y) * s, width: b.box.w * s, height: b.box.h * s }} accessibilityIgnoresInvertColors />
              </Animated.View>
            );
          })}
          {glow(LAMP.x, LAMP.y, 260, '#FFB44D', vals.lamp.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.45] }))}
          <Animated.Image
            source={ISIK}
            style={{ position: 'absolute', left: (LAMP.x - 120) * s, top: (LAMP.y - 90) * s, width: 240 * s, height: 180 * s, tintColor: '#FFE9A8', opacity: vals.lamp.interpolate({ inputRange: [0.5, 1], outputRange: [0.15, 0.55], extrapolate: 'clamp' }) }}
          />
        </View>
      )}
    </View>
  );
}
