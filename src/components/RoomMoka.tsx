import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';

import { useReduceMotion } from '@/components/motion';
import { seatedFor } from '@/constants/mimik';
import { useActive } from '@/hooks/useActive';

export type RoomMood = 'happy' | 'cheer' | 'wow' | 'sleepy' | 'neutral' | 'sad';
const MOODS: RoomMood[] = ['neutral', 'happy', 'cheer', 'wow', 'sad', 'sleepy'];

/**
 * Odada yastıkta oturan tam boy Moka (ayakları dahil), sohbetteki animasyonlu yüzle:
 * 8 mimik (`seatedFor(fur)`) üst üste durur; ruh hali değişince yüz yumuşakça geçer, 3-6 sn'de bir göz kırpar,
 * konuşurken ağzı doğal ritimle açılıp kapanır. Gövde: nefes (alttan sabit esneme), konuşurken sekme,
 * düşünürken baş eğme, uykuda yavaş nefes + süzülen "z"ler.
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
  const [look] = useState(() => new Animated.Value(0));
  const [dim] = useState(() => new Animated.Value(0));
  const [zs] = useState(() => [0, 1, 2].map(() => new Animated.Value(0)));
  const [mouth] = useState(() => new Animated.Value(0));
  const [wink] = useState(() => new Animated.Value(0));
  const shown: RoomMood = thinking && mood !== 'sad' && mood !== 'sleepy' ? 'neutral' : mood;
  const [fades] = useState(() => Object.fromEntries(MOODS.map(m => [m, new Animated.Value(m === shown ? 1 : 0)])) as Record<RoomMood, Animated.Value>);
  const F = seatedFor(fur);

  // Yüz geçişi: hedef mimik açılır, diğerleri kapanır.
  useEffect(() => {
    const a = Animated.parallel(MOODS.map(m => Animated.timing(fades[m], { toValue: m === shown ? 1 : 0, duration: reduceM ? 0 : 320, easing: Easing.inOut(Easing.quad), useNativeDriver: true })));
    a.start();
    return () => a.stop();
  }, [shown, fades, reduceM]);

  // Göz kırpma: düzensiz aralık; hızlı, yavaş ya da çift. Konuşurken, uykuda ve sevinçte kırpmaz.
  useEffect(() => {
    if (!run || talking || shown === 'sleepy' || shown === 'cheer') return;
    let t: ReturnType<typeof setTimeout>;
    let dead = false;
    const blink = (slow: boolean) => Animated.sequence([
      Animated.timing(wink, { toValue: 1, duration: slow ? 130 : 65, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.delay(slow ? 220 : 90),
      Animated.timing(wink, { toValue: 0, duration: slow ? 170 : 95, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]);
    const next = () => {
      if (dead) return;
      const r = Math.random();
      t = setTimeout(() => (r < 0.18 ? Animated.sequence([blink(false), Animated.delay(110), blink(false)]) : blink(r > 0.85)).start(next), 2400 + Math.random() * 4600);
    };
    next();
    return () => {
      dead = true;
      clearTimeout(t);
      wink.stopAnimation();
      wink.setValue(0);
    };
  }, [run, talking, shown, wink]);

  // Konuşurken ağız: heceler farklı açıklıkta (ince "i" ile geniş "a" arası), kelime aralarında kısa duraklama.
  useEffect(() => {
    if (!talking) {
      mouth.stopAnimation();
      mouth.setValue(0);
      return;
    }
    let stop = false;
    let t: ReturnType<typeof setTimeout>;
    let n = 0;
    const step = () => {
      if (stop) return;
      n += 1;
      const open = 0.55 + Math.random() * 0.45;
      const ms = 85 + Math.random() * 80;
      Animated.sequence([
        Animated.timing(mouth, { toValue: open, duration: ms, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.delay(20 + Math.random() * 50),
        Animated.timing(mouth, { toValue: 0, duration: ms * 0.9, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start(() => {
        if (stop) return;
        // 2-4 hecede bir kelime sonu: biraz daha uzun kapalı kalır.
        t = setTimeout(step, n % (2 + Math.floor(Math.random() * 3)) === 0 ? 140 + Math.random() * 120 : 25 + Math.random() * 90);
      });
    };
    step();
    return () => {
      stop = true;
      clearTimeout(t);
      mouth.stopAnimation();
    };
  }, [talking, mouth]);

  // Nefes: her nefes biraz farklı uzunlukta; arada derin iç çekiş. Uykuda daha yavaş ve derin.
  const sleepRef = useRef(sleeping);
  sleepRef.current = sleeping;
  useEffect(() => {
    if (!run) return;
    let dead = false;
    const cycle = () => {
      if (dead) return;
      const base = sleepRef.current ? 2600 : 1900;
      const sigh = !sleepRef.current && Math.random() < 0.12;
      const inMs = base * (0.85 + Math.random() * 0.3) * (sigh ? 1.4 : 1);
      Animated.sequence([
        Animated.timing(breath, { toValue: sigh ? 1.35 : 1, duration: inMs, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: inMs * (sigh ? 1.3 : 1.05), easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]).start(cycle);
    };
    cycle();
    return () => {
      dead = true;
      breath.stopAnimation();
    };
  }, [run, breath]);

  // Boşta küçük baş çevirmeleri: 4-9 sn'de bir birkaç derece eğilir, yaylanarak geri gelir. Uykuda ve konuşurken durur.
  useEffect(() => {
    if (!run || talking || thinking || sleeping) return;
    let dead = false;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      if (dead) return;
      t = setTimeout(() => {
        const to = (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 0.5);
        Animated.sequence([
          Animated.spring(look, { toValue: to, friction: 7, tension: 40, useNativeDriver: true }),
          Animated.delay(900 + Math.random() * 1600),
          Animated.spring(look, { toValue: 0, friction: 6, tension: 35, useNativeDriver: true }),
        ]).start(next);
      }, 4000 + Math.random() * 5000);
    };
    next();
    return () => {
      dead = true;
      clearTimeout(t);
      Animated.spring(look, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }).start();
    };
  }, [run, talking, thinking, sleeping, look]);

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

  // Alttan sabit esneme: ölçek merkezden olduğu için yükseklik farkının yarısı kadar aşağı kaydırılır.
  const sy = breath.interpolate({ inputRange: [0, 1], outputRange: [1, sleeping ? 1.03 : 1.018] });
  const sx = breath.interpolate({ inputRange: [0, 1], outputRange: [1, sleeping ? 1.012 : 1.006] });
  const ty = Animated.add(
    breath.interpolate({ inputRange: [0, 1], outputRange: [0, -(size * 0.92) * (sleeping ? 0.015 : 0.009)] }),
    talk.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.022] }),
  );
  const img = { position: 'absolute' as const, width: size, height: size };
  const rot = Animated.add(tilt, Animated.multiply(look, 0.3)).interpolate({ inputRange: [-1.3, 1.3], outputRange: ['-5.2deg', '5.2deg'] });
  const lx = look.interpolate({ inputRange: [-1, 1], outputRange: [-size * 0.006, size * 0.006] });
  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Animated.View style={{ width: size, height: size, transform: [{ translateY: size * 0.4 }, { rotate: rot }, { translateY: -size * 0.4 }, { translateX: lx }, { translateY: ty }, { scaleX: sx }, { scaleY: sy }] }}>
        {MOODS.map(m => (
          <Animated.Image key={m} source={F[m]} style={[img, { opacity: fades[m] }]} resizeMode="contain" accessibilityIgnoresInvertColors />
        ))}
        <Animated.Image source={F.wink} style={[img, { opacity: wink }]} resizeMode="contain" />
        <Animated.Image source={F.talk} style={[img, { opacity: mouth }]} resizeMode="contain" />
        <Animated.Image source={F[shown]} style={[img, { tintColor: '#2A2440', opacity: Animated.multiply(dim, 0.16) }]} resizeMode="contain" />
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
