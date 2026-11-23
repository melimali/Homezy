import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';

import { useReduceMotion } from '@/components/motion';
import { RigBody, useSpeechMouth } from '@/components/MokaRig';
import type { RoomExpression } from '@/constants/room-expression';
import { COSMETIC, cosmeticOwned } from '@/domain/kozmetik';
import type { SkyKind } from '@/lib/weather';
import { useStore } from '@/store/AppStore';
import { useActive } from '@/hooks/useActive';

const sine = Easing.inOut(Easing.sin);
type RoomAction = 'yawn' | 'sip' | 'stretch' | 'around' | 'giggle' | 'shy' | 'celebrate' | 'coffee' | 'weather';
const ACTION_PRIORITY: Record<RoomAction, number> = {
  yawn: 0, sip: 0, stretch: 0, around: 0, weather: 1, giggle: 1, shy: 2, coffee: 3, celebrate: 4,
};

/** Odadaki yastığa oturan Moka. Nefes, duruş, konuşma ve boşta hareketler ortak rigi sürer. */
export function RoomMoka({ size, fur, mood, talking, thinking, celebrate = 0, weather, brew = 0, engaged = false, taps = 0 }: {
  size: number;
  fur?: string | null;
  mood: RoomExpression;
  talking: boolean;
  thinking: boolean;
  /** Her artışta kutlama: gururlu çift zıplama + yükselen kalpler. */ celebrate?: number;
  weather?: SkyKind;
  brew?: number;
  engaged?: boolean;
  taps?: number;
}) {
  const reduceM = useReduceMotion();
  const active = useActive();
  const run = !reduceM && active;
  const sleeping = mood === 'sleepy';
  const [breath] = useState(() => new Animated.Value(0));
  const [tilt] = useState(() => new Animated.Value(0));
  const [look] = useState(() => new Animated.Value(0));
  const [zs] = useState(() => [0, 1, 2].map(() => new Animated.Value(0)));
  const mouth = useSpeechMouth(run && talking);
  const [wink] = useState(() => new Animated.Value(0));
  // Boşta yaşam: esneme, yudumlama, gerinme, etrafa bakma. `act` sürerken yüz geçici değişir.
  const [act, setAct] = useState<RoomAction | null>(null);
  const [coffeeMood, setCoffeeMood] = useState<RoomExpression | null>(null);
  const [stretch] = useState(() => new Animated.Value(0));
  const [sip] = useState(() => new Animated.Value(0));
  const [giggle] = useState(() => new Animated.Value(0));
  const [wingCover] = useState(() => new Animated.Value(0));
  const [shake] = useState(() => new Animated.Value(0));
  const [drift] = useState(() => new Animated.Value(0.5));
  const [nod] = useState(() => new Animated.Value(0));
  const [pop] = useState(() => new Animated.Value(0));
  const [jump] = useState(() => new Animated.Value(0));
  const [hearts] = useState(() => [0, 1, 2, 3, 4, 5].map(() => new Animated.Value(0)));
  const actionRef = useRef<{ name: RoomAction; priority: number; token: number; animation?: Animated.CompositeAnimation; timers?: ReturnType<typeof setTimeout>[] } | null>(null);
  const actionToken = useRef(0);
  const base: RoomExpression = thinking && mood !== 'sad' && mood !== 'sleepy' ? 'thinking' : mood;
  const weatherMood: RoomExpression = weather === 'clear' ? 'wow'
    : weather === 'rain' || weather === 'storm' || weather === 'snow' || weather === 'fog' ? 'cozy'
      : 'curious';
  const faceOv: RoomExpression | null = act === 'yawn' ? 'wow'
    : act === 'coffee' ? coffeeMood ?? 'cheer'
      : act === 'sip' ? 'cozy'
      : act === 'stretch' ? 'cheer'
        : act === 'giggle' ? 'tickled'
          : act === 'shy' ? 'shy'
            : act === 'celebrate' ? 'proud'
              : act === 'weather' ? weatherMood
                : act === 'around' ? 'curious'
                : null;
  const shown: RoomExpression = faceOv && base !== 'sad' && base !== 'sleepy' ? faceOv : base;
  const { state } = useStore();
  const equipped = state.play.mokaWorn;
  const hand = equipped?.el ? COSMETIC[equipped.el] : undefined;
  const worn = equipped?.el && (hand?.slot !== 'el' || !cosmeticOwned(state.play.owned, hand))
    ? { ...equipped, el: undefined }
    : equipped;
  const hasCup = worn?.el === 'el_fincan';
  const [lag] = useState(() => new Animated.Value(0));
  const [wingV] = useState(() => new Animated.Value(0));
  const [tailV] = useState(() => new Animated.Value(0));

  const startAction = useCallback((name: RoomAction) => {
    if (!run || (name !== 'celebrate' && (talking || thinking || sleeping || mood === 'sad'))) return false;
    const priority = ACTION_PRIORITY[name];
    const current = actionRef.current;
    if (current && current.priority >= priority && !(name === 'giggle' && current.name === 'giggle')) return false;
    current?.animation?.stop();
    current?.timers?.forEach(clearTimeout);
    [stretch, sip, giggle, wingCover, shake, jump, ...hearts].forEach(v => v.setValue(0));
    const token = ++actionToken.current;
    setAct(name);
    setCoffeeMood(name === 'coffee' ? 'cheer' : null);
    const T = (v: Animated.Value, to: number, ms: number, easing = sine) => Animated.timing(v, { toValue: to, duration: ms, easing, useNativeDriver: true });
    let animation: Animated.CompositeAnimation;
    if (name === 'yawn') {
      animation = Animated.sequence([T(stretch, 1, 1050), Animated.delay(650), T(stretch, 0, 700)]);
    } else if (name === 'sip') {
      animation = Animated.sequence([T(sip, 1, 500), Animated.delay(500), T(sip, 0, 460), Animated.delay(320), T(sip, 0.65, 380), Animated.delay(250), T(sip, 0, 460)]);
    } else if (name === 'stretch') {
      animation = Animated.sequence([
        T(stretch, 1, 650, Easing.out(Easing.quad)),
        Animated.sequence([T(shake, 1, 70), T(shake, -1, 100), T(shake, 1, 100), T(shake, -0.6, 90), T(shake, 0, 90)]),
        Animated.delay(220), T(stretch, 0, 600),
      ]);
    } else if (name === 'around' || name === 'weather') {
      animation = name === 'weather'
        ? Animated.sequence([
          Animated.spring(look, { toValue: -0.8, friction: 7, tension: 45, useNativeDriver: true }),
          Animated.delay(850),
          Animated.spring(look, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
        ])
        : Animated.sequence([
          Animated.spring(look, { toValue: -1, friction: 7, tension: 45, useNativeDriver: true }), Animated.delay(900),
          Animated.spring(look, { toValue: 1, friction: 7, tension: 45, useNativeDriver: true }), Animated.delay(650),
          Animated.spring(look, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
        ]);
    } else if (name === 'giggle') {
      animation = Animated.sequence([
        Animated.parallel([T(giggle, 1, 110), T(shake, 1, 110)]),
        Animated.parallel([T(giggle, 0.25, 85), T(shake, -1, 95)]),
        Animated.parallel([T(giggle, 1, 95), T(shake, 0.7, 90)]),
        Animated.parallel([T(giggle, 0, 180), T(shake, 0, 150)]),
      ]);
    } else if (name === 'shy') {
      animation = Animated.sequence([
        Animated.parallel([Animated.spring(look, { toValue: -0.35, friction: 7, tension: 50, useNativeDriver: true }), T(stretch, 0.18, 250), T(wingCover, 1, 250)]),
        Animated.delay(520),
        Animated.parallel([Animated.spring(look, { toValue: 0, friction: 7, tension: 45, useNativeDriver: true }), T(stretch, 0, 280), T(wingCover, 0, 280)]),
      ]);
    } else if (name === 'coffee') {
      animation = Animated.sequence([
        T(stretch, 0.75, 520, Easing.out(Easing.quad)),
        Animated.parallel([T(sip, 0.55, 420), Animated.spring(look, { toValue: 0.12, friction: 7, tension: 45, useNativeDriver: true })]),
        T(sip, 1, 220), Animated.delay(380),
        Animated.parallel([T(sip, 0, 500), T(stretch, 0, 520), Animated.spring(look, { toValue: 0, friction: 7, tension: 45, useNativeDriver: true })]),
      ]);
    } else {
      const hops = Animated.sequence([
        T(jump, 1, 220, Easing.out(Easing.quad)), T(jump, 0, 190, Easing.in(Easing.quad)),
        T(jump, -0.4, 70), T(jump, 1, 210, Easing.out(Easing.quad)), T(jump, 0, 190, Easing.in(Easing.quad)),
        Animated.spring(jump, { toValue: 0, friction: 4, tension: 160, useNativeDriver: true }),
      ]);
      const heartsUp = Animated.stagger(90, hearts.map(h => Animated.timing(h, { toValue: 1, duration: 1050, easing: Easing.out(Easing.quad), useNativeDriver: true })));
      animation = Animated.parallel([hops, heartsUp]);
    }
    const timers = name === 'coffee' ? [
      setTimeout(() => { if (actionRef.current?.token === token) setCoffeeMood('cozy'); }, 520),
      setTimeout(() => { if (actionRef.current?.token === token) setCoffeeMood('content'); }, 1540),
    ] : [];
    actionRef.current = { name, priority, token, animation, timers };
    animation.start(({ finished }) => {
      if (!finished || actionRef.current?.token !== token) return;
      actionRef.current.timers?.forEach(clearTimeout);
      actionRef.current = null;
      setAct(null);
      setCoffeeMood(null);
      [stretch, sip, giggle, wingCover, shake, jump, ...hearts].forEach(v => v.setValue(0));
    });
    return true;
  }, [run, talking, thinking, sleeping, mood, stretch, sip, giggle, wingCover, shake, jump, hearts, look]);

  // Cut gestures short when motion is reduced or Moka falls asleep; never leave a pose stuck.
  useEffect(() => {
    const current = actionRef.current;
    if (!current || (run && (current.name === 'celebrate' || (!talking && !thinking && !engaged && !sleeping && mood !== 'sad')))) return;
    current.animation?.stop();
    current.timers?.forEach(clearTimeout);
    actionRef.current = null;
    setAct(null);
    setCoffeeMood(null);
    [stretch, sip, giggle, wingCover, shake, jump, ...hearts].forEach(v => v.setValue(0));
  }, [run, talking, thinking, engaged, sleeping, mood, stretch, sip, giggle, wingCover, shake, jump, hearts]);

  useEffect(() => () => {
    actionRef.current?.animation?.stop();
    actionRef.current?.timers?.forEach(clearTimeout);
    actionRef.current = null;
  }, []);

  const lastTaps = useRef(taps);
  const tapTimes = useRef<number[]>([]);
  useEffect(() => {
    const count = Number.isFinite(taps) ? taps : 0;
    const delta = count - lastTaps.current;
    lastTaps.current = count;
    if (delta <= 0) { if (delta < 0) tapTimes.current = []; return; }
    const now = Date.now();
    tapTimes.current = tapTimes.current.filter(t => now - t < 2500);
    for (let i = 0; i < Math.min(delta, 5); i++) tapTimes.current.push(now);
    if (tapTimes.current.length >= 5) {
      tapTimes.current = [];
      startAction('giggle');
    }
  }, [taps, startAction]);

  const lastBrew = useRef(brew);
  useEffect(() => {
    const next = Number.isFinite(brew) ? brew : 0;
    const previous = lastBrew.current;
    lastBrew.current = next;
    if (next > previous) startAction('coffee');
  }, [brew, startAction]);

  const wasShy = useRef(false);
  useEffect(() => {
    const previous = wasShy.current;
    wasShy.current = mood === 'shy';
    if (mood === 'shy' && !previous) startAction('shy');
  }, [mood, startAction]);

  const previousWeather = useRef(weather);
  useEffect(() => {
    const previous = previousWeather.current;
    previousWeather.current = weather;
    if (weather && previous !== weather && !engaged) startAction('weather');
  }, [weather, engaged, startAction]);

  // Şapka başı biraz geriden izler; kanat ve kuyruk yavaş salınır.
  useEffect(() => {
    if (!run) return;
    const lp = (v: Animated.Value, ms: number) => Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: ms, easing: sine, useNativeDriver: true }),
      Animated.timing(v, { toValue: -1, duration: ms, easing: sine, useNativeDriver: true }),
    ]));
    const an = [lp(wingV, 2600), lp(tailV, 1500)];
    an.forEach(x => x.start());
    const tm = setTimeout(() => { const l = lp(lag, 3100); l.start(); an.push(l); }, 170);
    return () => { clearTimeout(tm); an.forEach(x => x.stop()); };
  }, [run, lag, wingV, tailV]);

  // Göz kırpma: düzensiz aralık; hızlı, yavaş ya da çift. Konuşurken, uykuda ve sevinçte kırpmaz.
  useEffect(() => {
    if (!run || talking || shown === 'sleepy' || shown === 'cheer' || shown === 'proud') return;
    let t: ReturnType<typeof setTimeout>;
    let dead = false;
    let gesture: Animated.CompositeAnimation | undefined;
    const blink = (slow: boolean) => Animated.sequence([
      Animated.timing(wink, { toValue: 1, duration: slow ? 170 : 115, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.delay(slow ? 150 : 90),
      Animated.timing(wink, { toValue: 0, duration: slow ? 260 : 190, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]);
    const next = () => {
      if (dead) return;
      const r = Math.random();
      t = setTimeout(() => {
        gesture = r < 0.18 ? Animated.sequence([blink(false), Animated.delay(110), blink(false)]) : blink(r > 0.85);
        gesture.start(({ finished }) => { if (finished) next(); });
      }, 2500 + Math.random() * 4600);
    };
    next();
    return () => {
      dead = true;
      clearTimeout(t);
      gesture?.stop();
      wink.setValue(0);
    };
  }, [run, talking, shown, wink]);

  // Quiet idle gestures: one at a time, with longer pauses between them.
  useEffect(() => {
    if (!run || talking || thinking || engaged || sleeping || mood === 'sad' || mood === 'shy' || mood === 'cheer' || mood === 'wow') return;
    let dead = false;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      if (dead) return;
      t = setTimeout(() => {
        if (actionRef.current) { t = setTimeout(next, 1700); return; }
        const r = Math.random();
        const kind: RoomAction = r < 0.25 ? 'yawn' : hasCup && r < 0.48 ? 'sip' : r < 0.72 ? 'stretch' : 'around';
        startAction(kind);
        next();
      }, 7000 + Math.random() * 8000);
    };
    next();
    return () => {
      dead = true;
      clearTimeout(t);
    };
  }, [run, talking, thinking, engaged, sleeping, mood, hasCup, startAction]);

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
    if (!run || was === shown || act || (shown !== 'cheer' && shown !== 'wow' && shown !== 'happy' && shown !== 'proud' && shown !== 'playful' && shown !== 'tickled')) return;
    pop.setValue(1);
    Animated.spring(pop, { toValue: 0, friction: 3, tension: 120, useNativeDriver: true }).start();
  }, [shown, run, act, pop]);

  // Completion uses the same locked action path as other one-shots.
  const lastCel = useRef(celebrate);
  useEffect(() => {
    if (celebrate === lastCel.current) return;
    lastCel.current = celebrate;
    if (celebrate) startAction('celebrate');
  }, [celebrate, startAction]);

  // Nefes: her nefes biraz farklı uzunlukta; arada derin iç çekiş. Uykuda daha yavaş ve derin.
  const sleepRef = useRef(sleeping);
  useEffect(() => { sleepRef.current = sleeping; }, [sleeping]);
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
    if (act) return;
    if (!run || talking || thinking || sleeping) { look.setValue(0); return; }
    let current: Animated.CompositeAnimation | undefined;
    let dead = false;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      if (dead) return;
      t = setTimeout(() => {
        const to = (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 0.5);
        current = Animated.sequence([
          Animated.spring(look, { toValue: to, friction: 7, tension: 40, useNativeDriver: true }),
          Animated.delay(900 + Math.random() * 1600),
          Animated.spring(look, { toValue: 0, friction: 6, tension: 35, useNativeDriver: true }),
        ]);
        current.start(({ finished }) => { if (finished) next(); });
      }, 4000 + Math.random() * 5000);
    };
    next();
    return () => {
      dead = true;
      clearTimeout(t);
      current?.stop();
    };
  }, [run, talking, thinking, sleeping, act, look]);

  // Düşünürken baş yana eğilir; şaşkınken diğer yana kısa eğilme.
  useEffect(() => {
    const to = thinking ? 1 : shown === 'wow' ? -0.6 : shown === 'curious' ? -0.25 : 0;
    const a = Animated.spring(tilt, { toValue: run ? to : 0, friction: 6, tension: 60, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [thinking, shown, run, tilt]);

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
    mouth.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.004] }),
  ), Animated.add(Animated.add(
    stretch.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.022] }),
    sip.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.014] }),
  ), Animated.add(
    jump.interpolate({ inputRange: [-0.4, 0, 1], outputRange: [size * 0.012, 0, -size * 0.085] }),
    pop.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.025] }),
  )));
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
        <RigBody
          size={size} fur={fur} worn={worn} expression={shown} wingCover={wingCover}
          sway={Animated.multiply(units.interpolate({ inputRange: [-3, 3], outputRange: [-1, 1] }), 0.4)} lag={lag}
          wing={wingV} tail={tailV}
          blink={wink.interpolate({ inputRange: [0, 1], outputRange: [1, 0.07] })}
          look={look} mouth={act === 'yawn' ? Animated.multiply(stretch, 0.65) : act === 'giggle' ? Animated.multiply(giggle, 0.32) : act === 'coffee' ? Animated.multiply(sip, 0.12) : mouth} breath={breath} sleeping={sleeping}
        />
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
