/* eslint-disable react-hooks/immutability -- oyun durumu kare kare ref/Animated değerleriyle değişir, React render akışı dışındadır */
import { requireOptionalNativeModule } from 'expo-modules-core';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { MokaSprite, type SpriteMood } from '@/components/MokaSprite';
import { Btn, T } from '@/components/ui';
import { flap, GAP, GROUND, H, MX, newFlap, night, PIPE_W, pipeDy, step, W, type Flap } from '@/domain/flap';
import { useActive } from '@/hooks/useActive';
import { radius } from '@/theme';

function buzz() {
  if (Platform.OS === 'web' || !requireOptionalNativeModule('ExpoHaptics')) return;
  try {
    const h = require('expo-haptics') as typeof import('expo-haptics'); // eslint-disable-line @typescript-eslint/no-require-imports
    void h.impactAsync(h.ImpactFeedbackStyle.Light);
  } catch { /* titreşim yoksa sessiz geç */ }
}

// Oyun sahnesi renkleri; tema renkleri değil, sahne resmi.
const CUP = '#F4E7D8', CUP_SHADE = '#E2CFBC', RIM = '#BFA89E', RIM_DARK = '#8B786D';
const FAR = '#A9D3C0', NEAR = '#86BD9B', GRASS = '#7FB98F', GROUND_C = '#C9A27E', STRIPE = '#B88F6C';
const STARS = [[24, 30], [90, 70], [150, 24], [210, 90], [60, 130]] as const;
const CLOUDS = [[10, 40, 1], [150, 95, 0.7], [290, 25, 0.85]] as const;
const CLOUD_SPAN = W + 120;
const SPRITE = 30; // Moka çizim boyutu (çarpışma yarıçapı MR ile orantılı)
const CAP_H = 16;
const PARTS = ['✨', '⭐', '🪶', '💨', '✨', '⭐', '🪶', '💨'];

type PipeView = { id: number; gap: number; moving: boolean };
type Slot = { x: Animated.Value; y: Animated.Value; o: Animated.Value; px: number; py: number; vx: number; vy: number; life: number; max: number };

const mod = (a: number, n: number) => ((a % n) + n) % n;
const nd = { useNativeDriver: true } as const;

const Hills = memo(function Hills({ tx, color, h, r, w, hi }: { tx: Animated.Value; color: string; h: number; r: number; w: number; hi: string }) {
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, bottom: GROUND - 6, width: w * 3, height: h, flexDirection: 'row', transform: [{ translateX: tx }] }}>
      {[0, 1, 2].map(i => (
        <View key={i} style={{ width: w, height: h * 2, marginTop: h * 0.4, backgroundColor: color, borderTopLeftRadius: r, borderTopRightRadius: r, borderTopWidth: 3, borderTopColor: hi }} />
      ))}
    </Animated.View>
  );
});

const EXT = 60; // hareketli boru kayınca boşluk görünmesin diye gövde uzatılır
const PipeShape = memo(function PipeShape({ gap, tx, ty }: { gap: number; tx: Animated.Value; ty: Animated.Value }) {
  const botTop = gap + GAP;
  const botH = H - GROUND - botTop + 6 + EXT;
  const body = { position: 'absolute' as const, left: 0, width: PIPE_W, backgroundColor: CUP, borderLeftWidth: 3, borderRightWidth: 3, borderColor: RIM };
  const cap = { position: 'absolute' as const, left: -5, width: PIPE_W + 10, height: CAP_H, borderRadius: 8, backgroundColor: RIM, borderWidth: 3, borderColor: RIM_DARK };
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: PIPE_W, height: H, transform: [{ translateX: tx }, { translateY: ty }] }}>
      <View style={[body, { top: -EXT, height: gap - CAP_H + 2 + EXT }]}>
        <View style={styles.shine} />
        <View style={styles.shade} />
      </View>
      <View style={[cap, { top: gap - CAP_H }]} />
      <View style={[cap, { top: botTop }]} />
      <View style={[body, { top: botTop + CAP_H - 2, height: botH }]}>
        <View style={styles.shine} />
        <View style={styles.shade} />
      </View>
    </Animated.View>
  );
});

