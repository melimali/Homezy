import { useEffect, useState, type ReactElement } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Polygon, Polyline, Rect } from 'react-native-svg';

import { ROOM_EMOJI } from '@/domain/constants';
import { FLOWER, MOOD_LIGHT, PERSONA_LIGHT, personaOf, type Mood } from '@/domain/garden';
import { bloom } from '@/components/GardenArt';
import { roomClean, roomCounts } from '@/domain/logic';
import { MAX_LEVEL } from '@/domain/play';
import { useNow } from '@/hooks/useNow';
import type { AppState, HouseTheme, RoomType } from '@/domain/types';
import { fonts, useColors, useIsDark, type Colors } from '@/theme';

/**
 * Ana ekrandaki ev: kullanıcının bloklarla çizdiği plan, izometrik (yandan-üstten) bir
 * oyuncak ev olarak. Tavan yok; arka duvarlar yüksek, ön duvarlar alçak, böylece odaların
 * içi görünür. Her odanın ortasında türüne göre minik bir eşya durur. Tamamı tek bir SVG,
 * 3D kütüphanesi yok; eski Android telefonlarda da akıcı çalışsın diye.
 */

/** Bir bloğun ekrandaki yarı genişliği ve yarı yüksekliği (2:1 izometrik). */
const A = 30;
const B = 15;
const SLAB = 10;
const WALL_H = 34;
const INNER_H = 20;
const FRONT_H = 8;
const T = 0.12;
/** Etiketin ekrandaki yüksekliği (çakışma kontrolü için). */
const LABEL_H = 27;
/** Etiket çapasının genişliği; etiket bunun ortasına oturur. */
const ANCHOR_W = 150;
const LABEL_Z = 4;

type Pt = [number, number];
/** Izgara koordinatından (satır, sütun, yükseklik) ekran noktasına. */
const P = (r: number, c: number, z = 0): Pt => [(c - r) * A, (c + r) * B - z];
const pts = (ps: Pt[]) => ps.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

