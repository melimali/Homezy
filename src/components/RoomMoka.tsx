import { useEffect, useState } from 'react';
import { Animated, Easing, Text, View, type ImageSourcePropType } from 'react-native';

import { furSource } from '@/components/MokaAcc';
import { useReduceMotion } from '@/components/motion';
import { useActive } from '@/hooks/useActive';

/** Yastıkta oturan tam boy Moka (orman yeşili). Kürk renkleri `FUR_ASSETS[ton].home_seated`. */
const SEATED = require('../../assets/moka/moka_home_seated.webp') as ImageSourcePropType;

export type RoomMood = 'happy' | 'cheer' | 'wow' | 'sleepy' | 'neutral' | 'sad';

/**
 * Odada yastıkta oturan tam boy Moka (ayakları dahil). Resim tek (`moka_home_seated`, kürk rengine göre),
 * canlılık gövde hareketinden gelir: nefes (alttan sabit esneme), konuşurken sekme, düşünürken baş eğme,
 * uykuda yavaş nefes + süzülen "z"ler, sevinçte zıplama (dışarıdan `hop`).
 * Melih'in oturan poz ve yüz görselleri gelince (docs/moka-oda-son-plan.md, P3) bu bileşenin içi değişir.
 * Resim 800×800; gövdenin altı tuvalin %96'sında, ortası %50'de: `size` kenar, `bottom` ayakların bastığı yer.
 */
export function RoomMoka({ size, fur, mood, talking, thinking }: { size: number; fur?: string | null; mood: RoomMood; talking: boolean; thinking: boolean }) {
  const reduceM = useReduceMotion();
  const active = useActive();
  const run = !reduceM && active;
  const sleeping = mood === 'sleepy';
  const [breath] = useState(() => new Animated.Value(0));
  const [talk] = useState(() => new Animated.Value(0));
  const [tilt] = useState(() => new Animated.Value(0));
  const [dim] = useState(() => new Animated.Value(0));
  const [zs] = useState(() => [0, 1, 2].map(() => new Animated.Value(0)));

  // Nefes: uykuda daha yavaş ve derin.
  useEffect(() => {
    if (!run) return;
    const ms = sleeping ? 2600 : 1900;
    const a = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breath, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [run, sleeping, breath]);

  // Konuşma: hafif ritmik sekme.
  useEffect(() => {
    if (!run || !talking) {
      talk.setValue(0);
      return;
    }
    const a = Animated.loop(Animated.sequence([
      Animated.timing(talk, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(talk, { toValue: 0, duration: 170, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.delay(60),
    ]));
    a.start();
    return () => a.stop();
  }, [run, talking, talk]);

  // Düşünürken baş yana eğilir; şaşkınken diğer yana kısa eğilme.
  useEffect(() => {
    const to = thinking ? 1 : mood === 'wow' ? -0.6 : 0;
    const a = Animated.spring(tilt, { toValue: run ? to : 0, friction: 6, tension: 60, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [thinking, mood, run, tilt]);

  // Uykuda ve üzgünken biraz loş.
  useEffect(() => {
    const a = Animated.timing(dim, { toValue: sleeping ? 1 : mood === 'sad' ? 0.6 : 0, duration: 500, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [sleeping, mood, dim]);

  // Uykuda süzülen z'ler.
  useEffect(() => {
    if (!run || !sleeping) return;
    const anims = zs.map((v, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 900),
      Animated.timing(v, { toValue: 1, duration: 2700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])));
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, [run, sleeping, zs]);

  const src = furSource(fur, 'home_seated', SEATED);
  // Alttan sabit esneme: ölçek merkezden olduğu için yükseklik farkının yarısı kadar aşağı kaydırılır.
  const sy = breath.interpolate({ inputRange: [0, 1], outputRange: [1, sleeping ? 1.03 : 1.018] });
  const sx = breath.interpolate({ inputRange: [0, 1], outputRange: [1, sleeping ? 1.012 : 1.006] });
  const ty = Animated.add(
    breath.interpolate({ inputRange: [0, 1], outputRange: [0, -(size * 0.92) * (sleeping ? 0.015 : 0.009)] }),
    talk.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.022] }),
  );
  const rot = tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-4deg', '4deg'] });
  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Animated.View style={{ width: size, height: size, transform: [{ translateY: size * 0.4 }, { rotate: rot }, { translateY: -size * 0.4 }, { translateY: ty }, { scaleX: sx }, { scaleY: sy }] }}>
        <Animated.Image source={src} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors />
        <Animated.Image source={src} style={{ position: 'absolute', width: size, height: size, tintColor: '#2A2440', opacity: Animated.multiply(dim, 0.16) }} resizeMode="contain" />
      </Animated.View>
      {sleeping && run && zs.map((v, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute', left: size * (0.66 + i * 0.05), top: size * 0.12,
            opacity: v.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.9, 0.7, 0] }),
            transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.22] }) }, { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.06] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.25] }) }],
          }}
        >
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: size * (0.075 + i * 0.015), color: '#FFF6E6', textShadowColor: 'rgba(40,30,20,0.45)', textShadowRadius: 4 }}>z</Text>
        </Animated.View>
      ))}
    </View>
  );
}