function useFrame(cb: (dt: number) => void, on: boolean) {
  const ref = useRef(cb);
  useEffect(() => { ref.current = cb; });
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      const dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
      last = t;
      ref.current(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [on]);
}

/** Moka Uçuş: dokununca Moka kanat çırpar; kahve fincanı sütunlarının arasından geç. Puan / XP yok.
 * Oyun durumu ref'te; kare başına React render'ı yok, her şey native sürücülü Animated değerleriyle çizilir. */
export function MokaFlap({ best, onOver }: { best: number; onOver: (score: number) => void }) {
  const { width } = useWindowDimensions();
  const active = useActive();
  const scale = Math.min(1, Math.max(0.6, (width - 64) / W));

  const g = useRef<Flap>(newFlap());
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [pipes, setPipes] = useState<PipeView[]>([]);
  const [mood, setMood] = useState<SpriteMood>('happy');
  const done = useRef(false);
  const overRef = useRef(onOver);
  useEffect(() => { overRef.current = onOver; }, [onOver]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const clock = useRef(0);
  const shake = useRef(0);
  const lastNt = useRef(-1);
  const lastTilt = useRef(0);
  const pipeKey = useRef('');

  const v = useMemo(() => ({
    y: new Animated.Value(H / 2 - SPRITE / 2), tilt: new Animated.Value(0), sy: new Animated.Value(1),
    clouds: new Animated.Value(0), far: new Animated.Value(0), near: new Animated.Value(0), ground: new Animated.Value(0),
    nt: new Animated.Value(0), shake: new Animated.Value(0), flash: new Animated.Value(0), bump: new Animated.Value(1),
    pipeX: new Map<number, Animated.Value>(), pipeY: new Map<number, Animated.Value>(), zero: new Animated.Value(0),
  }), []);
  const slots = useMemo<Slot[]>(() => PARTS.map(() => ({ x: new Animated.Value(-50), y: new Animated.Value(-50), o: new Animated.Value(0), px: 0, py: 0, vx: 0, vy: 0, life: 0, max: 1 })), []);
  const slotAt = useRef(0);
  const pipeVal = useCallback((id: number, x: number) => {
    let a = v.pipeX.get(id);
    if (!a) { a = new Animated.Value(x); v.pipeX.set(id, a); }
    return a;
  }, [v]);

  const burst = useCallback((x: number, y: number, n: number, spd: number) => {
    for (let i = 0; i < n; i++) {
      const s = slots[slotAt.current++ % slots.length];
      const a = Math.random() * Math.PI * 2;
      const sp = spd * (0.4 + Math.random() * 0.6);
      s.px = x; s.py = y; s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp;
      s.life = s.max = 0.5 + Math.random() * 0.3;
      s.x.setValue(x); s.y.setValue(y); s.o.setValue(1);
    }
  }, [slots]);

  const syncPipes = useCallback((list: Flap['pipes']) => {
    const key = list.map(p => p.id).join(',');
    if (key === pipeKey.current) return;
    pipeKey.current = key;
    const ids = new Set(list.map(p => p.id));
    v.pipeX.forEach((_, id) => { if (!ids.has(id)) { v.pipeX.delete(id); v.pipeY.delete(id); } });
    list.forEach(p => { pipeVal(p.id, p.x); if (p.amp && !v.pipeY.has(p.id)) v.pipeY.set(p.id, new Animated.Value(pipeDy(p))); });
    setPipes(list.map(p => ({ id: p.id, gap: p.gap, moving: p.amp > 0 })));
  }, [v, pipeVal]);

  const endGame = (sc: number, y: number) => {
    burst(MX, y, 9, 170);
    shake.current = 0.3;
    setMood('sleepy');
    v.flash.setValue(0.55);
    Animated.timing(v.flash, { toValue: 0, duration: 380, ...nd }).start();
    if (!done.current) {
      done.current = true;
      timers.current.push(setTimeout(() => overRef.current(sc), 900)); // ölümü görsün
    }
  };

  useFrame(dt => {
    clock.current += dt;
    const cur = g.current;
    if (cur.started && !cur.over) {
      const n = step(cur, dt);
      g.current = n;
      if (n.score > cur.score) {
        setScore(n.score);
        burst(MX, n.y, 6, 90);
        v.bump.setValue(1.5);
        Animated.spring(v.bump, { toValue: 1, friction: 4, tension: 160, ...nd }).start();
      }
      syncPipes(n.pipes);
      for (const p of n.pipes) { v.pipeX.get(p.id)?.setValue(p.x); if (p.amp) v.pipeY.get(p.id)?.setValue(pipeDy(p)); }
      if (n.over) endGame(n.score, n.y);
    }
    const s = g.current;
    const idle = !s.started ? Math.sin(clock.current * 4) * 6 : 0;
    v.y.setValue(s.y + idle - SPRITE / 2);
    const tl = Math.round(Math.max(-25, Math.min(70, s.vy / 8)));
    if (tl !== lastTilt.current) { lastTilt.current = tl; v.tilt.setValue(tl); }
    v.clouds.setValue(-mod(s.dist * 0.12, CLOUD_SPAN));
    v.far.setValue(-mod(s.dist * 0.15, 260));
    v.near.setValue(-mod(s.dist * 0.35, 180));
    v.ground.setValue(-mod(s.dist, 44));
    const nt = night(s.score, s.dist);
    if (Math.abs(nt - lastNt.current) > 0.01) { lastNt.current = nt; v.nt.setValue(nt); }
    for (const p of slots) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.o.setValue(0); continue; }
      p.vy += 260 * dt;
      p.px += p.vx * dt; p.py += p.vy * dt;
      p.x.setValue(p.px); p.y.setValue(p.py);
      p.o.setValue(Math.min(1, (p.life / p.max) * 2.5));
    }
    if (shake.current > 0) { shake.current -= dt; v.shake.setValue(shake.current > 0 ? Math.sin(clock.current * 90) * 4 : 0); }
  }, active);

  const tap = useCallback(() => {
    if (g.current.over) return;
    const n = flap(g.current);
    g.current = n;
    setStarted(true);
    syncPipes(n.pipes);
    setMood('party');
    timers.current.push(setTimeout(() => { if (!g.current.over) setMood('happy'); }, 180));
    v.sy.setValue(0.8);
    Animated.spring(v.sy, { toValue: 1, friction: 3, tension: 220, ...nd }).start();
    burst(MX - 14, n.y + 8, 2, 60);
    buzz();
  }, [v, burst, syncPipes]);

  const tiltDeg = v.tilt.interpolate({ inputRange: [-30, 80], outputRange: ['-30deg', '80deg'] });
  const dayOp = v.nt.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const veil = v.nt.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });
  const starOp = v.nt.interpolate({ inputRange: [0.3, 1], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <View style={{ gap: 8, alignItems: 'center' }}>
      <View style={[styles.top, { width: W * scale }]}>
        <T v="bold">Skor: {score}</T>
        <T v="small">En iyi: {Math.max(best, score)}</T>
      </View>
      <View style={{ width: W * scale, height: H * scale, borderRadius: radius.tile, overflow: 'hidden' }}>
        <Pressable
          onPressIn={tap}
          accessibilityRole="button"
          accessibilityLabel="Kanat çırp"
          style={{ position: 'absolute', left: -(W * (1 - scale)) / 2, top: -(H * (1 - scale)) / 2, width: W, height: H, transform: [{ scale }] }}>
          <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, overflow: 'hidden', transform: [{ translateX: v.shake }] }}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#BFE3F2' }]} />
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: H * 0.45, backgroundColor: '#D8F0F8', opacity: 0.55 }} />
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#1E2A47', opacity: v.nt }]} />
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: starOp }]}>
              {STARS.map(([x, y], i) => <T key={i} style={{ position: 'absolute', left: x, top: y, fontSize: 9 + (i % 3) * 3, color: '#FFF8E8' }}>✦</T>)}
            </Animated.View>
            <Animated.View pointerEvents="none" style={{ position: 'absolute', right: 24, top: 22, opacity: dayOp }}><T style={{ lineHeight: 49, fontSize: 38 }}>☀️</T></Animated.View>
            <Animated.View pointerEvents="none" style={{ position: 'absolute', right: 24, top: 22, opacity: v.nt }}><T style={{ lineHeight: 49, fontSize: 38 }}>🌙</T></Animated.View>
            <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: CLOUD_SPAN * 2, height: 160, opacity: 0.8, transform: [{ translateX: v.clouds }] }}>
              {[0, 1].map(c => CLOUDS.map(([x, y, k], i) => (
                <T key={`${c}${i}`} style={{ position: 'absolute', left: x + c * CLOUD_SPAN, top: y, lineHeight: 44, fontSize: 34 * k }}>☁️</T>
              )))}
            </Animated.View>
            <Hills tx={v.far} color={FAR} h={110} r={90} w={260} hi="#BDE0CF" />
            <Hills tx={v.near} color={NEAR} h={70} r={60} w={180} hi="#A2D0B2" />
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#14203A', opacity: veil }]} />
            {pipes.map(p => <PipeShape key={p.id} gap={p.gap} tx={pipeVal(p.id, W + 40)} ty={(p.moving && v.pipeY.get(p.id)) || v.zero} />)}
            <View pointerEvents="none" style={styles.ground}>
              <View style={styles.grass} />
              <Animated.View style={{ position: 'absolute', left: 0, top: 14, width: 44 * 10, height: 8, transform: [{ translateX: v.ground }] }}>
                {Array.from({ length: 10 }, (_, i) => <View key={i} style={{ position: 'absolute', left: i * 44 + 6, width: 22, height: 6, borderRadius: 3, backgroundColor: STRIPE }} />)}
              </Animated.View>
            </View>
            {slots.map((s, i) => (
              <Animated.View key={i} pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, opacity: s.o, transform: [{ translateX: s.x }, { translateY: s.y }] }}>
                <T style={{ fontSize: 14 }}>{PARTS[i]}</T>
              </Animated.View>
            ))}
            <Animated.View pointerEvents="none" style={{ position: 'absolute', left: MX - SPRITE / 2, top: 0, transform: [{ translateY: v.y }, { rotate: tiltDeg }, { scaleY: v.sy }] }}>
              <MokaSprite anim={mood} size={SPRITE} bounce={false} />
            </Animated.View>
            {score > 0 && (
              <Animated.View pointerEvents="none" style={[styles.bigScore, { transform: [{ scale: v.bump }] }]}>
                <T v="h1" style={{ color: '#FFF8E8', textShadowColor: 'rgba(40,48,68,0.45)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>{score}</T>
              </Animated.View>
            )}
            {!started && <View style={styles.hint} pointerEvents="none"><T v="bold" style={{ color: '#283044' }}>Dokun, Moka uçsun! 🦜</T></View>}
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', opacity: v.flash }]} />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

export function FlapResult({ score, best, left, onRetry }: { score: number; best: number; left: number; onRetry: () => void }) {
  const record = score > 0 && score >= best;
  return (
    <View style={styles.result}>
      <MokaSprite anim={record ? 'party' : 'yawn'} size={72} />
      <T v="small">{record ? '🏆 Yeni rekor!' : 'Oyun bitti'}</T>
      <T v="h1">{score}</T>
      <T v="small">engel geçtin · En iyi: {best}</T>
      {left > 0
        ? <Btn kind="primary" label="Tekrar dene" onPress={onRetry} />
        : <T v="bold" style={{ textAlign: 'center' }}>3 oyun yeter, yarın görüşürüz 🌙</T>}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  shine: { position: 'absolute', left: 8, top: 0, bottom: 0, width: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.55)' },
  shade: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 10, backgroundColor: CUP_SHADE },
  band: { position: 'absolute', left: 0, right: 0, height: 5, backgroundColor: 'rgba(191,168,158,0.5)' },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0, height: GROUND, backgroundColor: GROUND_C, overflow: 'hidden' },
  grass: { position: 'absolute', left: 0, right: 0, top: 0, height: 7, backgroundColor: GRASS, borderBottomWidth: 2, borderBottomColor: '#6AA27B' },
  bigScore: { position: 'absolute', left: 0, right: 0, top: 14, alignItems: 'center' },
  hint: { position: 'absolute', left: 0, right: 0, bottom: 70, alignItems: 'center' },
  result: { gap: 6, alignItems: 'center', paddingVertical: 8 },
});
