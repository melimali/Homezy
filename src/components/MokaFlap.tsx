import { requireOptionalNativeModule } from 'expo-modules-core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { MokaSprite } from '@/components/MokaSprite';
import { Btn, T } from '@/components/ui';
import { flap, GAP, H, MR, MX, newFlap, PIPE_W, step, W, type Flap } from '@/domain/flap';
import { radius, useColors } from '@/theme';

function buzz() {
  if (Platform.OS === 'web' || !requireOptionalNativeModule('ExpoHaptics')) return;
  try {
    const h = require('expo-haptics') as typeof import('expo-haptics'); // eslint-disable-line @typescript-eslint/no-require-imports
    void h.impactAsync(h.ImpactFeedbackStyle.Light);
  } catch { /* titreşim yoksa sessiz geç */ }
}

/** Moka Uçuş: dokununca Moka kanat çırpar; kahve fincanı sütunlarının arasından geç. Puan / XP yok. */
export function MokaFlap({ best, onOver }: { best: number; onOver: (score: number) => void }) {
  const c = useColors();
  const [g, setG] = useState<Flap>(newFlap);
  const ref = useRef(g);
  const done = useRef(false);

  useEffect(() => {
    let raf = 0;
    let t0 = Date.now();
    const loop = () => {
      const now = Date.now();
      const dt = Math.min((now - t0) / 1000, 0.04);
      t0 = now;
      const cur = ref.current;
      if (cur.started && !cur.over) {
        const n = step(cur, dt);
        ref.current = n;
        setG(n);
        if (n.over && !done.current) { done.current = true; onOver(n.score); }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [onOver]);

  const tap = useCallback(() => {
    if (ref.current.over) return;
    const n = flap(ref.current);
    ref.current = n;
    setG(n);
    buzz();
  }, []);

  return (
    <View style={{ gap: 8, alignItems: 'center' }}>
      <View style={styles.top}>
        <T v="bold">Skor: {g.score}</T>
        <T v="small">En iyi: {Math.max(best, g.score)}</T>
      </View>
      <Pressable onPress={tap} accessibilityRole="button" accessibilityLabel="Kanat çırp" style={[styles.field, { width: W, height: H, backgroundColor: c.accentSoft }]}>
        <T style={[styles.cloud, { left: 30, top: 40 }]}>☁️</T>
        <T style={[styles.cloud, { left: 190, top: 120 }]}>☁️</T>
        {g.pipes.map((p, i) => (
          <View key={i} pointerEvents="none">
            <View style={[styles.pipe, { left: p.x, width: PIPE_W, top: 0, height: p.gap, backgroundColor: c.clay, borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }]}>
              <T style={styles.cup}>☕</T>
            </View>
            <View style={[styles.pipe, { left: p.x, width: PIPE_W, top: p.gap + GAP, height: H - p.gap - GAP, backgroundColor: c.clay, borderTopLeftRadius: 14, borderTopRightRadius: 14 }]}>
              <T style={styles.cup}>☕</T>
            </View>
          </View>
        ))}
        <View pointerEvents="none" style={{ position: 'absolute', left: MX - 28, top: g.y - 28 - MR / 2, transform: [{ rotate: `${Math.max(-25, Math.min(40, g.vy / 12))}deg` }] }}>
          <MokaSprite anim={g.over ? 'sleepy' : 'happy'} size={56} bounce={false} />
        </View>
        {!g.started && <View style={styles.hint} pointerEvents="none"><T v="bold">Dokun, Moka uçsun! 🦜</T></View>}
      </Pressable>
    </View>
  );
}

export function FlapResult({ score, best, left, onRetry }: { score: number; best: number; left: number; onRetry: () => void }) {
  const record = score > 0 && score >= best;
  return (
    <View style={{ gap: 8, alignItems: 'center' }}>
      <MokaSprite anim={record ? 'party' : 'yawn'} size={96} />
      <T v="h3">{score} engel geçtin! {record ? '🏆 Yeni rekor' : ''}</T>
      <T v="small">En iyi: {best}</T>
      {left > 0
        ? <Btn kind="primary" label="Tekrar dene" onPress={onRetry} />
        : <T v="bold" style={{ textAlign: 'center' }}>3 oyun yeter, yarın görüşürüz 🌙</T>}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', width: W },
  field: { borderRadius: radius.tile, overflow: 'hidden' },
  pipe: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  cup: { fontSize: 22 },
  cloud: { position: 'absolute', fontSize: 30, opacity: 0.6 },
  hint: { position: 'absolute', left: 0, right: 0, bottom: 40, alignItems: 'center' },
});