/** Rengi siyaha (amt < 0) ya da beyaza (amt > 0) doğru karıştırır. */
function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const to = amt < 0 ? 0 : 255, k = Math.abs(amt);
  const ch = (v: number) => Math.round(v + (to - v) * k);
  const [r, g, b] = [ch((n >> 16) & 255), ch((n >> 8) & 255), ch(n & 255)];
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** İki rengi karıştırır (t = 0 ilk renk, 1 ikinci renk). */
function mix(a: string, b: string, t: number) {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((x >> s) & 255) + (((y >> s) & 255) - ((x >> s) & 255)) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

type Face = { key: string; points: string; fill: string; onPress?: () => void };

/** Kutunun görünen üç yüzü: üst, sol ön (+satır), sağ ön (+sütun). */
function box(key: string, r0: number, c0: number, dr: number, dc: number, z0: number, h: number, color: string): Face[] {
  const r1 = r0 + dr, c1 = c0 + dc, z1 = z0 + h;
  return [
    { key: key + 'l', fill: shade(color, -0.1), points: pts([P(r1, c0, z0), P(r1, c1, z0), P(r1, c1, z1), P(r1, c0, z1)]) },
    { key: key + 'r', fill: shade(color, -0.2), points: pts([P(r0, c1, z0), P(r1, c1, z0), P(r1, c1, z1), P(r0, c1, z1)]) },
    { key: key + 't', fill: color, points: pts([P(r0, c0, z1), P(r0, c1, z1), P(r1, c1, z1), P(r1, c0, z1)]) },
  ];
}

const WOOD = '#C9A98F';
const WHITE = '#FAF8F4';
const WATER = '#9CC9E0';
const LEAF = '#7FB28A';
const POT = '#C8826B';

/** Odanın türüne göre minik eşya. Koordinatlar blok içinde 0–1 arası. */
function furniture(type: RoomType, r: number, c: number, k: string, col: Colors): ReactElement[] {
  const b = (n: string, u: number, v: number, du: number, dv: number, z: number, h: number, color: string) =>
    box(k + n, r + u, c + v, du, dv, z, h, color);
  const ball = (n: string, u: number, v: number, z: number, rad: number, fill: string, op = 1) => {
    const [x, y] = P(r + u, c + v, z);
    return <Circle key={k + n} cx={x} cy={y} r={rad} fill={fill} fillOpacity={op} />;
  };
  let faces: Face[] = [];
  const extra: ReactElement[] = [];
  switch (type) {
    case 'yatak':
      faces = [
        ...b('f', 0.14, 0.2, 0.72, 0.6, 0, 7, WOOD),
        ...b('m', 0.17, 0.23, 0.66, 0.54, 7, 4, WHITE),
        ...b('y', 0.17, 0.27, 0.15, 0.46, 11, 3, WHITE),
        ...b('o', 0.42, 0.23, 0.41, 0.54, 11, 2, col.hi),
        // Komodin ve üstünde gece lambası.
        ...b('k', 0.14, 0.82, 0.14, 0.14, 0, 8, shade(WOOD, -0.08)),
      ];
      extra.push(ball('l', 0.21, 0.89, 13, 2.6, GOLD), ball('lg', 0.21, 0.89, 12, 6, GOLD, 0.2));
      break;
    case 'cocuk':
      faces = [
        ...b('a', 0.3, 0.22, 0.22, 0.22, 0, 9, '#E58C7E'),
        ...b('b', 0.3, 0.48, 0.22, 0.22, 0, 9, '#78A1BB'),
        ...b('c', 0.3, 0.35, 0.22, 0.22, 9, 9, '#F2C46D'),
      ];
      extra.push(ball('t', 0.72, 0.62, 5, 5, '#E58C7E'));
      // Oyuncak ayı.
      extra.push(ball('ab', 0.7, 0.25, 4, 4.2, '#B07D56'), ball('ah', 0.7, 0.25, 10, 3.2, '#B07D56'), ball('ae', 0.67, 0.21, 12.5, 1.2, '#7A5236'), ball('af', 0.73, 0.29, 12.5, 1.2, '#7A5236'));
      break;
    case 'salon':
      faces = [
        ...b('s', 0.24, 0.14, 0.5, 0.72, 0, 7, '#BFA89E'),
        ...b('k', 0.24, 0.14, 0.14, 0.72, 7, 9, shade('#BFA89E', -0.05)),
        ...b('m', 0.4, 0.2, 0.3, 0.28, 7, 3, WHITE),
        ...b('n', 0.4, 0.52, 0.3, 0.28, 7, 3, WHITE),
        // Sehpa ve üstünde kupa.
        ...b('t', 0.8, 0.3, 0.14, 0.4, 0, 5, WOOD),
        ...b('c', 0.84, 0.46, 0.05, 0.05, 5, 3, '#E58C7E'),
      ];
      extra.push(ball('y', 0.4, 0.3, 11, 2.4, GOLD));
      break;
    case 'mutfak':
      faces = [
        ...b('t', 0.12, 0.14, 0.3, 0.72, 0, 15, WHITE),
        ...b('p', 0.18, 0.3, 0.16, 0.18, 15, 6, '#B8584C'),
        ...b('m', 0.58, 0.3, 0.28, 0.42, 0, 9, WOOD),
      ];
      // Masada meyve kâsesi.
      extra.push(ball('k', 0.72, 0.5, 10, 3.6, WHITE), ball('e', 0.7, 0.47, 12.5, 1.8, '#E0605A'), ball('p', 0.73, 0.53, 12.5, 1.8, '#E8A15A'), ball('y', 0.7, 0.53, 13.5, 1.6, '#A6D49B'));
      break;
    case 'banyo':
      faces = [...b('k', 0.2, 0.14, 0.62, 0.72, 0, 11, WHITE), ...b('s', 0.26, 0.2, 0.5, 0.6, 11, 0.5, WATER)];
      extra.push(ball('a', 0.4, 0.4, 14, 3, WHITE), ball('b', 0.5, 0.55, 14, 2.5, WHITE));
      // Lastik ördek.
      extra.push(ball('d', 0.55, 0.38, 13, 2.6, GOLD), ball('dh', 0.52, 0.36, 16, 1.7, GOLD), ball('db', 0.5, 0.35, 15.6, 0.8, '#E8A15A'));
      break;
    case 'camasir':
      faces = [...b('w', 0.25, 0.25, 0.5, 0.5, 0, 18, WHITE), ...b('s', 0.74, 0.12, 0.18, 0.2, 0, 6, '#D8C2A8')];
      extra.push(ball('d', 0.75, 0.5, 9, 4.5, WATER), ball('c1', 0.8, 0.2, 7, 2.2, '#E58C7E'), ball('c2', 0.84, 0.25, 7.5, 2, '#78A1BB'));
      break;
    case 'calisma':
      faces = [
        ...b('d', 0.18, 0.14, 0.34, 0.72, 0, 12, WOOD),
        ...b('l', 0.26, 0.34, 0.18, 0.3, 12, 1.5, '#283044'),
        ...b('c', 0.62, 0.4, 0.22, 0.22, 0, 7, col.hi),
        // Ekran ve saksı.
        ...b('e', 0.2, 0.62, 0.04, 0.2, 12, 9, '#283044'),
      ];
      extra.push(ball('sa', 0.24, 0.24, 15, 3.6, LEAF), ball('ek', 0.22, 0.72, 17, 5, '#9CC9E0', 0.3));
      break;
    case 'balkon':
      faces = [...b('p', 0.36, 0.36, 0.28, 0.28, 0, 8, POT), ...b('s', 0.72, 0.16, 0.18, 0.18, 0, 6, WOOD)];
      extra.push(ball('a', 0.5, 0.5, 18, 8, LEAF), ball('b', 0.42, 0.58, 24, 5.5, shade(LEAF, 0.15)), ball('f', 0.46, 0.44, 22, 2, '#F4A6C0'));
      break;
    case 'antre':
      faces = [
        ...b('h', 0.2, 0.22, 0.6, 0.56, 0, 1, '#BFA89E'),
        ...b('a', 0.14, 0.14, 0.18, 0.72, 0, 9, WOOD),
        // Paspasın üstünde bir çift ayakkabı.
        ...b('s1', 0.62, 0.38, 0.12, 0.07, 1, 2.5, '#5B4A40'),
        ...b('s2', 0.62, 0.5, 0.12, 0.07, 1, 2.5, '#5B4A40'),
      ];
      extra.push(ball('sk', 0.2, 0.8, 12, 2.2, '#E58C7E'));
      break;
  }
  return [
    ...faces.map(f => <Polygon key={f.key} points={f.points} fill={f.fill} stroke={f.fill} strokeWidth={0.6} strokeLinejoin="round" />),
    ...extra,
  ];
}

const BRICK = '#DDA48C';
const BEAM = '#A9825F';
const GOLD = '#F2C46D';

/** Mağazadan alınan eşyalar (src/domain/items.ts). Koordinatlar blok içinde 0–1 arası. */
function itemShape(id: string, r: number, c: number, k: string): ReactElement[] {
  const b = (n: string, u: number, v: number, du: number, dv: number, z: number, h: number, color: string) =>
    box(k + n, r + u, c + v, du, dv, z, h, color);
  const ball = (n: string, u: number, v: number, z: number, rad: number, fill: string, op = 1) => {
    const [x, y] = P(r + u, c + v, z);
    return <Circle key={k + n} cx={x} cy={y} r={rad} fill={fill} fillOpacity={op} />;
  };
  let faces: Face[] = [];
  const extra: ReactElement[] = [];
  switch (id) {
    case 'saksi':
      faces = b('p', 0.38, 0.38, 0.24, 0.24, 0, 7, POT);
      extra.push(ball('a', 0.5, 0.5, 15, 6, LEAF), ball('b', 0.44, 0.58, 20, 4, shade(LEAF, 0.15)), ball('c', 0.5, 0.42, 21, 2.5, '#E58C7E'));
      break;
    case 'puf':
      faces = [...b('p', 0.32, 0.32, 0.36, 0.36, 0, 7, '#E8A15A'), ...b('t', 0.35, 0.35, 0.3, 0.3, 7, 1.5, shade('#E8A15A', 0.25))];
      break;
    case 'hali':
      faces = [...b('h', 0.12, 0.12, 0.76, 0.76, 0, 0.8, '#9CB9D0'), ...b('i', 0.24, 0.24, 0.52, 0.52, 0.8, 0.4, '#D6E4EC')];
      break;
    case 'abajur':
      faces = [...b('a', 0.44, 0.44, 0.12, 0.12, 0, 1.5, BEAM), ...b('p', 0.48, 0.48, 0.04, 0.04, 1.5, 15, BEAM), ...b('s', 0.38, 0.38, 0.24, 0.24, 15, 8, GOLD)];
      extra.push(ball('g', 0.5, 0.5, 12, 9, GOLD, 0.25));
      break;
    case 'kitaplik':
      faces = [...b('k', 0.16, 0.2, 0.2, 0.6, 0, 26, WOOD)];
      ['#E58C7E', '#78A1BB', GOLD, LEAF].forEach((col, i) => faces.push(...b('b' + i, 0.36, 0.24 + i * 0.13, 0.03, 0.1, 4 + (i % 2) * 11, 8, col)));
      break;
    case 'gitar':
      faces = b('n', 0.46, 0.47, 0.06, 0.06, 6, 20, BEAM);
      extra.push(ball('a', 0.5, 0.5, 6, 6.5, '#C8826B'), ball('b', 0.5, 0.5, 12, 4.5, '#C8826B'), ball('h', 0.5, 0.5, 7, 1.8, '#5B4A40'));
      break;
    case 'kedi':
    case 'kopek': {
      const fur = id === 'kedi' ? '#E3A869' : '#B07D56';
      const ear = id === 'kedi' ? '#E3A869' : '#7A5236';
      const [hx, hy] = P(r + 0.42, c + 0.58, 12);
      extra.push(
        <Ellipse key={k + 'g'} cx={P(r + 0.5, c + 0.5, 0)[0]} cy={P(r + 0.5, c + 0.5, 0)[1]} rx={9} ry={4} fill="rgba(40,48,68,0.12)" />,
        ball('b', 0.52, 0.46, 6, 6.5, fur),
        id === 'kedi'
          ? <Polygon key={k + 'e'} points={pts([[hx - 4.5, hy - 1], [hx - 3.5, hy - 7.5], [hx - 0.5, hy - 3], [hx + 0.5, hy - 3], [hx + 3.5, hy - 7.5], [hx + 4.5, hy - 1]])} fill={ear} />
          : <Ellipse key={k + 'e'} cx={hx} cy={hy + 1} rx={6.5} ry={3} fill={ear} />,
        ball('h', 0.42, 0.58, 12, 4.8, fur),
        <Circle key={k + 'i'} cx={hx - 1.7} cy={hy - 0.5} r={0.9} fill="#283044" />,
        <Circle key={k + 'j'} cx={hx + 1.7} cy={hy - 0.5} r={0.9} fill="#283044" />,
      );
      break;
    }
    case 'akvaryum':
      faces = [...b('s', 0.36, 0.22, 0.28, 0.56, 0, 6, WOOD), ...b('w', 0.38, 0.24, 0.24, 0.52, 6, 11, WATER)];
      extra.push(ball('f', 0.5, 0.45, 11, 2.2, '#E8A15A'), ball('g', 0.48, 0.6, 13, 1.6, GOLD), ball('p', 0.45, 0.35, 8, 1.8, LEAF));
      break;
    case 'somine':
      faces = [...b('s', 0.14, 0.2, 0.22, 0.6, 0, 22, '#C8826B'), ...b('t', 0.12, 0.17, 0.26, 0.66, 22, 2, shade('#C8826B', -0.15))];
      extra.push(ball('f', 0.38, 0.5, 6, 4.5, '#E8A15A'), ball('g', 0.38, 0.5, 8, 2.6, GOLD));
      break;
    case 'piyano':
      faces = [...b('p', 0.16, 0.18, 0.28, 0.64, 0, 18, '#2E3242'), ...b('k', 0.44, 0.2, 0.1, 0.6, 9, 1.5, WHITE)];
      break;
    case 'kahve_makinesi':
      faces = [...b('s', 0.3, 0.3, 0.2, 0.2, 0, 10, '#3A302A'), ...b('c', 0.34, 0.34, 0.12, 0.12, 10, 4, GOLD)];
      extra.push(ball('st', 0.4, 0.4, 14, 2, WHITE));
      break;
    case 'tv_unitesi':
      faces = [...b('u', 0.15, 0.15, 0.2, 0.7, 0, 8, WOOD), ...b('t', 0.2, 0.35, 0.08, 0.4, 8, 14, '#2E3242')];
      break;
    case 'teleskop':
      faces = [...b('st', 0.4, 0.4, 0.2, 0.2, 0, 14, '#5B4A40')];
      extra.push(ball('t', 0.5, 0.5, 14, 5, GOLD));
      break;
    case 'avize':
      faces = [...b('l', 0.45, 0.45, 0.1, 0.1, 24, 6, GOLD)];
      extra.push(ball('g', 0.5, 0.5, 20, 8, GOLD, 0.3));
      break;
    case 'bilardo':
      faces = [...b('m', 0.15, 0.15, 0.7, 0.5, 0, 12, '#38533F'), ...b('f', 0.15, 0.15, 0.06, 0.5, 12, 2, WOOD)];
      break;
  }
  return [
    ...faces.map(f => <Polygon key={f.key} points={f.points} fill={f.fill} stroke={f.fill} strokeWidth={0.6} strokeLinejoin="round" />),
    ...extra,
  ];
}

/**
 * Evin çevresi: ev bitince bayrak, sonraki günlerde çim, çiçek, çalı, ağaç, çit, taş yol, kelebek, yıldız.
 * `back` evden önce, `front` evden sonra çizilir.
 */
function gardenParts(S: AppState, L: number, dark: boolean, theme: HouseTheme) {
  const back: ReactElement[] = [];
  const front: ReactElement[] = [];
  const out: Pt[] = [];
  let ground: ReactElement | null = null;
  const { cols, cells } = S;
  let r0 = Infinity, c0 = Infinity, r1 = -1, c1 = -1;
  let top = -1;
  cells.forEach((x, i) => {
    if (!x) return;
    const r = Math.floor(i / cols), c = i % cols;
    r0 = Math.min(r0, r); c0 = Math.min(c0, c); r1 = Math.max(r1, r + 1); c1 = Math.max(c1, c + 1);
    if (top < 0 || r + c < Math.floor(top / cols) + (top % cols)) top = i;
  });
  if (r1 < 0 || L < 7) return { ground, back, front, pts: out };
  const m = 0.8;
  const grass = GRASS[theme]?.[dark ? 1 : 0] ?? (dark ? '#3E5A45' : '#BBD9AE');

  if (L >= 9) {
    const g = [P(r0 - m, c0 - m, -SLAB), P(r0 - m, c1 + m, -SLAB), P(r1 + m, c1 + m, -SLAB), P(r1 + m, c0 - m, -SLAB)];
    const d = (p: Pt): Pt => [p[0], p[1] + 6];
    ground = (
      <G key="gr">
        <Polygon points={pts([g[3], g[2], d(g[2]), d(g[3])])} fill={shade(grass, -0.12)} />
        <Polygon points={pts([g[1], g[2], d(g[2]), d(g[1])])} fill={shade(grass, -0.22)} />
        <Polygon points={pts(g)} fill={grass} />
      </G>
    );
    out.push(...g.map(d));
  }

  // Bayrak (7) ve altın yıldız (37): en arkadaki bloğun köşesinde.
  const tr = Math.floor(top / cols), tc = top % cols;
  const [fx, fy] = P(tr, tc, WALL_H);
  back.push(
    <Line key="fp" x1={fx} y1={fy} x2={fx} y2={fy - 28} stroke="#5B4A40" strokeWidth={1.6} strokeLinecap="round" />,
    <Polygon key="ff" points={pts([[fx, fy - 28], [fx + 15, fy - 23.5], [fx, fy - 19]])} fill="#E58C7E" />,
  );
  out.push([fx, fy - 40]);
  if (L >= 37) {
    const star: Pt[] = [];
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5, rad = k % 2 ? 2.6 : 6;
      star.push([fx + rad * Math.cos(a), fy - 32 + rad * Math.sin(a)]);
    }
    back.push(<Polygon key="st" points={pts(star)} fill={GOLD} stroke={shade(GOLD, -0.2)} strokeWidth={0.6} />);
  }
  if (L < 9) return { ground, back, front, pts: out };

  const ball = (list: ReactElement[], key: string, r: number, c: number, z: number, rad: number, fill: string) => {
    const [x, y] = P(r, c, z);
    list.push(<Circle key={key} cx={x} cy={y} r={rad} fill={fill} />);
  };
  const midC = (c0 + c1) / 2;

  // Çiçekler (12): ön iki kenar boyunca.
  if (L >= 12) {
    const colors = ['#E58C7E', GOLD, '#F4A6C0', WHITE];
    let n = 0;
    for (let c = c0 + 0.3; c < c1; c += 0.6)
      if (L < 30 || Math.abs(c - midC) > 0.5) {
        ball(front, 'fl' + n, r1 + m * 0.45, c, 2, 2.6, colors[n % 4]);
        ball(front, 'fc' + n++, r1 + m * 0.45, c, 2, 1, GOLD);
      }
    for (let r = r0 + 0.3; r < r1; r += 0.6) {
      ball(front, 'fl' + n, r, c1 + m * 0.45, 2, 2.6, colors[n % 4]);
      ball(front, 'fc' + n++, r, c1 + m * 0.45, 2, 1, GOLD);
    }
  }
  // Çalılar (15): arka köşelerde.
  if (L >= 15)
    for (const [k, r, c] of [['ba', r0 - m / 2, c0 - m / 2], ['bb', r0 - m / 2, c1 + m / 2]] as [string, number, number][]) {
      ball(back, k + '1', r, c, 6, 8, LEAF);
      ball(back, k + '2', r - 0.1, c + 0.15, 10, 5.5, shade(LEAF, 0.15));
    }
  // Ağaç (18): sol köşede.
  if (L >= 18) {
    const r = r1 + m / 2, c = c0 - m / 2;
    box('tt', r - 0.06, c - 0.06, 0.12, 0.12, 0, 22, BEAM).forEach(f =>
      back.push(<Polygon key={f.key} points={f.points} fill={f.fill} />),
    );
    ball(back, 't1', r, c, 30, 13, shade(LEAF, -0.08));
    ball(back, 't2', r - 0.15, c + 0.2, 40, 10, LEAF);
    ball(back, 't3', r + 0.1, c - 0.15, 44, 7, shade(LEAF, 0.15));
    out.push(P(r, c, 58));
  }
  // Çit (22): ön kenarlarda.
  if (L >= 22) {
    const fence = '#E9DCCB';
    const post = (key: string, r: number, c: number) =>
      box(key, r - 0.04, c - 0.04, 0.08, 0.08, 0, 9, fence).forEach(f => front.push(<Polygon key={f.key} points={f.points} fill={f.fill} />));
    const rr = r1 + m * 0.85, cc = c1 + m * 0.85;
    const [ax, ay] = P(rr, c0 - m * 0.6, 6), [bx, by] = P(rr, cc, 6), [cx, cy] = P(r0 - m * 0.6, cc, 6);
    front.push(<Polyline key="fr" points={pts([[ax, ay], [bx, by], [cx, cy]])} fill="none" stroke={shade(fence, -0.1)} strokeWidth={1.6} />);
    let n = 0;
    for (let c = c0 - m * 0.6; c <= cc; c += 0.5) post('fp' + n++, rr, c);
    for (let r = r0 - m * 0.6; r < rr; r += 0.5) post('fp' + n++, r, cc);
  }
  // Taş yol (30): ön ortadan dışarı.
  if (L >= 30)
    for (let k = 0; k < 3; k++) {
      const [x, y] = P(r1 + 0.15 + k * 0.25, midC + (k % 2 ? 0.08 : -0.08), 0.5);
      front.push(<Ellipse key={'ty' + k} cx={x} cy={y} rx={5} ry={2.4} fill={dark ? '#8A8F9C' : '#D3D0CA'} />);
    }
  // Kelebekler (34).
  if (L >= 34)
    [[r0 + 0.5, c1 - 0.5, 56, '#F4A6C0'], [r1 - 0.8, c0 + 1, 50, '#9CC9E0'], [(r0 + r1) / 2, (c0 + c1) / 2, 64, GOLD]].forEach(
      ([r, c, z, col], k) => {
        const [x, y] = P(r as number, c as number, z as number);
        front.push(
          <Ellipse key={'kl' + k} cx={x - 2.4} cy={y} rx={2.6} ry={1.8} fill={col as string} />,
          <Ellipse key={'kr' + k} cx={x + 2.4} cy={y} rx={2.6} ry={1.8} fill={col as string} />,
        );
        out.push([x, y - 4]);
      },
    );
  return { ground, back, front, pts: out };
}

