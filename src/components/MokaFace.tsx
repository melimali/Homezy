import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

import { useReduceMotion } from '@/components/motion';
import { useActive } from '@/hooks/useActive';
import { MIMIK, type Mimik } from '@/constants/mimik';

export type FaceMood = Exclude<Mimik, 'wink' | 'talk'>;
const MOODS: FaceMood[] = ['neutral', 'happy', 'cheer', 'wow', 'sad', 'sleepy'];

/**
 * Mimikli canlı Moka (sohbet). Hepsi `Animated` + native driver.
 * - Mimikler sert değişmez: altı görsel üst üste durur, hedefin saydamlığı yumuşakça açılır (çapraz geçiş).
 * - Duruşta nefes alır, tüyleri kıpırdar, 3-6 sn'de bir göz kırpar; ara sıra başını yana eğer ya da küçük zıplar.
 * - `thinking`: başı yavaşça yana sallanır, nötr yüz (cevap beklerken).
 * - `talking`: ağzı doğal ritimle açılır, gövdesi hafifçe sekerek konuşur.
 * - `pop` değeri artınca (yeni cevap) tepki zıplaması yapar; üzgünse zıplamaz, hafifçe çöker.
 * "Hareketi azalt" açıksa döngüler durur, sadece mimik geçişi kalır.
 */
