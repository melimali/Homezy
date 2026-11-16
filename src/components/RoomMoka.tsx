import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';

import { useReduceMotion } from '@/components/motion';
import { seatedFor } from '@/constants/mimik';
import { useActive } from '@/hooks/useActive';

const sine = Easing.inOut(Easing.sin);

export type RoomMood = 'happy' | 'cheer' | 'wow' | 'sleepy' | 'neutral' | 'sad';
const MOODS: RoomMood[] = ['neutral', 'happy', 'cheer', 'wow', 'sad', 'sleepy'];

/**
 * Odada yastıkta oturan tam boy Moka (ayakları dahil), sohbetteki animasyonlu yüzle:
 * 8 mimik (`seatedFor(fur)`) üst üste durur; ruh hali değişince yüz yumuşakça geçer, 3-6 sn'de bir göz kırpar,
 * konuşurken ağzı doğal ritimle açılıp kapanır. Gövde: nefes (alttan sabit esneme), konuşurken sekme,
 * düşünürken baş eğme, uykuda yavaş nefes + süzülen "z"ler.
 * Resim 800×800; gövdenin altı tuvalin %96'sında, ortası %50'de: `size` kenar, `bottom` ayakların bastığı yer.
 */
export function RoomMoka({ size, fur, mood, talking, thinking, celebrate = 0 }: { size: number; fur?: string | null; mood: RoomMood; talking: boolean; thinking: boolean; /** Her artışta kutlama: çift zıplama + yükselen kalpler. */ celebrate?: number }) {
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
  // Boşta yaşam: esneme, yudumlama, gerinme, etrafa bakma. `act` sürerken yüz geçici değişir.
  const [act, setAct] = useState<'yawn' | 'sip' | 'stretch' | 'around' | null>(null);
  const [stretch] = useState(() => new Animated.Value(0));
  const [sip] = useState(() => new Animated.Value(0));
  const [shake] = useState(() => new Animated.Value(0));
  const [drift] = useState(() => new Animated.Value(0.5));
  const [nod] = useState(() => new Animated.Value(0));
  const [pop] = useState(() => new Animated.Value(0));
  const [jump] = useState(() => new Animated.Value(0));
  const [hearts] = useState(() => [0, 1, 2, 3, 4, 5].map(() => new Animated.Value(0)));
  const base: RoomMood = thinking && mood !== 'sad' && mood !== 'sleepy' ? 'neutral' : mood;
  const faceOv = act === 'yawn' ? 'wow' : act === 'sip' ? 'happy' : act === 'stretch' ? 'cheer' : null;
  const shown: RoomMood = faceOv && base === 'neutral' ? faceOv : base;
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


  // Boşta yaşam yönetmeni: 7-15 sn'de bir rastgele bir hareket.
  useEffect(() => {
    if (!run || talking || thinking || sleeping || mood === 'sad' || mood === 'cheer' || mood === 'wow') return;
    let dead = false;
    let t: ReturnType<typeof setTimeout>;
    let cur: Animated.CompositeAnimation | null = null;
    const T = (v: Animated.Value, to: number, ms: number, e = sine) => Animated.timing(v, { toValue: to, duration: ms, easing: e, useNativeDriver: true });
    const play = (kind: 'yawn' | 'sip' | 'stretch' | 'around') => {
      if (kind === 'yawn') return Animated.sequence([T(stretch, 1, 1100), Animated.delay(900), T(stretch, 0, 800)]);
      if (kind === 'sip') return Animated.sequence([T(sip, 1, 650), Animated.delay(800), T(sip, 0, 600), Animated.delay(500), T(sip, 0.7, 450), Animated.delay(400), T(sip, 0, 600)]);
      if (kind === 'stretch') return Animated.sequence([T(stretch, 1, 700, Easing.out(Easing.quad)), Animated.parallel([Animated.sequence([T(shake, 1, 70), T(shake, -1, 110), T(shake, 1, 110), T(shake, -0.6, 100), T(shake, 0, 90)])]), Animated.delay(250), T(stretch, 0, 700)]);
      return Animated.sequence([
        Animated.spring(look, { toValue: -1, friction: 7, tension: 45, useNativeDriver: true }), Animated.delay(900),
        Animated.spring(look, { toValue: 1, friction: 7, tension: 45, useNativeDriver: true }), Animated.delay(1000),
        Animated.spring(look, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
      ]);
    };
    const next = () => {
      if (dead) return;
      t = setTimeout(() => {
        const r = Math.random();
        const kind = r < 0.28 ? 'yawn' : r < 0.55 ? 'sip' : r < 0.78 ? 'stretch' : 'around';
        setAct(kind);
        cur = play(kind);
        cur.start(() => { if (dead) return; setAct(null); next(); });
      }, 7000 + Math.random() * 8000);
    };
    next();
    return () => {
      dead = true;
      clearTimeout(t);
      cur?.stop();
      setAct(null);
      [stretch, sip, shake].forEach(v => Animated.spring(v, { toValue: 0, friction: 7, tension: 50, useNativeDriver: true }).start());
    };
  }, [run, talking, thinking, sleeping, mood, stretch, sip, shake, look]);

  // Ağırlık kayması: çok yavaş sağa sola salınım (ikincil hareket).
  useEffect(() => {
    if (!run) return;
    const a = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 6800, easing: sine, useNativeDriver: true }),
      Animated.timing(drift, { toValue: 0, duration: 7600, easing: sine, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [run, drift]);

  // Uykuda yavaş baş sallama (uyuklama).
  useEffect(() => {
    if (!run || !sleeping) {
      Animated.spring(nod, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }).start();
      return;
    }
    const a = Animated.loop(Animated.sequence([
      Animated.timing(nod, { toValue: 1, duration: 3600, easing: sine, useNativeDriver: true }),
      Animated.delay(500),
      Animated.timing(nod, { toValue: 0.15, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(nod, { toValue: 0.7, duration: 1800, easing: sine, useNativeDriver: true }),
      Animated.timing(nod, { toValue: 0, duration: 2600, easing: sine, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [run, sleeping, nod]);

  // Ruh hali sevince ya da şaşırınca küçük "pop".
  const prevShown = useRef(shown);
  useEffect(() => {
    const was = prevShown.current;
    prevShown.current = shown;
    if (!run || was === shown || act || (shown !== 'cheer' && shown !== 'wow' && shown !== 'happy')) return;
    pop.setValue(1);
    Animated.spring(pop, { toValue: 0, friction: 3, tension: 120, useNativeDriver: true }).start();
  }, [shown, run, act, pop]);

  // Kutlama: çift zıplama (yere inince ezilir) + yükselen kalpler.
  const lastCel = useRef(celebrate);
  useEffect(() => {
    if (celebrate === lastCel.current) return;
    lastCel.current = celebrate;
    if (!run || !celebrate) return;
    const up = (ms: number) => Animated.timing(jump, { toValue: 1, duration: ms, easing: Easing.out(Easing.quad), useNativeDriver: true });
    const down = (ms: number) => Animated.timing(jump, { toValue: 0, duration: ms, easing: Easing.in(Easing.quad), useNativeDriver: true });
    jump.setValue(0);
    Animated.sequence([up(230), down(200), Animated.timing(jump, { toValue: -0.4, duration: 70, useNativeDriver: true }), up(210), down(190), Animated.spring(jump, { toValue: 0, friction: 4, tension: 160, useNativeDriver: true })]).start();
    hearts.forEach(h => h.setValue(0));
    Animated.stagger(110, hearts.map(h => Animated.timing(h, { toValue: 1, duration: 1700, easing: Easing.out(Easing.quad), useNativeDriver: true }))).start(() => hearts.forEach(h => h.setValue(0)));
  }, [celebrate, run, jump, hearts]);

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
  const st = stretch.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] });
  const sy = Animated.multiply(
    Animated.multiply(breath.interpolate({ inputRange: [0, 1], outputRange: [1, sleeping ? 1.03 : 1.018] }), st),
    Animated.multiply(pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }), jump.interpolate({ inputRange: [-0.4, 0, 1], outputRange: [0.93, 1, 1.03] })),
  );
  const sx = Animated.multiply(
    Animated.multiply(breath.interpolate({ inputRange: [0, 1], outputRange: [1, sleeping ? 1.012 : 1.006] }), stretch.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985] })),
    jump.interpolate({ inputRange: [-0.4, 0, 1], outputRange: [1.06, 1, 0.985] }),
  );
  const ty = Animated.add(Animated.add(
    breath.interpolate({ inputRange: [0, 1], outputRange: [0, -(size * 0.92) * (sleeping ? 0.015 : 0.009)] }),
    talk.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.022] }),
  ), Animated.add(Animated.add(
    stretch.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.022] }),
    sip.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.014] }),
  ), Animated.add(
    jump.interpolate({ inputRange: [-0.4, 0, 1], outputRange: [size * 0.012, 0, -size * 0.085] }),
    pop.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.025] }),
  )));
  const img = { position: 'absolute' as const, width: size, height: size };
  // Dönüş birimi: 1 birim = 4°. Baş eğme + bakış + uyuklama + ağırlık kayması + yudumlama.
  const units = Animated.add(Animated.add(tilt, Animated.multiply(look, 0.3)), Animated.add(
    Animated.add(nod.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }), drift.interpolate({ inputRange: [0, 1], outputRange: [-0.12, 0.12] })),
    Animated.add(sip.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] }), Animated.add(shake.interpolate({ inputRange: [-1, 1], outputRange: [-0.35, 0.35] }), stretch.interpolate({ inputRange: [0, 1], outputRange: [0, -0.3] }))),
  ));
  const rot = units.interpolate({ inputRange: [-3, 3], outputRange: ['-12deg', '12deg'] });
  const lx = Animated.add(
    look.interpolate({ inputRange: [-1, 1], outputRange: [-size * 0.012, size * 0.012] }),
    Animated.add(drift.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.004, size * 0.004] }), shake.interpolate({ inputRange: [-1, 1], outputRange: [-size * 0.006, size * 0.006] })),
  );
  const HEART = ['💖', '✨', '💛', '⭐', '💖', '🎉'];
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
      {hearts.map((h, i) => (
        <Animated.Text
          key={`h${i}`}
          style={{
            position: 'absolute', left: size * (0.28 + i * 0.09), top: size * 0.3, fontSize: size * (0.06 + (i % 3) * 0.012),
            opacity: h.interpolate({ inputRange: [0, 0.12, 0.7, 1], outputRange: [0, 1, 0.9, 0] }),
            transform: [
              { translateY: h.interpolate({ inputRange: [0, 1], outputRange: [0, -size * (0.2 + (i % 3) * 0.07)] }) },
              { translateX: h.interpolate({ inputRange: [0, 0.3, 0.6, 1], outputRange: [0, (i % 2 ? 1 : -1) * size * 0.03, (i % 2 ? -1 : 1) * size * 0.02, (i % 2 ? 1 : -1) * size * 0.04] }) },
              { scale: h.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.3, 1.15, 0.8] }) },
              { rotate: h.interpolate({ inputRange: [0, 1], outputRange: [`${(i % 2 ? 1 : -1) * 10}deg`, `${(i % 2 ? -1 : 1) * 14}deg`] }) },
            ],
          }}
        >
          {HEART[i]}
        </Animated.Text>
      ))}
      {sleeping && run && zs.map((v, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute', left: size * (0.66 + i * 0.05), top: size * 0.12,
            opacity: v.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.9, 0.7, 0] }),
            transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.22] }) }, { translateX: v.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, size * 0.025, size * 0.01, size * 0.045, size * 0.06] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '14deg'] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.25] }) }],
          }}
        >
          <Text style={{ fontFamily: 'Baloo2_700Bold', fontSize: size * (0.075 + i * 0.015), color: '#FFF6E6', textShadowColor: 'rgba(40,30,20,0.45)', textShadowRadius: 4 }}>z</Text>
        </Animated.View>
      ))}
    </View>
  );
}