/**
 * Evin önü: köşede fener direği ve posta kutusu (ışığı kişiliğin renginde), tatildeyse kapıda bavul,
 * Moka'nın bahçesinde açıp albüme alınan çiçekler sağ kenarda saksı olarak. Ev bitince (7) görünür.
 */
function yardParts(S: AppState, L: number, dark: boolean, mood: Mood, lamp: string) {
  const els: ReactElement[] = [];
  const out: Pt[] = [];
  const { cols, cells } = S;
  let r0 = Infinity, c0 = Infinity, r1 = -1, c1 = -1;
  cells.forEach((x, i) => {
    if (!x) return;
    const r = Math.floor(i / cols), c = i % cols;
    r0 = Math.min(r0, r); c0 = Math.min(c0, c); r1 = Math.max(r1, r + 1); c1 = Math.max(c1, c + 1);
  });
  if (r1 < 0 || L < 7) return { els, pts: out };
  const face = (f: Face) => els.push(<Polygon key={f.key} points={f.points} fill={f.fill} stroke={f.fill} strokeWidth={0.6} strokeLinejoin="round" />);

  // Albümdeki çiçekler: sağ kenar boyunca küçük saksılar (en fazla sığdığı kadar).
  const album = Object.entries(S.play?.garden?.album ?? {}).flatMap(([id, n]) => Array(Math.min(n, 3)).fill(id) as string[]);
  const slots = Math.max(0, Math.floor((r1 - r0 - 0.4) / 0.5));
  album.slice(0, slots).forEach((id, j) => {
    const f = FLOWER[id];
    if (!f) return;
    const r = r0 + 0.35 + j * 0.5, c = c1 + 0.16;
    box('ap' + j, r - 0.06, c - 0.06, 0.12, 0.12, 0, 4, POT).forEach(face);
    const [x, y] = P(r, c, 4);
    els.push(<Line key={'as' + j} x1={x} y1={y} x2={x} y2={y - 7} stroke={shade(LEAF, -0.15)} strokeWidth={1.2} />);
    els.push(<G key={'af' + j}>{bloom(f, x, y - 9, 0.42, 'ab' + j)}</G>);
    out.push([x, y - 14]);
  });

  // Fener direği ve posta kutusu: ön sağ köşede.
  const lr = r1 + 0.3, lc = c1 + 0.3;
  box('lp', lr - 0.03, lc - 0.03, 0.06, 0.06, 0, 30, '#5B4A40').forEach(face);
  box('lb', lr - 0.07, lc - 0.07, 0.14, 0.14, 30, 6, '#5B4A40').forEach(face);
  const [lx, ly] = P(lr, lc, 33);
  const on = mood !== 'sessiz' && mood !== 'tatil';
  els.push(<Circle key="lg" cx={lx} cy={ly} r={3} fill={on ? lamp : dark ? '#6B6F7C' : '#D8D2C8'} />);
  if (on) els.push(<Circle key="lh" cx={lx} cy={ly} r={10} fill={lamp} fillOpacity={0.25} />);
  box('mb', lr - 0.16, lc - 0.25, 0.14, 0.1, 12, 7, '#78A1BB').forEach(face);
  out.push([lx, ly - 12]);

  // Tatil: kapının önünde bavul.
  if (mood === 'tatil') {
    const sr = r1 + 0.2, sc = c1 - 0.7;
    box('bv', sr, sc, 0.12, 0.26, 0, 11, '#E8A15A').forEach(face);
    box('bs', sr + 0.04, sc + 0.09, 0.04, 0.08, 11, 3, '#5B4A40').forEach(face);
  }
  return { els, pts: out };
}

