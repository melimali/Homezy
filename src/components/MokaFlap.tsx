import { requireOptionalNativeModule } from 'expo-modules-core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { MokaSprite } from '@/components/MokaSprite';
import { Btn, T } from '@/components/ui';
import { flap, GAP, GROUND, H, MR, MX, mix, newFlap, night, PIPE_W, step, W, type Flap } from '@/domain/flap';
import { radius } from '@/theme';

function buzz() {
  if (Platform.OS === 'web' || !requireOptionalNativeModule('ExpoHaptics')) return;
  try {
    const h = require('expo-haptics') as typeof import('expo-haptics'); // eslint-disable-line @typescript-eslint/no-require-imports
    void h.impactAsync(h.ImpactFeedbackStyle.Light);
  } catch { /* titreşim yoksa sessiz geç */ }
}

// Oyun sahnesi renkleri (gün → gece); tema renkleri değil, sahne resmi.
const SKY_DAY = '#BFE3F2', SKY_NIGHT = '#1E2A47';
const FAR_DAY = '#A9D3C0', FAR_NIGHT = '#2C3A5C';
const NEAR_DAY = '#86BD9B', NEAR_NIGHT = '#233250';
const GROUND_DAY = '#C9A27E', GROUND_NIGHT = '#4A3F4F';
const CUP_DAY = '#F4E7D8', CUP_NIGHT = '#B9A7A0';
const STARS = [[24, 30], [90, 70], [150, 24], [210, 90], [262, 40], [60, 130], [240, 150], [120, 110]] as const;
const CLOUDS = [[0, 40, 1], [120, 95, 0.7], [210, 25, 0.85], [300, 130, 0.6]] as const;

type Part = { x: number; y: number; vx: number; vy: number; life: number; e: string; s: number };
type Pop = { x: number; y: number; life: number };

