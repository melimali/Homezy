import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { fonts } from '@/theme';

/**
 * Evin içinde dolaşan minik Moka (kakapo). Saf SVG; yeni native modül yok.
 * Davranış makinesi: dur → bak → yürü döngüsü, göz kırpma, tüy kabartma, oturma/uyuma,
 * mutlu zıplama ve görev bitince kutlama. Odanın hücrelerinde, eşyanın hücresine girmeden gezer.
 */

type Mode = 'stand' | 'walk' | 'look' | 'fluff' | 'sit' | 'sleep' | 'hop' | 'cheer';

type Sim = {
  r: number; c: number; f: 1 | -1;
  mode: Mode; t: number; dur: number;
  path: [number, number][];
  step: number; // yürüyüş evresi
  look: number; // bakış yönü hedefi (-1..1)
  lookNow: number;
  blinkIn: number; blink: number; // sonraki kırpmaya kalan süre / kırpma ilerlemesi
  zzz: number;
};

type Frame = {
  x: number; y: number; f: 1 | -1;
  bob: number; lift: number; squash: number; rot: number;
  head: number; headX: number; wing: number; fluff: number;
  eye: number; happy: boolean; sit: number; sleep: boolean; step: number; zzz: number; cheer: boolean; t: number;
};

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** Odanın yürünebilir hücreleri (eşyanın hücresi hariç), bileşen = bağlı küme. */
function walkable(roomCells: number[], blocked: number) {
  const free = roomCells.length > 1 ? roomCells.filter(i => i !== blocked) : roomCells.slice();
  return new Set(free.length ? free : roomCells);
}
function neighbors(i: number, set: Set<number>, cols: number) {
  const r = Math.floor(i / cols), c = i % cols;
  return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
    .filter(([rr, cc]) => rr >= 0 && cc >= 0 && cc < cols)
    .map(([rr, cc]) => rr * cols + cc)
    .filter(n => set.has(n));
}
/** Hücre yolunu BFS ile bulur; ulaşılamazsa null. */
function route(from: number, to: number, set: Set<number>, cols: number): number[] | null {
  if (from === to) return [from];
  const prev = new Map<number, number>([[from, -1]]);
  const q = [from];
  while (q.length) {
    const cur = q.shift()!;
    for (const n of neighbors(cur, set, cols)) {
      if (prev.has(n)) continue;
      prev.set(n, cur);
      if (n === to) {
        const out = [n];
        let p = cur;
        while (p !== -1) { out.unshift(p); p = prev.get(p)!; }
        return out;
      }
      q.push(n);
    }
  }
  return null;
}

// Moka'nın sığdığı kutu (ev koordinatı): ayak noktasından sola/yukarı.
const BX = 22, BY = 38, BW = 44, BH = 46;
const MARGIN = 0.28;
const inCell = (i: number, cols: number): [number, number] => [Math.floor(i / cols) + rnd(MARGIN, 1 - MARGIN), (i % cols) + rnd(MARGIN, 1 - MARGIN)];

