import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, View } from 'react-native';

import { useReduceMotion } from '@/components/motion';
import { MIMIK, type Mimik } from '@/constants/mimik';

/**
 * Mimikli canlı Moka. Duruşta nefes alır, tüyleri çok hafif kıpırdar, 3-6 sn'de bir göz kırpar.
 * `talking` iken ağzı açılıp kapanır (konuşan mimik ile `mood` arası). Hepsi `Animated` + native driver;
 * göz kırpma ve konuşma iki ayrı saydamlık değeri, görseller üst üste durur (yeniden çizim yok).
 */
export function MokaFace({ size, mood = 'happy', talking = false }: { size: number; mood?: Exclude<Mimik, 'wink' | 'talk'>; talking?: boolean }) {
  const reduce = useReduceMotion();
  const breath = useRef(new Animated.Value(0)).current;
  const fur = useRef(new Animated.Value(0)).current;
  const wink = useRef(new Animated.Value(0)).current;
  const talk = useRef(new Animated.Value(0)).current;
  const [base, setBase] = useState<Mimik>(mood);
  useEffect(() => setBase(mood), [mood]);

  // Nefes ve tüy salınımı.
  useEffect(() => {
    if (reduce) return;
    const loop = (v: Animated.Value, dur: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
    const a = loop(breath, 1800);
    const b = loop(fur, 2400);
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [reduce, breath, fur]);

  // Göz kırpma: rastgele 3-6 sn aralık, kısa. Konuşurken kırpmaz.
  useEffect(() => {
    if (reduce || talking || base === 'sleepy' || base === 'cheer') return;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      t = setTimeout(() => {
        Animated.sequence([
          Animated.timing(wink, { toValue: 1, duration: 70, useNativeDriver: true }),
          Animated.delay(110),
          Animated.timing(wink, { toValue: 0, duration: 90, useNativeDriver: true }),
        ]).start(next);
      }, 3000 + Math.random() * 3000);
    };
    next();
    return () => {
      clearTimeout(t);
      wink.setValue(0);
    };
  }, [reduce, talking, base, wink]);

  // Konuşma: ağız açık/kapalı.
  useEffect(() => {
    if (!talking) {
      talk.setValue(0);
      return;
    }
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(talk, { toValue: 1, duration: 140, useNativeDriver: true }),
        Animated.delay(90),
        Animated.timing(talk, { toValue: 0, duration: 140, useNativeDriver: true }),
        Animated.delay(60 + Math.random() * 120),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [talking, talk]);

  const img = { width: size, height: size, position: 'absolute' as const };
  const transform = [
    { translateY: breath.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.012] }) },
    { scaleY: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) },
    { scaleX: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 0.99] }) },
    { rotate: fur.interpolate({ inputRange: [0, 1], outputRange: ['-0.7deg', '0.7deg'] }) },
    { skewX: fur.interpolate({ inputRange: [0, 1], outputRange: ['0.4deg', '-0.4deg'] }) },
  ];
  return (
    <View style={{ width: size, height: size }} accessibilityIgnoresInvertColors>
      <Animated.View style={[{ width: size, height: size }, { transform }]}>
        <Image source={MIMIK[base]} style={img} resizeMode="contain" />
        <Animated.Image source={MIMIK.wink} style={[img, { opacity: wink }]} resizeMode="contain" />
        <Animated.Image source={MIMIK.talk} style={[img, { opacity: talk }]} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}

