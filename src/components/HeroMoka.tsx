import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, type ImageSourcePropType } from 'react-native';

import { HeroKey, heroDef, type HeroFx, type HeroMotion } from '@/domain/heroMoka';
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
function Particles({ fx, reduce }: { fx: HeroFx; reduce: boolean }) {
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
  const left = ['58%', '68%', '50%'] as const;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {vals.map((v, i) => (
        <Animated.Text
          key={i}
          style={{
            position: 'absolute', left: left[i], top: '58%', fontSize: 20 + i * 2,
            opacity: v.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 0.9, 0.5, 0] }),
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
  switch (m) {
    case 'breath': return { transform: [{ scale: I([1.03, 1.055]) }] };
    case 'bob': return { transform: [{ scale: 1.04 }, { translateY: I([2, -4]) }] };
    case 'sway': return { transform: [{ scale: 1.06 }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-1.2deg', '1.2deg'] }) }] };
    case 'zoom': return { transform: [{ scale: I([1.03, 1.1]) }, { translateX: I([-4, 4]) }] };
    case 'beat': return { transform: [{ scale: I([1.03, 1.075]) }] };
  }
}
const DUR: Record<HeroMotion, number> = { breath: 3000, bob: 1500, sway: 2200, zoom: 6500, beat: 700 };

/**
 * Ana ekranın en üstündeki Moka sahnesi: sahne değişince yumuşakça geçer, sahneye göre
 * farklı hareket (nefes, zıplama, sallanma, yaklaşma, kalp atışı) ve süs yükselir.
 * Dokununca `onTap` çağrılır (yeni sahne seçmek için).
 */
export function HeroMoka({ sceneKey, source, ratio, marginTop, onTap, children, overlay }: {
  sceneKey: HeroKey; source: ImageSourcePropType; ratio: number; marginTop: number; onTap: () => void;
  /** Sahnenin üstüne (yumuşak geçişin altına) çizilen ek katman, ör. koltuk Moka'sı. */
  overlay?: ReactNode; children?: ReactNode;
}) {
  const reduce = useReduceMotion();
  const def = heroDef(sceneKey);
  const [w, setW] = useState(0);
  const h = w ? Math.round(w / ratio) : 0;
  const [prev, setPrev] = useState<ImageSourcePropType | null>(null);
  const cur = useRef(source);
  const fade = useRef(new Animated.Value(1)).current;
  const m = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (cur.current === source) return;
    setPrev(cur.current);
    cur.current = source;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: reduce ? 1 : 650, useNativeDriver: true }).start(() => setPrev(null));
  }, [source, fade, reduce]);

  useEffect(() => {
    if (reduce) { m.setValue(0); return; }
    const d = DUR[def.motion];
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(m, { toValue: 1, duration: d, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(m, { toValue: 0, duration: d, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [def.motion, reduce, m]);

  const mStyle = useMemo(() => motionStyle(m, def.motion), [m, def.motion]);
  const img = { position: 'absolute' as const, left: 0, top: 0, width: w, height: h };

  return (
    <View onLayout={e => setW(Math.round(e.nativeEvent.layout.width))} style={{ alignSelf: 'stretch', height: h || undefined, aspectRatio: h ? undefined : ratio, overflow: 'hidden', marginTop }}>
      {w > 0 && h > 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, mStyle]}>
          {prev && <Animated.Image source={prev} style={[img, { opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]} resizeMode="cover" accessibilityIgnoresInvertColors />}
          <Animated.Image source={source} style={[img, { opacity: prev ? fade : 1 }]} resizeMode="cover" accessibilityIgnoresInvertColors />
          {overlay}
        </Animated.View>
      )}
      <Pressable style={StyleSheet.absoluteFill} onPress={onTap} accessibilityRole="button" accessibilityLabel="Moka'ya dokun, başka bir hâlini gör" />
      <Particles fx={def.fx} reduce={reduce} />
      {children}
    </View>
  );
}