/** Temalara göre çim rengi [açık, koyu]. Gündüz varsayılan renktir. */
const GRASS: Partial<Record<HouseTheme, [string, string]>> = {
  gece: ['#6F9A7C', '#2F4A3A'],
  kis: ['#F3F7FA', '#C9D3DE'],
  sonbahar: ['#D9B36C', '#7A6236'],
};
/** Gökyüzü [açık, koyu]. */
const SKY: Partial<Record<HouseTheme, [string, string]>> = {
  gece: ['#2B3556', '#1A2033'],
  kis: ['#DCE8F2', '#2E3A52'],
  sonbahar: ['#F6E6D3', '#4A3B36'],
};

/** Aynı ev için hep aynı yerlere düşen "rastgele" noktalar. */
function scatter(n: number, seed: number) {
  let x = seed;
  const r = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: n }, () => [r(), r(), r()] as const);
}

/** Temanın gökyüzü (arkada) ve süsleri (önde): yıldızlar ve ay, kar taneleri ya da düşen yapraklar. */
function themeParts(theme: HouseTheme, dark: boolean, box: { x: number; y: number; w: number; h: number }) {
  const sky = SKY[theme];
  if (!sky) return { back: null, front: null };
  const { x, y, w, h } = box;
  const back: ReactElement[] = [<Rect key="sky" x={x} y={y} width={w} height={h} rx={22} fill={sky[dark ? 1 : 0]} />];
  const front: ReactElement[] = [];
  if (theme === 'gece') {
    scatter(26, 7).forEach(([u, v, k], i) =>
      back.push(<Circle key={'st' + i} cx={x + u * w} cy={y + v * h * 0.45} r={0.8 + k * 1.2} fill="#FFF6D8" opacity={0.5 + k * 0.5} />),
    );
    const mx = x + w * 0.84, my = y + h * 0.13, mr = Math.min(w, h) * 0.06;
    back.push(
      <Circle key="moon" cx={mx} cy={my} r={mr} fill="#FFF1B8" />,
      <Circle key="moonCut" cx={mx + mr * 0.45} cy={my - mr * 0.3} r={mr * 0.85} fill={sky[dark ? 1 : 0]} />,
    );
  } else if (theme === 'kis') {
    scatter(40, 3).forEach(([u, v, k], i) =>
      front.push(<Circle key={'sn' + i} cx={x + u * w} cy={y + v * h} r={1 + k * 1.8} fill="#FFFFFF" opacity={0.65 + k * 0.35} />),
    );
  } else if (theme === 'sonbahar') {
    const leaf = ['#D9813F', '#C2543A', '#E3A64B', '#A86B3C'];
    scatter(18, 11).forEach(([u, v, k], i) => {
      const cx = x + u * w, cy = y + v * h;
      front.push(<Ellipse key={'lf' + i} cx={cx} cy={cy} rx={4.6} ry={2.2} fill={leaf[i % 4]} opacity={0.9} transform={`rotate(${Math.round(k * 180)} ${cx.toFixed(1)} ${cy.toFixed(1)})`} />);
    });
  }
  return { back, front };
}