export function MokaFace({ size, mood = 'happy', talking = false, thinking = false, pop = 0 }: { size: number; mood?: FaceMood; talking?: boolean; thinking?: boolean; pop?: number }) {
  const reduceM = useReduceMotion();
  const active = useActive();
  // Ekran odakta değilse ya da uygulama arka plandaysa döngüler durur.
  const reduce = reduceM || !active;
  const [breath] = useState(() => new Animated.Value(0));
  const [fur] = useState(() => new Animated.Value(0));
  const [wink] = useState(() => new Animated.Value(0));
  const [talk] = useState(() => new Animated.Value(0));
  const [bob] = useState(() => new Animated.Value(0));
  const [tilt] = useState(() => new Animated.Value(0)); // -1..1 baş eğme
  const [hop] = useState(() => new Animated.Value(0)); // 0..1 zıplama
  const [sink] = useState(() => new Animated.Value(0)); // üzgün çökme
  const [fades] = useState(() => Object.fromEntries(MOODS.map(m => [m, new Animated.Value(m === mood ? 1 : 0)])) as Record<FaceMood, Animated.Value>);
  const shown: FaceMood = thinking && mood !== 'sad' && mood !== 'sleepy' ? 'neutral' : mood;

  // Çapraz geçiş: hedef açılır, diğerleri kapanır.
  useEffect(() => {
    const a = Animated.parallel(MOODS.map(m => Animated.timing(fades[m], { toValue: m === shown ? 1 : 0, duration: reduce ? 0 : 320, easing: Easing.inOut(Easing.quad), useNativeDriver: true })));
    a.start();
    return () => a.stop();
  }, [shown, fades, reduce]);

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

  // Göz kırpma: rastgele 3-6 sn aralık; ara sıra çift kırpar. Konuşurken kırpmaz.
  useEffect(() => {
    if (reduce || talking || shown === 'sleepy' || shown === 'cheer') return;
    let t: ReturnType<typeof setTimeout>;
    const blink = () =>
      Animated.sequence([
        Animated.timing(wink, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.delay(100),
        Animated.timing(wink, { toValue: 0, duration: 90, useNativeDriver: true }),
      ]);
    const next = () => {
      t = setTimeout(() => {
        const dbl = Math.random() < 0.2;
        (dbl ? Animated.sequence([blink(), Animated.delay(120), blink()]) : blink()).start(next);
      }, 3000 + Math.random() * 3000);
    };
    next();
    return () => {
      clearTimeout(t);
      wink.setValue(0);
    };
  }, [reduce, talking, shown, wink]);

  // Konuşma: ağız her seferinde biraz farklı ritimle açılır; gövde de ritme göre sekmeli.
  useEffect(() => {
    if (!talking) {
      talk.setValue(0);
      Animated.timing(bob, { toValue: 0, duration: 160, useNativeDriver: true }).start();
      return;
    }
    let stop = false;
    const step = () => {
      if (stop) return;
      const open = 110 + Math.random() * 90;
      Animated.parallel([
        Animated.sequence([
          Animated.timing(talk, { toValue: 1, duration: open, useNativeDriver: true }),
          Animated.delay(40 + Math.random() * 60),
          Animated.timing(talk, { toValue: 0, duration: open, useNativeDriver: true }),
        ]),
        reduce ? Animated.delay(0) : Animated.timing(bob, { toValue: Math.random() < 0.5 ? 1 : 0.55, duration: open * 2, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start(() => setTimeout(step, 30 + Math.random() * 220));
    };
    step();
    return () => {
      stop = true;
    };
  }, [talking, talk, bob, reduce]);

  // Düşünme: başı yavaşça yana sallar. Bitince nazikçe düzelir.
  useEffect(() => {
    if (reduce || !thinking) return;
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(tilt, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.delay(400),
        Animated.timing(tilt, { toValue: -0.4, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.delay(300),
      ]),
    );
    a.start();
    return () => {
      a.stop();
      Animated.spring(tilt, { toValue: 0, friction: 6, tension: 60, useNativeDriver: true }).start();
    };
  }, [thinking, reduce, tilt]);

  // Boşta çeşitleme: arada başını eğer ya da minik zıplar.
  const idle = !talking && !thinking;
  useEffect(() => {
    if (reduce || !idle) return;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      t = setTimeout(() => {
        if (Math.random() < 0.6) {
          const to = Math.random() < 0.5 ? 0.8 : -0.8;
          Animated.sequence([
            Animated.timing(tilt, { toValue: to, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.delay(900 + Math.random() * 600),
            Animated.spring(tilt, { toValue: 0, friction: 6, tension: 60, useNativeDriver: true }),
          ]).start(next);
        } else {
          Animated.sequence([
            Animated.timing(hop, { toValue: 0.5, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.spring(hop, { toValue: 0, friction: 4, tension: 120, useNativeDriver: true }),
          ]).start(next);
        }
      }, 6000 + Math.random() * 6000);
    };
    next();
    return () => clearTimeout(t);
  }, [idle, reduce, tilt, hop]);

  // Yeni cevap: tepki. Üzgünse çökme, diğerlerinde zıplama.
  const firstPop = useRef(pop);
  useEffect(() => {
    if (pop === firstPop.current || reduce) return;
    if (mood === 'sad') {
      Animated.sequence([
        Animated.timing(sink, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.delay(900),
        Animated.spring(sink, { toValue: 0, friction: 6, tension: 50, useNativeDriver: true }),
      ]).start();
    } else {
      const h = mood === 'cheer' || mood === 'wow' ? 1 : 0.6;
      Animated.sequence([
        Animated.timing(hop, { toValue: h, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(hop, { toValue: 0, friction: 3.5, tension: 130, useNativeDriver: true }),
      ]).start();
    }
  }, [pop]); // eslint-disable-line react-hooks/exhaustive-deps

  const img = { width: size, height: size, position: 'absolute' as const };
  const transform = [
    { translateY: Animated.add(Animated.add(breath.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.012] }), hop.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.14] })), Animated.add(bob.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.02] }), sink.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.03] }))) },
    { scaleY: Animated.multiply(breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }), Animated.add(hop.interpolate({ inputRange: [0, 1], outputRange: [0, 0.05] }), sink.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] }))) },
    { scaleX: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 0.99] }) },
    { rotate: Animated.add(fur.interpolate({ inputRange: [0, 1], outputRange: [-0.7, 0.7] }), tilt.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] })).interpolate({ inputRange: [-10, 10], outputRange: ['-10deg', '10deg'] }) },
  ];
  return (
    <View style={{ width: size, height: size }} accessibilityIgnoresInvertColors>
      <Animated.View style={[{ width: size, height: size }, { transform }]}>
        {MOODS.map(m => (
          <Animated.Image key={m} source={MIMIK[m]} style={[img, { opacity: fades[m] }]} resizeMode="contain" />
        ))}
        <Animated.Image source={MIMIK.wink} style={[img, { opacity: wink }]} resizeMode="contain" />
        <Animated.Image source={MIMIK.talk} style={[img, { opacity: talk }]} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}