export function MokaPet({
  vb, roomCells, blocked, cols, project, reduce, celebrate, night, say,
}: {
  vb: string;
  roomCells: number[];
  blocked: number;
  cols: number;
  project: (r: number, c: number, z?: number) => [number, number];
  reduce: boolean;
  /** Her artışta Moka kutlama yapar (görev bitti). */
  celebrate: number;
  night: boolean;
  /** Moka'nın ara sıra balonla söyleyeceği kısa cümleler. Boşsa konuşmaz. */
  say?: string[];
}) {
  const walk = useRef(walkable(roomCells, blocked));
  const key = roomCells.join(',') + '|' + blocked + '|' + cols;
  const sim = useRef<Sim | null>(null);
  const proj = useRef(project);
  proj.current = project;
  const nightRef = useRef(night);
  nightRef.current = night;
  const [frame, setFrame] = useState<Frame | null>(null);
  // Küçük Svg kutusu native transform ile gezer; her karede sadece küçük kutu çizilir (tam ev katmanı değil).
  const [lay, setLay] = useState({ w: 0, h: 0 });
  const layRef = useRef(lay);
  layRef.current = lay;
  const pos = useRef(new Animated.ValueXY()).current;
  const [vx, vy, vw, vh] = vb.split(' ').map(Number);
  const lastXY = useRef<[number, number]>([0, 0]);
  const place = (x: number, y: number) => {
    lastXY.current = [x, y];
    const { w, h } = layRef.current;
    if (!w) return;
    pos.setValue({ x: ((x - BX - vx) / vw) * w, y: ((y - BY - vy) / vh) * h });
  };
  useEffect(() => { if (lay.w) place(lastXY.current[0], lastXY.current[1]); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [lay.w, lay.h, vb]);

  useEffect(() => {
    walk.current = walkable(roomCells, blocked);
    const cells = [...walk.current];
    const start = cells.length ? cells[Math.floor(Math.random() * cells.length)] : roomCells[0];
    const [r, c] = inCell(start, cols);
    sim.current = { r, c, f: 1, mode: 'stand', t: 0, dur: 1.2, path: [], step: 0, look: 0, lookNow: 0, blinkIn: rnd(1.5, 4), blink: -1, zzz: 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Sohbet balonu: açılıştan birkaç saniye sonra selam, sonra arada bir kısa cümle. Uyurken konuşmaz.
  const [bubble, setBubble] = useState<string | null>(null);
  const sayRef = useRef(say);
  sayRef.current = say;
  const talks = !!say?.length;
  useEffect(() => {
    if (!talks) return;
    let n = 0;
    let hide: ReturnType<typeof setTimeout> | undefined;
    let next: ReturnType<typeof setTimeout>;
    const speak = () => {
      const lines = sayRef.current ?? [];
      const s = sim.current;
      if (lines.length && s && s.mode !== 'sleep') {
        // İlk söz selam, sonrakiler sırayla.
        setBubble(lines[n % lines.length]);
        n++;
        if (s.mode !== 'cheer') { s.mode = 'hop'; s.t = 0; s.dur = 1.3; s.path = []; }
        hide = setTimeout(() => setBubble(null), 4600);
      }
      next = setTimeout(speak, 26000 + Math.random() * 20000);
    };
    next = setTimeout(speak, 3200);
    return () => { clearTimeout(next); if (hide) clearTimeout(hide); };
  }, [talks, key]);

  const lastCel = useRef(celebrate);
  useEffect(() => {
    if (celebrate !== lastCel.current && sim.current) {
      lastCel.current = celebrate;
      sim.current.mode = 'cheer'; sim.current.t = 0; sim.current.dur = 2.6; sim.current.path = [];
    }
  }, [celebrate]);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    let acc = 0;
    let alive = true;
    const choose = (s: Sim) => {
      const set = walk.current;
      const here = Math.floor(s.r) * cols + Math.floor(s.c);
      const roll = Math.random();
      s.t = 0;
      if (s.mode === 'sleep' && roll < 0.8) { s.dur = rnd(4, 8); return; }
      if (roll < 0.5 && set.size) {
        // yürü: aynı bileşendeki rastgele bir hücreye
        const targets = [...set].filter(i => route(here, i, set, cols));
        const to = targets.length ? targets[Math.floor(Math.random() * targets.length)] : here;
        const cellRoute = route(here, to, set, cols) ?? [here];
        s.path = cellRoute.slice(1).map(i => inCell(i, cols));
        const [fr, fc] = inCell(to, cols);
        if (cellRoute.length === 1 || Math.random() < 0.5) s.path.push([fr, fc]);
        s.mode = 'walk';
        s.dur = 99;
      } else if (roll < 0.66) { s.mode = 'look'; s.dur = rnd(1.8, 3.4); s.look = Math.random() < 0.5 ? -1 : 1; }
      else if (roll < 0.76) { s.mode = 'fluff'; s.dur = 1.1; }
      else if (roll < 0.86) { s.mode = 'sit'; s.dur = rnd(3, 6); }
      else if (roll < 0.93) { s.mode = 'hop'; s.dur = 1.3; }
      else { s.mode = nightRef.current ? 'sleep' : 'stand'; s.dur = rnd(4, 8); }
      if (nightRef.current && s.mode === 'sit') { s.mode = 'sleep'; s.dur = rnd(5, 9); }
    };
    const tick = (ts: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      const s = sim.current;
      if (!s) return;
      const dt = Math.min(0.25, last ? (ts - last) / 1000 : 0.016);
      last = ts;
      acc += dt;
      // Yürürken/oynarken ~24 kare, dururken ~8 kare: JS iş parçacığı + SVG yeniden çizimi ucuz kalsın.
      const busy = s.mode === 'walk' || s.mode === 'hop' || s.mode === 'cheer' || s.mode === 'fluff';
      if (acc < (busy ? 1 / 14 : 1 / 4)) return;
      const d = acc; acc = 0;
      s.t += d;
      // göz kırpma
      if (s.blink >= 0) { s.blink += d / 0.18; if (s.blink >= 1) s.blink = -1; }
      else { s.blinkIn -= d; if (s.blinkIn <= 0) { s.blink = 0; s.blinkIn = rnd(2, 5); } }
      s.lookNow += (s.mode === 'look' ? s.look - s.lookNow : -s.lookNow) * Math.min(1, d * 6);
      s.zzz = (s.zzz + d) % 2.4;
      if (s.mode === 'walk') {
        const tgt = s.path[0];
        if (!tgt) { s.mode = 'stand'; s.t = 0; s.dur = rnd(0.8, 2); }
        else {
          const dr = tgt[0] - s.r, dc = tgt[1] - s.c;
          const dist = Math.hypot(dr, dc);
          const sp = 0.55 * d;
          // Ekranda yatay hareket yönüne bak
          const sx = dc - dr;
          if (Math.abs(sx) > 0.02) s.f = sx > 0 ? 1 : -1;
          s.step += d * 9;
          if (dist <= sp) { s.r = tgt[0]; s.c = tgt[1]; s.path.shift(); if (!s.path.length) { s.mode = 'look'; s.look = Math.random() < 0.5 ? -1 : 1; s.dur = rnd(1, 2.2); s.t = 0; } }
          else { s.r += (dr / dist) * sp; s.c += (dc / dist) * sp; }
          // yolda ara sıra dur-bak
          if (s.t > 2.2 && Math.random() < 0.01) { s.mode = 'look'; s.look = Math.random() < 0.5 ? -1 : 1; s.dur = rnd(0.9, 1.8); s.t = 0; }
        }
      } else if (s.t >= s.dur) choose(s);
      // kare
      const ph = s.mode === 'walk' ? s.step : 0;
      const k = Math.min(1, s.t / 0.25);
      let bob = Math.abs(Math.sin(ph)) * 1.7;
      let lift = 0, squash = 1, rot = Math.sin(ph) * 5 * s.f, head = Math.sin(ph) * 5, headX = s.lookNow * 1.4;
      let wing = Math.sin(ph) * 8, fluff = 0, sit = 0, sleep = false, happy = false, cheer = false;
      if (s.mode === 'stand') { bob = Math.sin(s.t * 2.2) * 0.35; wing = 0; head = s.lookNow * 6; }
      if (s.mode === 'look') { bob = Math.sin(s.t * 2) * 0.3; head = s.lookNow * 14 + Math.sin(s.t * 3) * 3; wing = 0; }
      if (s.mode === 'fluff') { const p = Math.sin(Math.min(1, s.t / s.dur) * Math.PI); fluff = p; squash = 1 + 0.12 * p; bob = 0; wing = 26 * p; rot = Math.sin(s.t * 40) * 3 * p; }
      if (s.mode === 'sit') { sit = k; bob = 0; wing = -4; }
      if (s.mode === 'sleep') { sit = k; sleep = true; bob = Math.sin(s.t * 1.6) * 0.5; wing = -6; head = 14 * k; }
      if (s.mode === 'hop') { const p = Math.min(1, s.t / s.dur); lift = Math.abs(Math.sin(p * Math.PI * 2)) * 5; squash = 1 + (lift < 0.8 ? -0.08 : 0.06); wing = lift > 0.8 ? 34 : 0; happy = true; bob = 0; }
      if (s.mode === 'cheer') { lift = Math.abs(Math.sin(s.t * 6.5)) * 7; wing = 40 + Math.sin(s.t * 26) * 12; happy = true; cheer = true; squash = 1 + Math.sin(s.t * 13) * 0.05; rot = Math.sin(s.t * 6.5) * 6; head = Math.sin(s.t * 6.5) * 8; bob = 0; }
      const eye = s.mode === 'sleep' ? 0 : s.blink >= 0 ? Math.abs(1 - s.blink * 2) : 1;
      const [x, y] = proj.current(s.r, s.c, 0);
      place(x, y);
      setFrame({ x: 0, y: 0, f: s.f, bob, lift, squash, rot, head, headX, wing, fluff, eye, happy, sit, sleep, step: ph, zzz: s.zzz, cheer, t: s.t });
    };
    if (reduce) {
      const s = sim.current;
      if (s) { const [x, y] = proj.current(s.r, s.c, 0); place(x, y); setFrame({ x: 0, y: 0, f: 1, bob: 0, lift: 0, squash: 1, rot: 0, head: 0, headX: 0, wing: 0, fluff: 0, eye: 1, happy: false, sit: 0, sleep: false, step: 0, zzz: 0, cheer: false, t: 0 }); }
      return;
    }
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [reduce, cols, key]);

  if (!frame) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e: LayoutChangeEvent) => setLay({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {lay.w > 0 && (
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, top: 0, width: (BW / vw) * lay.w, height: (BH / vh) * lay.h, transform: pos.getTranslateTransform() }}
        >
          <Svg width="100%" height="100%" viewBox={`${-BX} ${-BY} ${BW} ${BH}`}>
            <MokaBody fr={frame} />
          </Svg>
        </Animated.View>
      )}
      {bubble && (
        <Svg width="100%" height="100%" viewBox={vb} style={StyleSheet.absoluteFill}>
          <Bubble text={bubble} x={lastXY.current[0]} y={lastXY.current[1] - frame.lift} vb={vb} />
        </Svg>
      )}
    </View>
  );
}

/** Konuşma balonu: Moka'nın üstünde, kadrajdan taşmaz. Uzun cümle iki satıra bölünür. */
function Bubble({ text, x, y, vb }: { text: string; x: number; y: number; vb: string }) {
  const [vx, , vw] = vb.split(' ').map(Number);
  const words = text.split(' ');
  const lines: string[] = [];
  for (const w of words) {
    const last = lines[lines.length - 1];
    if (last != null && (last + ' ' + w).length <= 20) lines[lines.length - 1] = last + ' ' + w;
    else lines.push(w);
  }
  const FS = 12, LH = 15;
  const w = Math.max(...lines.map(l => l.length)) * FS * 0.56 + 18;
  const h = lines.length * LH + 10;
  const cx = Math.min(vx + vw - w / 2 - 4, Math.max(vx + w / 2 + 4, x + 6));
  const top = y - 34 - h;
  return (
    <G>
      <Rect x={cx - w / 2} y={top} width={w} height={h} rx={10} fill="#FFFDF9" stroke="#E8DFD2" strokeWidth={1} />
      <Path d={`M${x + 2} ${top + h - 0.5}L${x + 4} ${top + h + 7}L${x + 11} ${top + h - 0.5}Z`} fill="#FFFDF9" stroke="#E8DFD2" strokeWidth={1} strokeLinejoin="round" />
      <Rect x={x + 2.5} y={top + h - 2} width={8} height={2.4} fill="#FFFDF9" />
      {lines.map((l, i) => (
        <SvgText key={i} x={cx} y={top + 5 + LH * (i + 1) - 4} fontSize={FS} fontFamily={fonts.bodyBold} fill={INK} textAnchor="middle">{l}</SvgText>
      ))}
    </G>
  );
}

const OLIVE = '#8B9A55';
const OLIVE_D = '#6F7F3F';
const MOSS = '#A3AE62';
const BELLY = '#D6C985';
const FACE = '#EDD7A8';
const BEAK = '#D8B49C';
const INK = '#283044';

function MokaBody({ fr }: { fr: Frame }) {
  const { x, y, f, bob, lift, squash, rot, head, headX, wing, fluff, eye, happy, sit, sleep, step, zzz, cheer, t } = fr;
  const gy = -lift - bob + sit * 2.2; // gövde yüksekliği
  const sx = 1 + fluff * 0.1;
  const swing = Math.sin(step);
  const footL = Math.max(0, swing) * 2.2, footR = Math.max(0, -swing) * 2.2;
  const shadowK = Math.max(0.55, 1 - lift * 0.08);
  return (
    <G transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${f} 1)`}>
      <Ellipse cx={0} cy={0.8} rx={7.5 * shadowK} ry={2.4 * shadowK} fill="rgba(40,48,68,0.22)" />
      {/* ayaklar */}
      {sit < 0.6 && (
        <G>
          <Ellipse cx={-1.8} cy={-0.8 - footL - lift * 0.4} rx={2.1} ry={1} fill="#9C8576" />
          <Ellipse cx={2.2} cy={-0.8 - footR - lift * 0.4} rx={2.1} ry={1} fill="#9C8576" />
        </G>
      )}
      <G transform={`translate(0 ${gy.toFixed(2)}) rotate(${rot.toFixed(1)} 0 -5) scale(${(sx * (1 + (1 - squash) * 0.5)).toFixed(3)} ${squash.toFixed(3)})`}>
        {/* kuyruk */}
        <Ellipse cx={-6.8} cy={-3.6} rx={2.8} ry={1.7} fill={OLIVE_D} transform="rotate(25 -6.8 -3.6)" />
        {/* gövde */}
        <Ellipse cx={0} cy={-6.4} rx={7.3} ry={6.2} fill={OLIVE} />
        <Ellipse cx={1.2} cy={-5.4} rx={4.9} ry={4.4} fill={BELLY} />
        {[[-3, -9], [-1, -10.5], [-4.5, -6], [1.5, -9.2], [-2.5, -3.6]].map(([dx, dy], i) => (
          <Circle key={i} cx={dx} cy={dy} r={0.7 + (fluff * 0.5)} fill={OLIVE_D} opacity={0.75} />
        ))}
        {fluff > 0.05 && [-6, -3, 0, 3].map((dx, i) => (
          <Ellipse key={'f' + i} cx={dx} cy={-12.4 - fluff * 1.6} rx={0.9} ry={1.7 * fluff + 0.3} fill={MOSS} />
        ))}
        {/* kanat */}
        <G transform={`rotate(${(-wing).toFixed(1)} -1 -9)`}>
          <Ellipse cx={-2.2} cy={-6} rx={3} ry={4.4} fill={OLIVE_D} transform="rotate(8 -2.2 -6)" />
          <Ellipse cx={-2.4} cy={-5.5} rx={1.6} ry={2.6} fill={MOSS} opacity={0.6} />
        </G>
        {/* kafa */}
        <G transform={`translate(${(2.6 + headX).toFixed(2)} ${(-13.2 + sit * 0.8).toFixed(2)}) rotate(${head.toFixed(1)} 0 3)`}>
          <Ellipse cx={0} cy={0} rx={6.2} ry={5.5} fill={OLIVE} />
          <Ellipse cx={-3.4} cy={-5} rx={1.1} ry={1.7} fill={OLIVE_D} />
          <Ellipse cx={-0.4} cy={-5.6} rx={1.1} ry={1.8} fill={OLIVE_D} />
          <Ellipse cx={2.6} cy={-5} rx={1.1} ry={1.6} fill={OLIVE_D} />
          <Ellipse cx={0.9} cy={0.7} rx={5} ry={4.3} fill={FACE} />
          {/* yanaklar */}
          <Circle cx={-1.4} cy={2.4} r={1} fill="#E6A99A" opacity={0.55} />
          <Circle cx={4.6} cy={2.4} r={1} fill="#E6A99A" opacity={0.55} />
          {/* gözler */}
          {sleep ? (
            <G>
              <Path d="M -1.6 -0.4 Q -0.3 0.6 1 -0.4" stroke={INK} strokeWidth={0.7} fill="none" strokeLinecap="round" />
              <Path d="M 2.6 -0.4 Q 3.9 0.6 5.2 -0.4" stroke={INK} strokeWidth={0.7} fill="none" strokeLinecap="round" />
            </G>
          ) : happy ? (
            <G>
              <Path d="M -1.8 0.2 Q -0.4 -1.6 1 0.2" stroke={INK} strokeWidth={0.8} fill="none" strokeLinecap="round" />
              <Path d="M 2.6 0.2 Q 4 -1.6 5.4 0.2" stroke={INK} strokeWidth={0.8} fill="none" strokeLinecap="round" />
            </G>
          ) : (
            <G>
              <Ellipse cx={-0.4} cy={-0.1} rx={0.9} ry={Math.max(0.12, 1.1 * eye)} fill={INK} />
              <Ellipse cx={4} cy={-0.1} rx={0.9} ry={Math.max(0.12, 1.1 * eye)} fill={INK} />
              {eye > 0.6 && <Circle cx={-0.1} cy={-0.5} r={0.3} fill="#fff" />}
              {eye > 0.6 && <Circle cx={4.3} cy={-0.5} r={0.3} fill="#fff" />}
            </G>
          )}
          {/* gaga */}
          <Ellipse cx={2.1} cy={2} rx={1.7} ry={1.2} fill={BEAK} />
          {cheer && <Ellipse cx={2.1} cy={3} rx={1} ry={0.9 + Math.abs(Math.sin(t * 13)) * 0.5} fill="#E08A86" />}
        </G>
      </G>
      {sleep && (
        <SvgText x={7} y={-17 - zzz * 4} fontSize={5 + zzz} fill={INK} opacity={Math.max(0, 1 - zzz / 2.4)} fontWeight="bold">z</SvgText>
      )}
      {cheer && [0, 1, 2, 3].map(i => {
        const a = (t * 1.4 + i / 4) % 1;
        return <Circle key={'s' + i} cx={(i - 1.5) * 5} cy={-22 - a * 8} r={1.1 * (1 - a * 0.6)} fill={['#F2C46D', '#E58C7E', '#78A1BB', '#F4A6C0'][i]} opacity={1 - a} />;
      })}
    </G>
  );
}