type Props = {
  state: AppState;
  onOpenRoom?: (id: string) => void;
  now?: number;
  /**
   * Evin inşaat seviyesi ve bakımsızlığı (src/domain/play.ts, `houseProgress`).
   * 0 boş arsa, 1 kalaslar, 2 iskelet, 3 yarım duvarlar, 4 boyalı duvarlar, 5 pencereler, 6 eşyalar,
   * 7 bitti (bayrak), sonrası bahçe süsleri. `idle` 1 toz, 2 çatlak, 3+ moloz. Verilmezse ev tamamdır.
   */
  build?: { level: number; idle: number };
  /** Evin teması (gündüz, gece, kış, sonbahar). Premium kontrolü çağıran tarafta (`themeFor`). */
  theme?: HouseTheme;
  /** Oda etiketleri görünsün mü (paylaşılan kartlarda ve hikâyede gizli). */
  labels?: boolean;
  /**
   * Evin ruh hali (src/domain/garden.ts, `houseMood`): kaç pencerenin yanacağı, perdeler, bacadan duman.
   * Sadece görüntü; seviye ve bakımsızlık `build`'den gelir. Verilmezse "keyifli".
   */
  mood?: Mood;
};

export function House3D({ state: S, onOpenRoom, now: nowProp, build, theme = 'gunduz', labels: showLabels = true, mood = 'keyifli' }: Props) {
  const L = build?.level ?? MAX_LEVEL;
  const idle = L > 0 ? build?.idle ?? 0 : 0;
  const c = useColors();
  const tick = useNow();
  const now = nowProp ?? tick;
  const dark = useIsDark();
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState(false);

  // Açılışta ev hafifçe zıplayarak yerine otursun.
  const [pop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }).start();
  }, [pop]);

  const { cols, rows, cells } = S;
  const at = (r: number, col: number) => (r >= 0 && r < rows && col >= 0 && col < cols ? cells[r * cols + col] : null);

  const wallFace = dark ? c.surface2 : WHITE;
  const cap = c.wall;
  const slab = dark ? '#5A4F50' : '#BFA89E';

  // Her odanın etiketi odanın ortasına en yakın blokta durur. Eşya, etiketin altında
  // kalmasın diye mümkünse onun hemen arkasındaki bir blokta.
  const anchors: Record<string, number> = {};
  const props: Record<string, number> = {};
  const depth = (i: number) => Math.floor(i / cols) + (i % cols);
  for (const id of S.order) {
    const mine: number[] = [];
    cells.forEach((x, i) => x === id && mine.push(i));
    if (!mine.length) continue;
    const cr = mine.reduce((s, i) => s + Math.floor(i / cols), 0) / mine.length;
    const cc = mine.reduce((s, i) => s + (i % cols), 0) / mine.length;
    const d = (i: number) => (Math.floor(i / cols) - cr + 0.5) ** 2 + ((i % cols) - cc + 0.5) ** 2;
    const nearest = (xs: number[]) => xs.reduce((best, i) => (d(i) < d(best) ? i : best), xs[0]);
    const a = nearest(mine);
    anchors[id] = a;
    const behind = mine.filter(i => depth(i) < depth(a));
    const rest = mine.filter(i => i !== a);
    props[id] = behind.length ? nearest(behind) : rest.length ? nearest(rest) : a;
  }

  // Canlı ev haritası: her odanın temizlik yüzdesi. Kirlendikçe zemin solar ve tozlanır, iş yapılınca parlar.
  const clean: Record<string, number> = {};
  for (const id of S.order) clean[id] = roomClean(S, id, now);
  const DUSTY = dark ? '#5E5A57' : '#BDB3A6';

  // Mağazadan alınan eşyalar: odanın etiket ve eşya dışındaki bloklarına sırayla.
  const itemAt: Record<number, string[]> = {};
  for (const [item, rid] of Object.entries(S.play?.placed ?? {})) {
    if (!rid || !S.rooms[rid] || !S.play.owned.includes(item)) continue;
    const mine: number[] = [];
    cells.forEach((x, i) => x === rid && mine.push(i));
    if (!mine.length) continue;
    const free = mine.filter(i => i !== anchors[rid] && i !== props[rid] && !itemAt[i]);
    const i = free.length ? free[0] : mine.find(j => j !== props[rid]) ?? mine[0];
    (itemAt[i] ||= []).push(item);
  }

  // Ressam sıralaması: arkadaki bloklar (satır + sütun küçük olan) önce çizilir.
  const order = cells.map((_, i) => i).filter(i => cells[i]);
  order.sort((a, b) => Math.floor(a / cols) + (a % cols) - (Math.floor(b / cols) + (b % cols)) || a - b);
  // Bacanın durduğu blok: en arkadakilerden ikincisi (ilki bayrağın köşesi), yoksa ilki.
  const topCell = order.find((i, j) => j > 0 && !at(Math.floor(i / cols) - 1, i % cols)) ?? order[0];

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const grow = ([x, y]: Pt) => {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  };
  const els: ReactElement[] = [];
  const add = (f: Face) =>
    els.push(
      <Polygon
        key={f.key}
        points={f.points}
        fill={f.fill}
        stroke={f.fill}
        strokeWidth={0.8}
        strokeLinejoin="round"
        onPress={f.onPress}
      />,
    );

  // Seviyeye göre duvarlar: 2 iskelet, 3 yarım boy tuğla, 4+ boyalı.
  const painted = L >= 4;
  const wallColor = painted ? wallFace : BRICK;
  const capColor = painted ? cap : shade(BRICK, -0.15);
  const wallH = (h: number) => (L === 3 ? Math.round(h * 0.55) : h);
  const wall = (key: string, r0: number, c0: number, dr: number, dc: number, h: number) =>
    box(key, r0, c0, dr, dc, 0, h, wallColor).forEach(f => add({ ...f, fill: f.key.endsWith('t') ? capColor : f.fill }));
  /** İskelet: köşede bir direk ve duvar boyunca üst kiriş. */
  const frame = (key: string, r0: number, c0: number, dr: number, dc: number, h: number) => {
    box(key + 'p', r0, c0, T * 0.7, T * 0.7, 0, h, BEAM).forEach(add);
    box(key + 'k', r0, c0, Math.max(dr, T * 0.7), Math.max(dc, T * 0.7), h - 3, 3, shade(BEAM, 0.1)).forEach(add);
  };
  // Kişilik ve ruh hali: pencere ışığının rengi ve kaç pencerenin yandığı.
  const persona = personaOf(S.play);
  const glow = PERSONA_LIGHT[persona];
  const light = MOOD_LIGHT[mood];
  const curtain = mood === 'tatil' ? 1 : mood === 'uykulu' || mood === 'sessiz' ? 0.5 : 0;
  /**
   * Dış duvardaki pencere. `at(u, z)` duvar düzlemindeki noktayı verir (u: duvar boyunca 0–1).
   * Yanan pencere kişiliğin renginde parlar; ruh haline göre perdeler kapanır.
   */
  const windowAt = (key: string, seed: number, at: (u: number, z: number) => Pt) => {
    const lit = ((seed * 7) % 10) / 10 < light;
    const pane = lit ? glow[seed % glow.length] : dark ? shade(c.hi, -0.35) : c.hi;
    const quad = (u0: number, u1: number, z0: number, z1: number) => pts([at(u0, z0), at(u1, z0), at(u1, z1), at(u0, z1)]);
    els.push(<Polygon key={key} points={quad(0.32, 0.68, 13, 25)} fill={pane} stroke={capColor} strokeWidth={0.9} strokeLinejoin="round" />);
    if (lit) {
      const [gx, gy] = at(0.5, 19);
      els.push(<Circle key={key + 'g'} cx={gx} cy={gy} r={11} fill={pane} fillOpacity={0.22} />);
    }
    const [ax, ay] = at(0.5, 13), [bx, by] = at(0.5, 25), [lx, ly] = at(0.32, 19), [rx, ry] = at(0.68, 19);
    els.push(
      <Line key={key + 'v'} x1={ax} y1={ay} x2={bx} y2={by} stroke={capColor} strokeWidth={0.8} />,
      <Line key={key + 'h'} x1={lx} y1={ly} x2={rx} y2={ry} stroke={capColor} strokeWidth={0.8} />,
    );
    // Perdeler: yarı (uykulu, sessiz) ya da tam kapalı (tatil). Açıkken kenarlarda toplanmış.
    const w = 0.04 + curtain * 0.14;
    const cur = dark ? '#8C7E8A' : '#E8D5C4';
    els.push(
      <Polygon key={key + 'c1'} points={quad(0.32, 0.32 + w, 13, 25)} fill={cur} />,
      <Polygon key={key + 'c2'} points={quad(0.68 - w, 0.68, 13, 25)} fill={cur} />,
    );
  };
  /** Pencere olmayan dış duvarda küçük bir tablo. */
  const PICS = ['#E58C7E', '#78A1BB', '#A6D49B', '#F2C46D'];
  const pictureAt = (key: string, seed: number, at: (u: number, z: number) => Pt) => {
    const q = (u0: number, u1: number, z0: number, z1: number) => pts([at(u0, z0), at(u1, z0), at(u1, z1), at(u0, z1)]);
    els.push(
      <Polygon key={key} points={q(0.36, 0.64, 15, 26)} fill={WOOD} />,
      <Polygon key={key + 'i'} points={q(0.4, 0.6, 16.5, 24.5)} fill={PICS[seed % PICS.length]} />,
      <Circle key={key + 's'} cx={at(0.47, 22)[0]} cy={at(0.47, 22)[1]} r={1.3} fill={WHITE} fillOpacity={0.8} />,
    );
  };

  const crack = (key: string, ps: Pt[]) =>
    els.push(<Polyline key={key} points={pts(ps)} fill="none" stroke="#5B4A40" strokeWidth={1.1} strokeLinejoin="round" strokeLinecap="round" />);

  for (const i of order) {
    const id = cells[i]!;
    const room = S.rooms[id];
    if (!room) continue;
    const r = Math.floor(i / cols), col = i % cols;
    for (const pt of [P(r, col, WALL_H), P(r + 1, col + 1, -SLAB), P(r + 1, col, -SLAB), P(r, col + 1, -SLAB), P(r, col, WALL_H + 8)]) grow(pt);
    const open = onOpenRoom ? () => onOpenRoom(id) : undefined;
    const floor = c.room[room.type];
    const k = 'c' + i;
    const tile = pts([P(r, col), P(r, col + 1), P(r + 1, col + 1), P(r + 1, col)]);

    // 0. seviye: boş arsa, sadece kesik çizgili plan.
    if (L < 1) {
      els.push(
        <Polygon key={k + 'f'} points={tile} fill={c.hatch} stroke={c.muted} strokeOpacity={0.5} strokeWidth={1} strokeDasharray="4 3" onPress={open} />,
      );
      continue;
    }

    // Zemin kalınlığı: önü boşsa yan yüzü görünür.
    if (!at(r + 1, col))
      add({ key: k + 'bl', fill: shade(slab, -0.05), points: pts([P(r + 1, col, -SLAB), P(r + 1, col + 1, -SLAB), P(r + 1, col + 1, 0), P(r + 1, col, 0)]) });
    if (!at(r, col + 1))
      add({ key: k + 'br', fill: shade(slab, -0.2), points: pts([P(r, col + 1, -SLAB), P(r + 1, col + 1, -SLAB), P(r + 1, col + 1, 0), P(r, col + 1, 0)]) });

    // Taban. Damalı olsun diye her ikinci blok çok hafif koyu. 4. seviyeye kadar çıplak kalas.
    const p = clean[id] ?? 100;
    const base = painted ? mix(floor, DUSTY, Math.min(1, Math.max(0, (95 - p) / 65)) * 0.8) : WOOD;
    add({ key: k + 'f', fill: (r + col) % 2 ? shade(base, dark ? 0.03 : -0.025) : base, points: tile, onPress: open });
    // Kirli oda: zeminde toz topakları. Ne kadar kirliyse o kadar çok.
    if (p < 80) {
      const n = p < 40 ? 3 : p < 60 ? 2 : (r + col) % 2 === 0 ? 1 : 0;
      for (let j = 0; j < n; j++) {
        const [x, y] = P(r + 0.25 + ((j * 0.31 + r * 0.17) % 0.5), col + 0.2 + ((j * 0.43 + col * 0.13) % 0.6));
        els.push(<Ellipse key={k + 'dd' + j} cx={x} cy={y} rx={3.5} ry={1.6} fill="#9C8C7A" fillOpacity={0.55} />);
      }
    }
    // Tertemiz oda: zeminde minik parıltılar.
    if (painted && p >= 100 && (r * 3 + col) % 3 === 0) {
      const [x, y] = P(r + 0.4, col + 0.6, 2);
      els.push(
        <Polygon key={k + 'sp'} points={pts([[x, y - 5], [x + 1.3, y - 1.3], [x + 5, y], [x + 1.3, y + 1.3], [x, y + 5], [x - 1.3, y + 1.3], [x - 5, y], [x - 1.3, y - 1.3]])} fill={GOLD} />,
      );
    }
    if (!painted)
      for (const u of [1 / 3, 2 / 3])
        els.push(<Line key={k + 'pl' + u} x1={P(r + u, col)[0]} y1={P(r + u, col)[1]} x2={P(r + u, col + 1)[0]} y2={P(r + u, col + 1)[1]} stroke={shade(WOOD, -0.22)} strokeWidth={0.8} />);

    // Bakımsızlık: 1. gün toz.
    if (idle >= 1) {
      els.push(<Polygon key={k + 'dz'} points={tile} fill="#8C7B6B" fillOpacity={0.22} />);
      if ((r + col) % 2 === 0) {
        const [x, y] = P(r + 0.55, col + 0.35);
        els.push(<Ellipse key={k + 'dp'} cx={x} cy={y} rx={4.5} ry={2} fill="#A89886" fillOpacity={0.55} />);
      }
    }

    // Arka duvarlar (kuzey ve batı kenarı). Dışarıya bakan yüksek, iki oda arasındaki alçak.
    const n = at(r - 1, col), w = at(r, col - 1);
    if (n !== id && L >= 2) {
      const h = wallH(n ? INNER_H : WALL_H);
      if (L === 2) frame(k + 'n', r, col, T * 0.7, 1, h);
      else {
        wall(k + 'n', r, col, T, 1, h);
        if (!n && L >= 5 && (r + col) % 2 === 0) windowAt(k + 'nw', r * 3 + col * 5 + 1, (u, z) => P(r + T, col + u, z));
        else if (!n && L >= 6) pictureAt(k + 'np', r + col * 3, (u, z) => P(r + T, col + u, z));
        if (!n && L >= 5 && persona === 'neseli')
          ['#E58C7E', GOLD, '#78A1BB', '#A6D49B'].forEach((col2, j) => {
            const [x0, y0] = P(r + T, col + 0.12 + j * 0.22, WALL_H - 1), [x1, y1] = P(r + T, col + 0.3 + j * 0.22, WALL_H - 1);
            els.push(<Polygon key={k + 'bu' + j} points={pts([[x0, y0], [x1, y1], [(x0 + x1) / 2, (y0 + y1) / 2 + 6]])} fill={col2} />);
          });
        if (idle >= 2 && (r + col) % 2 === 1)
          crack(k + 'nc', [P(r + T, col + 0.5, h - 2), P(r + T, col + 0.6, h - 7), P(r + T, col + 0.47, h - 11), P(r + T, col + 0.58, h - 16)]);
        if (!n && L >= 26)
          for (const v of [0.2, 0.5, 0.8]) {
            const [x, y] = P(r, col + v, WALL_H + 3);
            els.push(<Circle key={k + 'li' + v} cx={x} cy={y} r={1.8} fill={GOLD} />);
          }
      }
    }
    if (w !== id && L >= 2) {
      const h = wallH(w ? INNER_H : WALL_H);
      const r0 = n !== id ? r + T : r;
      if (L === 2) frame(k + 'w', r, col, 1, T * 0.7, h);
      else {
        wall(k + 'w', r0, col, r + 1 - r0, T, h);
        if (!w && L >= 5 && (r + col) % 2 === 1) windowAt(k + 'ww', r * 5 + col * 3 + 2, (u, z) => P(r + u, col + T, z));
        else if (!w && L >= 6) pictureAt(k + 'wp', r * 3 + col + 1, (u, z) => P(r + u, col + T, z));
        if (idle >= 2 && (r + col) % 2 === 0)
          crack(k + 'wc', [P(r + 0.5, col + T, h - 3), P(r + 0.4, col + T, h - 8), P(r + 0.55, col + T, h - 12), P(r + 0.45, col + T, h - 17)]);
      }
    }

    // Baca: en arkadaki bloğun duvarında. Ev keyifliyse duman tüter.
    if (i === topCell && L >= 4 && !at(r - 1, col)) {
      box(k + 'ch', r, col + 0.52, 0.2, 0.2, WALL_H - 6, 16, shade(BRICK, -0.05)).forEach(add);
      box(k + 'cc', r - 0.02, col + 0.5, 0.24, 0.24, WALL_H + 10, 2, shade(BRICK, -0.25)).forEach(add);
      if (L >= 7 && (mood === 'isil' || mood === 'keyifli' || mood === 'uyaniyor'))
        [[0, 6, 3.6], [0.08, 14, 4.6], [0.02, 23, 5.8]].forEach(([dv, dz, rad], j) => {
          const [x, y] = P(r + 0.1, col + 0.62 + dv, WALL_H + 12 + dz);
          els.push(<Circle key={k + 'sm' + j} cx={x} cy={y} r={rad} fill={dark ? '#C9CED8' : WHITE} fillOpacity={0.75 - j * 0.18} />);
        });
    }

    if (props[id] === i && L >= 6) els.push(<G key={k + 'e'} onPress={open}>{furniture(room.type, r, col, k + 'e', c)}</G>);
    for (const item of itemAt[i] ?? []) els.push(<G key={k + 'i' + item} onPress={open}>{itemShape(item, r, col, k + 'i' + item)}</G>);

    // 3. günden sonra: moloz.
    if (idle >= 3 && (r * 7 + col * 3) % 4 === 0) {
      box(k + 'm1', r + 0.62, col + 0.2, 0.16, 0.2, 0, 4, BRICK).forEach(add);
      box(k + 'm2', r + 0.7, col + 0.42, 0.12, 0.12, 0, 3, shade(BRICK, -0.1)).forEach(add);
    }

    // Ön duvarlar: dışarıya bakan kenarlarda alçak bir parapet, içi görünsün.
    if (L >= 3) {
      if (!at(r + 1, col)) wall(k + 's', r + 1 - T, col, T, 1, FRONT_H);
      if (!at(r, col + 1)) wall(k + 'x', r, col + 1 - T, 1, T, FRONT_H);
    } else if (L === 2) {
      if (!at(r + 1, col)) frame(k + 's', r + 1 - T * 0.7, col, T * 0.7, 1, WALL_H);
      if (!at(r, col + 1)) frame(k + 'x', r, col + 1 - T * 0.7, 1, T * 0.7, WALL_H);
    }
  }

  // Bahçe ve süsler (evin çevresinde, ev bitince açılır).
  const garden = gardenParts(S, L, dark, theme);
  garden.pts.forEach(grow);
  const yard = yardParts(S, L, dark, mood, glow[0]);
  yard.pts.forEach(grow);

  if (!els.length) return null;

  const PAD = 10;
  minX -= PAD; maxX += PAD; minY -= PAD; maxY += PAD + 6;
  const vbW = maxX - minX, vbH = maxY - minY;
  const scale = width ? width / vbW : 0;

  const scene = themeParts(theme, dark, { x: minX, y: minY, w: vbW, h: vbH });

  // Evin altındaki yumuşak gölge.
  const shadow = <Ellipse key="sh" cx={(minX + maxX) / 2} cy={maxY - PAD - B * 1.5} rx={vbW * 0.42} ry={B * 1.8} fill={c.lift} />;

  // Etiketler üst üste binmesin: arkadan öne sırayla yerleştir, çakışan etiketi biraz aşağı it.
  const placed: { id: string; x: number; y: number; w: number }[] = [];
  if (width)
    for (const id of [...S.order].filter(id => anchors[id] != null).sort((a, b) => depth(anchors[a]) - depth(anchors[b]))) {
      const i = anchors[id];
      const [x, y0] = P(Math.floor(i / cols) + 0.5, (i % cols) + 0.5, LABEL_Z);
      const nTask = roomCounts(S, id, now);
      const w = 34 + S.rooms[id].name.length * 6.6 + (nTask.late + nTask.today ? 22 : 0);
      let y = (y0 - minY) * scale;
      const lx = (x - minX) * scale;
      for (let pass = 0; pass < 3; pass++)
        for (const o of placed)
          if (Math.abs(o.x - lx) < (o.w + Math.min(w, 140)) / 2 + 2 && Math.abs(o.y - y) < LABEL_H) y = o.y + LABEL_H;
      placed.push({ id, x: lx, y, w: Math.min(w, 140) });
    }

  const labels = placed.map(({ id, x, y }) => {
    const rc = roomCounts(S, id, now);
    const nTask = rc.late + rc.today;
    const room = S.rooms[id];
    return (
      <View key={id} pointerEvents="box-none" style={[styles.anchor, { left: x - ANCHOR_W / 2, top: y - LABEL_H / 2 }]}>
        <Pressable
          onPress={() => onOpenRoom?.(id)}
          accessibilityRole="button"
          accessibilityLabel={`${room.name} odasını aç, yüzde ${clean[id]} temiz${nTask ? `, ${nTask} iş bekliyor` : ''}`}
          hitSlop={4}
          style={({ pressed }) => [
            styles.tag,
            { backgroundColor: c.surface, borderColor: c.line },
            pressed && { transform: [{ translateY: 1 }] },
          ]}
        >
          <Text style={styles.icon}>{clean[id] >= 100 ? '✨' : ROOM_EMOJI[room.type]}</Text>
          <Text style={[styles.name, { color: c.ink }]} numberOfLines={1}>{room.name}</Text>
          {nTask > 0 && (
            <View style={[styles.badge, { backgroundColor: rc.late ? c.late : c.warm }]}>
              <Text style={[styles.badgeText, { color: c.onBadge }]}>{nTask}</Text>
            </View>
          )}
        </Pressable>
      </View>
    );
  });

  return (
    <Pressable
      onPress={() => setZoom(z => !z)}
      accessibilityRole="button"
      accessibilityLabel="Evi yakınlaştır / uzaklaştır"
      style={{ width: '100%' }}
    >
      <Animated.View
        onLayout={e => setWidth(e.nativeEvent.layout.width)}
        style={{
          width: '100%',
          aspectRatio: zoom ? vbW / (vbH * 0.75) : vbW / vbH,
          opacity: pop,
          transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.92, zoom ? 1.25 : 1] }) }],
        }}
      >
        <Svg width="100%" height="100%" viewBox={`${minX} ${minY} ${vbW} ${vbH}`}>
          {scene.back}
          {garden.ground ?? shadow}
          {garden.back}
          {els}
          {yard.els}
          {garden.front}
          {scene.front}
        </Svg>
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          {showLabels && labels}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Noktayı ortalayan sabit boyutlu çapa. Sıfır boyutlu çapa Android'de etiketin içini eziyor.
  anchor: { position: 'absolute', width: ANCHOR_W, height: LABEL_H, alignItems: 'center', justifyContent: 'center' },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingLeft: 6, paddingRight: 8,
    borderRadius: 999, borderWidth: 1.5, maxWidth: ANCHOR_W,
  },
  icon: { fontSize: 12 },
  name: { fontFamily: fonts.display, fontSize: 12, lineHeight: 16, flexShrink: 1 },
  badge: { minWidth: 18, paddingHorizontal: 5, borderRadius: 999, alignItems: 'center', marginLeft: 2 },
  badgeText: { fontFamily: fonts.bodyBlack, fontSize: 11, lineHeight: 16 },
});