function useFrame(cb: (dt: number) => void) {
  const ref = useRef(cb);
  useEffect(() => { ref.current = cb; });
  useEffect(() => {
    let raf = 0;
    let t0 = Date.now();
    const loop = () => {
      const now = Date.now();
      const dt = Math.min((now - t0) / 1000, 0.05);
      t0 = now;
      ref.current(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}

const Hills = ({ off, color, h, r, w }: { off: number; color: string; h: number; r: number; w: number }) => {
  const x = -((off % w) + w) % w;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x, bottom: GROUND - 6, width: w * 3, height: h, flexDirection: 'row' }}>
      {[0, 1, 2].map(i => <View key={i} style={{ width: w, height: h * 2, marginTop: h * 0.4, backgroundColor: color, borderTopLeftRadius: r, borderTopRightRadius: r }} />)}
    </View>
  );
};

/** Moka Uçuş: dokununca Moka kanat çırpar; kahve fincanı sütunlarının arasından geç. Puan / XP yok. */
export function MokaFlap({ best, onOver }: { best: number; onOver: (score: number) => void }) {
  const { width } = useWindowDimensions();
  const scale = Math.min(1, Math.max(0.6, (width - 64) / W));
  const [g, setG] = useState<Flap>(newFlap);
  const ref = useRef(g);
  const parts = useRef<Part[]>([]);
  const pops = useRef<Pop[]>([]);
  const done = useRef(false);
  const overRef = useRef(onOver);
  useEffect(() => { overRef.current = onOver; }, [onOver]);
  const clock = useRef(0);
  const flapAt = useRef(-1);
  const shake = useRef(0);
  const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fx, setFx] = useState<{ parts: Part[]; pops: Pop[]; t: number; shake: number; flapAt: number }>({ parts: [], pops: [], t: 0, shake: 0, flapAt: -1 });

  useEffect(() => () => { if (endTimer.current) clearTimeout(endTimer.current); }, []);

  const burst = (x: number, y: number, emojis: string[], n: number, spd: number) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = spd * (0.4 + Math.random() * 0.6);
      parts.current.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 + Math.random() * 0.3, e: emojis[i % emojis.length], s: 10 + Math.random() * 8 });
    }
  };

  useFrame(dt => {
    clock.current += dt;
    const cur = ref.current;
    if (cur.started && !cur.over) {
      const n = step(cur, dt);
      if (n.score > cur.score) {
        pops.current.push({ x: MX, y: n.y - 30, life: 0.8 });
        burst(MX, n.y, ['✨', '⭐'], 6, 90);
      }
      if (n.over) {
        burst(MX, n.y, ['💥', '☕', '🪶'], 9, 170);
        shake.current = 0.3;
        if (!done.current) {
          done.current = true;
          endTimer.current = setTimeout(() => overRef.current(n.score), 900); // ölümü görsün
        }
      }
      ref.current = n;
      setG(n);
    }
    // parçacıklar ve +1 efektleri (oyun bitse de akar)
    parts.current = parts.current.filter(p => (p.life -= dt) > 0);
    for (const p of parts.current) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; }
    pops.current = pops.current.filter(p => (p.life -= dt) > 0);
    for (const p of pops.current) p.y -= 40 * dt;
    if (shake.current > 0) shake.current -= dt;
    setFx({ parts: parts.current.map(p => ({ ...p })), pops: pops.current.map(p => ({ ...p })), t: clock.current, shake: shake.current, flapAt: flapAt.current });
  });

  const tap = useCallback(() => {
    if (ref.current.over) return;
    const n = flap(ref.current);
    ref.current = n;
    setG(n);
    flapAt.current = clock.current;
    burst(MX - 14, n.y + 8, ['🪶', '💨'], 2, 60);
    buzz();
  }, []);

  const nt = night(g.score, g.dist);
  const sky = mix(SKY_DAY, SKY_NIGHT, nt);
  const off = g.dist;
  const flapping = fx.t - fx.flapAt < 0.18;
  const sx = fx.shake > 0 ? Math.sin(fx.t * 90) * 4 : 0;
  const idle = !g.started ? Math.sin(fx.t * 4) * 6 : 0;
  const tilt = Math.max(-25, Math.min(70, g.vy / 8));
  const my = g.y + idle;
  const squash = flapping ? 1.12 : 1;

  return (
    <View style={{ gap: 8, alignItems: 'center' }}>
      <View style={[styles.top, { width: W * scale }]}>
        <T v="bold">Skor: {g.score}</T>
        <T v="small">En iyi: {Math.max(best, g.score)}</T>
      </View>
      <View style={{ width: W * scale, height: H * scale, borderRadius: radius.tile, overflow: 'hidden' }}>
        <Pressable
          onPressIn={tap}
          accessibilityRole="button"
          accessibilityLabel="Kanat çırp"
          style={{ position: 'absolute', left: -(W * (1 - scale)) / 2, top: -(H * (1 - scale)) / 2, width: W, height: H, backgroundColor: sky, transform: [{ scale }, { translateX: sx }] }}>
          {nt > 0.3 && STARS.map(([x, y], i) => (
            <T key={i} style={{ position: 'absolute', left: x, top: y, fontSize: 9 + (i % 3) * 3, opacity: (nt - 0.3) * (0.6 + 0.4 * Math.sin(fx.t * 3 + i)) }}>✦</T>
          ))}
          <T style={{ position: 'absolute', right: 24, top: 22, fontSize: 38, opacity: 0.95 }}>{nt > 0.5 ? '🌙' : '☀️'}</T>
          {CLOUDS.map(([x, y, k], i) => {
            const span = W + 120;
            const cx = (((x - off * 0.12 * k) % span) + span) % span - 60;
            return <T key={i} style={{ position: 'absolute', left: cx, top: y, fontSize: 34 * k, opacity: 0.75 - nt * 0.4 }}>☁️</T>;
          })}
          <Hills off={off * 0.15} color={mix(FAR_DAY, FAR_NIGHT, nt)} h={110} r={90} w={260} />
          <Hills off={off * 0.35} color={mix(NEAR_DAY, NEAR_NIGHT, nt)} h={70} r={60} w={180} />
          {g.pipes.map((p, i) => {
            const cup = mix(CUP_DAY, CUP_NIGHT, nt);
            const rim = mix('#BFA89E', '#7A6A68', nt);
            return (
              <View key={i} pointerEvents="none">
                <View style={[styles.pipe, { left: p.x, top: 0, height: p.gap, backgroundColor: cup, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }]}>
                  <View style={[styles.shine]} />
                  <View style={[styles.rim, { backgroundColor: rim, bottom: 0 }]} />
                  <T style={styles.cup}>☕</T>
                </View>
                <View style={[styles.pipe, { left: p.x, top: p.gap + GAP, height: H - GROUND - p.gap - GAP + 6, backgroundColor: cup, borderTopLeftRadius: 16, borderTopRightRadius: 16 }]}>
                  <View style={[styles.shine]} />
                  <View style={[styles.rim, { backgroundColor: rim, top: 0 }]} />
                  <T style={styles.cup}>☕</T>
                </View>
              </View>
            );
          })}
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: GROUND, backgroundColor: mix(GROUND_DAY, GROUND_NIGHT, nt), borderTopWidth: 4, borderTopColor: mix(NEAR_DAY, NEAR_NIGHT, nt) }}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
              const gx = ((((i * 44 - off) % 352) + 352) % 352) - 40;
              return <View key={i} style={{ position: 'absolute', left: gx, top: 10, width: 22, height: 6, borderRadius: 3, backgroundColor: mix(GROUND_DAY, '#000000', 0.12 + nt * 0.1) }} />;
            })}
          </View>
          {fx.parts.map((p, i) => (
            <T key={i} pointerEvents="none" style={{ position: 'absolute', left: p.x - p.s / 2, top: p.y - p.s / 2, fontSize: p.s, opacity: Math.min(1, p.life * 2.5) }}>{p.e}</T>
          ))}
          <View pointerEvents="none" style={{ position: 'absolute', left: MX - 15, top: my - 15 - MR / 2, transform: [{ rotate: `${tilt}deg` }, { scaleX: squash }, { scaleY: flapping ? 0.9 : 1 }] }}>
            <MokaSprite anim={g.over ? 'sleepy' : flapping ? 'party' : 'happy'} size={30} bounce={false} />
          </View>
          {fx.pops.map((p, i) => (
            <T key={i} pointerEvents="none" v="bold" style={{ position: 'absolute', left: p.x - 10, top: p.y, fontSize: 20 + (0.8 - p.life) * 10, opacity: Math.min(1, p.life * 2), color: '#FFF8E8' }}>+1</T>
          ))}
          {g.started && <T pointerEvents="none" v="h1" style={styles.bigScore}>{g.score}</T>}
          {!g.started && <View style={styles.hint} pointerEvents="none"><T v="bold" style={{ color: nt > 0.5 ? '#FFF8E8' : '#283044' }}>Dokun, Moka uçsun! 🦜</T></View>}
        </Pressable>
      </View>
    </View>
  );
}

export function FlapResult({ score, best, left, onRetry }: { score: number; best: number; left: number; onRetry: () => void }) {
  const record = score > 0 && score >= best;
  return (
    <View style={{ gap: 8, alignItems: 'center' }}>
      <MokaSprite anim={record ? 'party' : 'yawn'} size={72} />
      <T v="h3">{score} engel geçtin! {record ? '🏆 Yeni rekor' : ''}</T>
      <T v="small">En iyi: {best}</T>
      {left > 0
        ? <Btn kind="primary" label="Tekrar dene" onPress={onRetry} />
        : <T v="bold" style={{ textAlign: 'center' }}>3 oyun yeter, yarın görüşürüz 🌙</T>}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  pipe: { position: 'absolute', width: PIPE_W, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  shine: { position: 'absolute', left: 8, top: 0, bottom: 0, width: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  rim: { position: 'absolute', left: 0, right: 0, height: 8 },
  cup: { fontSize: 22 },
  bigScore: { position: 'absolute', left: 0, right: 0, top: 14, textAlign: 'center', color: '#FFF8E8', opacity: 0.9 },
  hint: { position: 'absolute', left: 0, right: 0, bottom: 70, alignItems: 'center' },
});
