import { useActive } from '@/hooks/useActive';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

import type { HeroFx, HeroMotion, HeroScene } from '@/domain/heroScenes';
import { useReduceMotion } from './motion';

const FX: Record<Exclude<HeroFx, 'none'>, string[]> = {
  zzz: ['💤', '💤', '💤'],
  hearts: ['💕', '💗', '💖'],
  notes: ['🎵', '🎶', '🎵'],
  sparkle: ['✨', '⭐', '✨'],
  steam: ['☁️', '☁️', '☁️'],
  stars: ['⭐', '🌟', '✨'],
  bubbles: ['🫧', '🫧', '🫧'],
  leaves: ['🍃', '🌿', '🍃'],
  rain: ['💧', '💧', '💧'],
  snow: ['❄️', '❄️', '❄️'],
};

/** Süs emojileri sahnenin alt-sağ yarısından yumuşakça yükselir (üstteki konuşma balonuna girmez). */
function Particles({ fx, reduce, left: x0, top: y0 }: { fx: HeroFx; reduce: boolean; left: number; top: number }) {
  const [vals] = useState(() => [new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]);
  useEffect(() => {
    if (fx === 'none' || reduce) return;
    const loops = vals.map((v, i) => {
      v.setValue(0);
      return Animated.loop(Animated.sequence([
        Animated.delay(i * 900),
        Animated.timing(v, { toValue: 1, duration: 2700, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }),
        Animated.timing(v, { toValue: 0, duration: 1, useNativeDriver: true, isInteraction: false }),
      ]));
    });
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [fx, reduce, vals]);
  if (fx === 'none' || reduce) return null;
  const set = FX[fx];
  const dx = [0, 22, -18];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {vals.map((v, i) => (
        <Animated.Text
          key={i}
          style={{
            position: 'absolute', left: x0 + dx[i], top: y0, fontSize: 16 + i * 2,
            opacity: v.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 0.55, 0.3, 0] }),
            transform: [
              { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, fx === 'snow' || fx === 'rain' ? 36 : -70] }) },
              { translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, i % 2 ? 8 : -8, 0] }) },
              { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] }) },
            ],
          }}
        >
          {set[i]}
        </Animated.Text>
      ))}
    </View>
  );
}

function motionStyle(v: Animated.Value, m: HeroMotion) {
  const I = (o: number[]) => v.interpolate({ inputRange: [0, 1], outputRange: o });
  // Boyut sabit: hareketler çok hafif, Moka kadrajdan taşmaz, yakınlaşma yok.
  switch (m) {
    case 'breath': return { transform: [{ translateY: I([0, -3]) }] };
    case 'bob': return { transform: [{ translateY: I([0, -6]) }] };
    case 'sway': return { transform: [{ translateY: I([0, -3]) }] };
    case 'zoom': return { transform: [{ translateY: I([0, -3]) }] };
    case 'beat': return { transform: [{ translateY: I([0, -4]) }] };
  }
}
/** Müzik çalarken Moka dans eder: zıplar ve iki yana yatar (yalnızca transform, yerel sürücü). */
function danceStyle(v: Animated.Value) {
  const I = <T extends number | string>(o: T[]) => v.interpolate({ inputRange: [0, 1], outputRange: o as unknown as number[] });
  return { transform: [{ translateY: I([0, -9]) }, { rotate: I(['-4deg', '4deg']) }] };
}
const DUR: Record<HeroMotion, number> = { breath: 3000, bob: 1500, sway: 2200, zoom: 6500, beat: 700 };

/**
 * Ana ekranın en üstü: arka plan SABİT (hiç oynamaz, değişmez); sadece saydam Moka çıkartması
 * hareket eder (nefes, zıplama, sallanma, yaklaşma, kalp atışı). Poz uygulama açılırken bir kez seçilir.
 * Çıkartma tabandan hizalıdır: hareketler ayakları yerinden oynatmaz, boyut/yer ölçüden önce hesaplanır.
 */
export function HeroMoka({ scene, ratio, marginTop, reserveTop, below, children }: {
  scene: HeroScene; ratio: number; marginTop: number;
  /** Üstte konuşma balonuna ayrılan yükseklik (dp); Moka asla bu bölgeye girmez. */
  reserveTop: number;
  /** Arka planın üstünde, Moka'nın ALTINDA kalan katmanlar (solma geçişleri). */
  below?: ReactNode;
  children?: ReactNode;
}) {
  const reduceSys = useReduceMotion();
  const active = useActive();
  const reduce = reduceSys || !active;
  const def = scene;
  const dancing = false; // Pikap çalarken Moka dans etmez.
  const [w, setW] = useState(0);
  const h = w ? Math.round(w / ratio) : 0;
  const m = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(reduce ? 1 : 0)).current;

  // Açılışta Moka bir kez yumuşakça belirir (arka plan beklemeden hazırdır).
  useEffect(() => {
    if (reduce) { pop.setValue(1); return; }
    Animated.timing(pop, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [pop, reduce]);

  useEffect(() => {
    if (reduce) { m.setValue(0); return; }
    m.setValue(0);
    const d = dancing ? 420 : DUR[def.motion];
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(m, { toValue: 1, duration: d, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(m, { toValue: 0, duration: d, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [def.motion, reduce, m, dancing]);

  const mStyle = useMemo(() => (dancing ? danceStyle(m) : motionStyle(m, def.motion)), [m, def.motion, dancing]);
  const bottom = Math.round(h * scene.bottom);
  const size = Math.max(0, Math.min(Math.round(w * scene.size), h - bottom - reserveTop));
  const box = { position: 'absolute' as const, left: Math.round(w * scene.x - size / 2), bottom, width: size, height: size };

  return (
    <View onLayout={e => { const nw = Math.round(e.nativeEvent.layout.width); if (nw !== w) setW(nw); }} style={{ alignSelf: 'stretch', height: h || undefined, aspectRatio: h ? undefined : ratio, overflow: 'hidden', marginTop }}>
      {w > 0 && h > 0 && (
        <>
          <Image source={scene.background} style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }} resizeMode="cover" fadeDuration={0} accessibilityIgnoresInvertColors />
          {below}
          <Animated.View pointerEvents="none" style={[box, { opacity: pop }]}>
            <Animated.View style={[{ width: size, height: size }, mStyle]}>
              <Image source={scene.sticker} style={{ width: size, height: size }} resizeMode="contain" fadeDuration={0} accessibilityIgnoresInvertColors />
            </Animated.View>
          </Animated.View>
          <Particles fx={dancing ? 'notes' : def.fx} reduce={reduce} left={box.left + size * 0.62} top={h - bottom - size * 0.55} />
        </>
      )}
      {children}
    </View>
  );
}
