import { useActive } from '@/hooks/useActive';
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text as RNText, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Polygon, Polyline, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { ROOM_EMOJI } from '@/domain/constants';
import { type Mood } from '@/domain/garden';
import { facadeOf, floorOf, spotOf, wallOf, winOf } from '@/domain/look';
import { roomClean, roomCounts } from '@/domain/logic';
import type { Floor } from '@/domain/plan-templates';
import { MAX_LEVEL } from '@/domain/play';
import { RECIPES } from '@/domain/itemRecipes';
import { MokaPet } from '@/components/MokaPet';
import { useNow } from '@/hooks/useNow';
import { sfx, haptic } from '@/lib/sfx';
import { useSky, type Sky } from '@/lib/weather';
import type { AppState, HouseTheme, RoomType } from '@/domain/types';
import { fonts, useColors, useIsDark, type Colors } from '@/theme';

/**
 * Ana ekrandaki ev: kullanıcının bloklarla çizdiği plan, izometrik (yandan-üstten) bir
 * oyuncak ev olarak. Tavan yok; arka duvarlar yüksek, ön duvarlar alçak, böylece odaların
 * içi görünür. Her odanın ortasında türüne göre minik bir eşya durur. Tamamı tek bir SVG,
 * 3D kütüphanesi yok; eski Android telefonlarda da akıcı çalışsın diye.
 */

/** Bir bloğun ekrandaki yarı genişliği ve yarı yüksekliği (2:1 izometrik). */
const A = 34;
const B = 14;
const SLAB = 10;
const WALL_H = 34;
const INNER_H = 20;
/** Balkonun dışa bakan kenarı: korkuluk yüksekliği (evin duvarı değil). */
const RAIL_H = 9;
const FRONT_H = 8;
const T = 0.12;

type Pt = [number, number];
let projectionAngle = 0;
let projectionCenter: [number, number] = [0, 0];
const setProjection = (angle: number, r: number, c: number) => {
  projectionAngle = angle;
  projectionCenter = [r, c];
};
/** Izgara koordinatından (satır, sütun, yükseklik) ekran noktasına. */
const P = (r: number, c: number, z = 0): Pt => {
  const dr = r - projectionCenter[0], dc = c - projectionCenter[1];
  const cos = Math.cos(projectionAngle), sin = Math.sin(projectionAngle);
  const worldR = dr * cos + dc * sin;
  const worldC = dc * cos - dr * sin;
  return [(worldC - worldR) * A, (worldC + worldR) * B - z];
};
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

type Face = { key: string; points: string; fill: string; stroke?: string; strokeWidth?: number; strokeOpacity?: number; onPress?: () => void; edge?: boolean };

/** Yüzü çizer. `edge` yüzler dolgusuz ışık kenarıdır (üst kenar ve öne bakan köşe). */
const renderFace = (f: Face) =>
  f.edge ? (
    <Polyline key={f.key} points={f.points} fill="none" stroke="#FFFFFF" strokeWidth={f.strokeWidth ?? 0.9} strokeOpacity={f.strokeOpacity ?? 0.5} strokeLinecap="round" strokeLinejoin="round" />
  ) : (
    <Polygon key={f.key} points={f.points} fill={f.fill} stroke={f.stroke ?? f.fill} strokeWidth={f.strokeWidth ?? 0.6} strokeOpacity={f.strokeOpacity ?? 1} strokeLinejoin="round" onPress={f.onPress} />
  );

/**
 * Kutunun görünen 3 yüzü: Back-Face Culling ile sadece kameraya bakan 2 yan duvar ve üst yüz çizilir.
 * `hl` > 0 ise üst yüzün öne bakan iki kenarına ve öndeki dikey köşeye o saydamlıkta ışık çizgisi eklenir.
 */
function box(key: string, r0: number, c0: number, dr: number, dc: number, z0: number, h: number, color: string, hl = 0): Face[] {
  const r1 = r0 + dr, c1 = c0 + dc, z1 = z0 + h;
  const sin = Math.sin(projectionAngle), cos = Math.cos(projectionAngle);
  const faces: Face[] = [];
  if (cos - sin > 0)
    faces.push({ key: key + 'l', fill: shade(color, -0.1), points: pts([P(r1, c0, z0), P(r1, c1, z0), P(r1, c1, z1), P(r1, c0, z1)]) });
  else
    faces.push({ key: key + 'b', fill: shade(color, -0.1), points: pts([P(r0, c0, z0), P(r0, c1, z0), P(r0, c1, z1), P(r0, c0, z1)]) });
  if (cos + sin > 0)
    faces.push({ key: key + 'r', fill: shade(color, -0.2), points: pts([P(r0, c1, z0), P(r1, c1, z0), P(r1, c1, z1), P(r0, c1, z1)]) });
  else
    faces.push({ key: key + 'n', fill: shade(color, -0.2), points: pts([P(r0, c0, z0), P(r1, c0, z0), P(r1, c0, z1), P(r0, c0, z1)]) });
  faces.push({ key: key + 't', fill: color, points: pts([P(r0, c0, z1), P(r0, c1, z1), P(r1, c1, z1), P(r1, c0, z1)]) });
  if (hl > 0) {
    const rr = cos - sin > 0 ? r1 : r0, ro = rr === r1 ? r0 : r1;
    const cc = cos + sin > 0 ? c1 : c0, co = cc === c1 ? c0 : c1;
    const w = Math.min(1, 0.5 + h / 40);
    faces.push(
      { key: key + 'hr', edge: true, fill: '', strokeOpacity: hl, strokeWidth: w, points: pts([P(rr, co, z1), P(rr, cc, z1), P(ro, cc, z1)]) },
      { key: key + 'hc', edge: true, fill: '', strokeOpacity: hl * 0.6, strokeWidth: w * 0.8, points: pts([P(rr, cc, z0 + Math.min(2, h * 0.2)), P(rr, cc, z1)]) },
    );
  }
  return faces;
}

const WOOD = '#C9A98F';
const WHITE = '#FAF8F4';
const WATER = '#9CC9E0';
const LEAF = '#7FB28A';
const POT = '#C8826B';

/** Odanın türüne göre minik eşya. Koordinatlar blok içinde 0–1 arası. */
function furniture(type: RoomType, r: number, c: number, k: string, col: Colors, v = 0): ReactElement[] {
  const b = (n: string, u: number, v: number, du: number, dv: number, z: number, h: number, color: string) =>
    box(k + n, r + u, c + v, du, dv, z, h, color, 0.35);
  const ball = (n: string, u: number, v: number, z: number, rad: number, fill: string) => {
    const [x, y] = P(r + u, c + v, z);
    return (
      <G key={k + n}>
        <Circle cx={x} cy={y} r={rad} fill={fill} />
        {rad >= 3 && <Circle cx={x - rad * 0.35} cy={y - rad * 0.4} r={rad * 0.3} fill="#FFFFFF" fillOpacity={0.45} />}
      </G>
    );
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
        ...b('n', 0.16, 0.84, 0.13, 0.12, 0, 8, WOOD),
        ...b('ls', 0.19, 0.87, 0.07, 0.06, 8, 5, '#F2C46D'),
      ];
      break;
    case 'cocuk':
      faces = [
        ...b('a', 0.3, 0.22, 0.22, 0.22, 0, 9, '#E58C7E'),
        ...b('b', 0.3, 0.48, 0.22, 0.22, 0, 9, '#78A1BB'),
        ...b('c', 0.3, 0.35, 0.22, 0.22, 9, 9, '#F2C46D'),
        ...b('rg', 0.55, 0.15, 0.35, 0.7, 0, 0.6, '#9CB9D0'),
      ];
      extra.push(ball('t', 0.72, 0.62, 5, 5, '#E58C7E'));
      break;
    case 'salon':
      faces = [
        ...b('s', 0.24, 0.14, 0.5, 0.72, 0, 7, '#BFA89E'),
        ...b('k', 0.24, 0.14, 0.14, 0.72, 7, 9, shade('#BFA89E', -0.05)),
        ...b('m', 0.4, 0.2, 0.3, 0.28, 7, 3, WHITE),
        ...b('n', 0.4, 0.52, 0.3, 0.28, 7, 3, WHITE),
        ...b('tv', 0.84, 0.22, 0.08, 0.56, 0, 5, WOOD),
        ...b('tl', 0.85, 0.3, 0.03, 0.4, 5, 10, '#283044'),
      ];
      break;
    case 'mutfak':
      faces = [
        ...b('t', 0.12, 0.14, 0.3, 0.72, 0, 15, WHITE),
        ...b('p', 0.18, 0.3, 0.16, 0.18, 15, 6, '#B8584C'),
        ...b('m', 0.58, 0.3, 0.28, 0.42, 0, 9, WOOD),
        ...b('fr', 0.14, 0.88, 0.26, 0.1, 0, 24, '#E6EDF2'),
      ];
      break;
    case 'banyo':
      faces = [...b('k', 0.2, 0.14, 0.62, 0.72, 0, 11, WHITE), ...b('s', 0.26, 0.2, 0.5, 0.6, 11, 0.5, WATER), ...b('lv', 0.84, 0.3, 0.12, 0.3, 0, 8, WHITE)];
      extra.push(ball('a', 0.4, 0.4, 14, 3, WHITE), ball('b', 0.5, 0.55, 14, 2.5, WHITE));
      break;
    case 'camasir':
      faces = b('w', 0.25, 0.25, 0.5, 0.5, 0, 18, WHITE);
      extra.push(ball('d', 0.75, 0.5, 9, 4.5, WATER));
      break;
    case 'calisma':
      faces = [
        ...b('d', 0.18, 0.14, 0.34, 0.72, 0, 12, WOOD),
        ...b('l', 0.26, 0.34, 0.18, 0.3, 12, 1.5, '#283044'),
        ...b('c', 0.62, 0.4, 0.22, 0.22, 0, 7, col.hi),
        ...b('mo', 0.22, 0.42, 0.1, 0.16, 13.5, 6, '#4A5575'),
        ...b('sh', 0.06, 0.2, 0.08, 0.6, 14, 1.5, WOOD),
      ];
      break;
    case 'balkon':
      faces = [...b('p', 0.36, 0.36, 0.28, 0.28, 0, 8, POT)];
      extra.push(ball('a', 0.5, 0.5, 18, 8, LEAF), ball('b', 0.42, 0.58, 24, 5.5, shade(LEAF, 0.15)));
      break;
    case 'antre':
      faces = [...b('h', 0.2, 0.22, 0.6, 0.56, 0, 1, '#BFA89E'), ...b('a', 0.14, 0.14, 0.18, 0.72, 0, 9, WOOD)];
      break;
  }
  if (v > 0) {
    // 2., 3. ... aynı tür oda: standart eşyaya renk lekesi, halı, bitki ve lamba eklenir (sıraya göre sabit).
    const pal = [['#E58C7E', '#78A1BB'], ['#78A1BB', '#F2C46D'], ['#9CB9D0', '#E58C7E'], ['#F2C46D', '#7FB28A']][(v - 1) % 4];
    const corner = v % 2 === 1;
    faces.push(...b('vr', 0.06, corner ? 0.62 : 0.06, 0.28, 0.32, 0, 0.7, pal[0]), ...b('vi', 0.1, corner ? 0.66 : 0.1, 0.2, 0.24, 0.7, 0.4, pal[1]));
    const cu = corner ? 0.9 : 0.1;
    faces.push(...b('vp', 0.8, cu - 0.05, 0.1, 0.1, 0, 5, POT));
    extra.push(ball('vl', 0.85, cu, 11, 5, v % 3 === 0 ? pal[1] : LEAF), ball('vm', 0.83, cu + (corner ? -0.04 : 0.04), 15, 3, shade(LEAF, 0.15)));
    if (v >= 2) faces.push(...b('vq', 0.9, corner ? 0.1 : 0.85, 0.05, 0.05, 0, 14, BEAM), ...b('vs', 0.87, corner ? 0.07 : 0.82, 0.11, 0.11, 14, 5, pal[1]));
  }
  return [...faces.map(renderFace), ...extra];
}

const BRICK = '#DDA48C';
const BEAM = '#A9825F';
const GOLD = '#F2C46D';

/** Mağazadan alınan eşyalar (src/domain/items.ts). Koordinatlar blok içinde 0–1 arası. */
function itemShape(id: string, r: number, c: number, k: string): ReactElement[] {
  const b = (n: string, u: number, v: number, du: number, dv: number, z: number, h: number, color: string) =>
    box(k + n, r + u, c + v, du, dv, z, h, color, 0.35);
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
    case 'komodin':
      faces = b('m', 0.25, 0.25, 0.5, 0.5, 0, 12, WOOD);
      break;
    case 'calisma_masasi':
      faces = [...b('d', 0.15, 0.15, 0.3, 0.7, 0, 12, WOOD), ...b('c', 0.5, 0.4, 0.2, 0.2, 0, 7, '#283044')];
      break;
    case 'berjer':
      faces = [...b('b', 0.2, 0.2, 0.6, 0.6, 0, 8, '#BFA89E'), ...b('bk', 0.2, 0.2, 0.15, 0.6, 8, 14, '#BFA89E')];
      break;
    case 'vazo':
      faces = b('v', 0.35, 0.35, 0.3, 0.3, 0, 10, POT);
      break;
    default:
      for (const part of RECIPES[id] ?? []) {
        if (part[0] === 'b') faces.push(...b(String(extra.length + faces.length), part[1], part[2], part[3], part[4], part[5], part[6], part[7]));
        else extra.push(ball('o' + extra.length + faces.length, part[1], part[2], part[3], part[4], part[5], part[6] ?? 1));
      }
  }
  return [...faces.map(renderFace), ...extra];
}

/** Dört köşeli minik parıltı yıldızı. */
const sparkle = (key: string, x: number, y: number, s: number, fill: string) => (
  <Polygon key={key} points={pts([[x, y - s], [x + s * 0.26, y - s * 0.26], [x + s, y], [x + s * 0.26, y + s * 0.26], [x, y + s], [x - s * 0.26, y + s * 0.26], [x - s, y], [x - s * 0.26, y - s * 0.26]])} fill={fill} />
);

type GroundRing = { k: number; cx: number; cy: number; hw: number; hh: number; els: ReactElement[] };
/** Concentric square rings of the house's own ground material around the footprint, up to 5 blocks out, with flowers on top. */
function buildGroundRings(f: { r0: number; r1: number; c0: number; c1: number }, grass: string, snowy: boolean, dark: boolean): GroundRing[] {
  const Z = -SLAB;
  const [cx, cy] = P((f.r0 + f.r1) / 2, (f.c0 + f.c1) / 2, Z);
  const alt = shade(grass, dark ? 0.06 : -0.05);
  const petals = snowy ? [] : ['#FFFFFF', '#F7D154', '#F29BB5', '#B79CF2', '#F28C6B'];
  const out: GroundRing[] = [];
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let k = 1; k <= 5; k++) {
    let dA = '', dB = '';
    const tiles: Pt[] = [];
    for (let a = f.r0 - k; a < f.r1 + k; a++) {
      for (let b = f.c0 - k; b < f.c1 + k; b++) {
        if (a >= f.r0 - k + 1 && a < f.r1 + k - 1 && b >= f.c0 - k + 1 && b < f.c1 + k - 1) continue;
        const q = [P(a, b, Z), P(a, b + 1, Z), P(a + 1, b + 1, Z), P(a + 1, b, Z)];
        const d = `M${q.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`;
        if ((a + b) % 2) dB += d; else dA += d;
        tiles.push([a, b]);
      }
    }
    const els: ReactElement[] = [
      <Path key="ta" d={dA} fill={grass} stroke={grass} strokeWidth={0.7} strokeLinejoin="round" />,
      <Path key="tb" d={dB} fill={alt} stroke={alt} strokeWidth={0.7} strokeLinejoin="round" />,
    ];
    if (petals.length) {
      const n = Math.round(tiles.length * 0.45);
      for (let j = 0; j < n; j++) {
        const [a, b] = tiles[Math.floor(rnd() * tiles.length)];
        const [x, y] = P(a + 0.2 + rnd() * 0.6, b + 0.2 + rnd() * 0.6, Z);
        const fc = petals[j % petals.length], s0 = 2.2 + rnd() * 1.4;
        els.push(
          <Circle key={'p' + j} cx={x} cy={y} r={s0} fill={fc} />,
          <Circle key={'c' + j} cx={x} cy={y} r={s0 * 0.4} fill={fc === '#F7D154' ? '#F28C6B' : '#F7D154'} />,
        );
      }
    }
    const cs = [P(f.r0 - k, f.c0 - k, Z), P(f.r0 - k, f.c1 + k, Z), P(f.r1 + k, f.c0 - k, Z), P(f.r1 + k, f.c1 + k, Z)];
    out.push({ k, cx, cy, hw: Math.max(...cs.map(([x]) => Math.abs(x - cx))) + 2, hh: Math.max(...cs.map(([, y]) => Math.abs(y - cy))) + 2, els });
  }
  return out;
}

/** Ayrı katmanlarda canlandırılan ışıklar: `breath` yavaşça nefes alır, `twA` ve `twB` sırayla parıldar. */
type Life = { breath: ReactElement[]; twA: ReactElement[]; twB: ReactElement[]; wings: { x: number; y: number; col: string; s: number }[] };
const emptyLife = (): Life => ({ breath: [], twA: [], twB: [], wings: [] });

/**
 * Evin çevresi: ev bitince bayrak, sonraki günlerde çim, çiçek, çalı, ağaç, çit, taş yol, kelebek, yıldız.
 * `back` evden önce, `front` evden sonra çizilir; `life` üstte canlandırılan ışıklardır.
 */
function gardenParts(S: AppState, L: number, dark: boolean, theme: HouseTheme) {
  const back: ReactElement[] = [];
  const front: ReactElement[] = [];
  const sprouts: ReactElement[] = [];
  const out: Pt[] = [];
  const life = emptyLife();
  const night = dark || theme === 'gece';
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
  if (r1 < 0 || L < 7) return { ground, back, front, sprouts, life, pts: out };
  const m = 0.8;
  const grass = GRASS[theme]?.[dark ? 1 : 0] ?? (dark ? '#3E5A45' : '#BBD9AE');

  if (L >= 9) {
    const g = [P(r0 - m, c0 - m, -SLAB), P(r0 - m, c1 + m, -SLAB), P(r1 + m, c1 + m, -SLAB), P(r1 + m, c0 - m, -SLAB)];
    const d = (p: Pt): Pt => [p[0], p[1] + 6];
    const sin = Math.sin(projectionAngle), cos = Math.cos(projectionAngle);
    const sides: ReactElement[] = [];
    if (cos - sin > 0) sides.push(<Polygon key="gr-rp" points={pts([g[3], g[2], d(g[2]), d(g[3])])} fill={shade(grass, -0.12)} />);
    else sides.push(<Polygon key="gr-rn" points={pts([g[0], g[1], d(g[1]), d(g[0])])} fill={shade(grass, -0.12)} />);
    if (cos + sin > 0) sides.push(<Polygon key="gr-cp" points={pts([g[1], g[2], d(g[2]), d(g[1])])} fill={shade(grass, -0.22)} />);
    else sides.push(<Polygon key="gr-cn" points={pts([g[0], g[3], d(g[3]), d(g[0])])} fill={shade(grass, -0.22)} />);
    ground = (
      <G key="gr">
        {sides}
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
  if (L < 9) return { ground, back, front, sprouts, life, pts: out };

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
        life.wings.push({ x, y, col: col as string, s: 1 });
        (k % 2 ? life.twB : life.twA).push(sparkle('ks' + k, x + 5, y - 4, 2, '#FFF6D8'));
        out.push([x, y - 4]);
      },
    );
  // 42+: Ev tamamlandıktan sonra bahçe yüz gün boyunca yeni bir ayrıntıyla büyür.
  if (L >= 42) {
    for (const [k, r, c] of [['la', r1 + m * 0.5, c0 + 0.65], ['lb', r0 + 0.65, c1 + m * 0.5]] as [string, number, number][]) {
      const [x, y] = P(r, c, 0);
      back.push(
        <Polygon key={k + 'b'} points={pts([[x - 1.5, y - 19], [x + 1.5, y - 19], [x + 9, y + 1], [x - 9, y + 1]])} fill="url(#h3dBeam)" opacity={night ? 0.9 : 0.45} />,
        <Ellipse key={k + 'f'} cx={x} cy={y + 1} rx={10} ry={4} fill="url(#h3dLamp)" opacity={night ? 0.8 : 0.4} />,
        <Line key={k + 'p'} x1={x} y1={y} x2={x} y2={y - 17} stroke={BEAM} strokeWidth={2.2} strokeLinecap="round" />,
        <Circle key={k + 'l'} cx={x} cy={y - 19} r={3.2} fill={GOLD} />,
        <Circle key={k + 'w'} cx={x - 1} cy={y - 20} r={1.1} fill="#FFFFFF" fillOpacity={0.8} />,
      );
      life.breath.push(<Circle key={k + 'g'} cx={x} cy={y - 19} r={night ? 13 : 9} fill="url(#h3dLamp)" />);
      out.push([x, y - 27]);
    }
  }
  if (L >= 48) {
    const r = r1 + m / 2, c = c0 - m / 2;
    const [x, y] = P(r, c, 52);
    back.push(
      <Polygon key="birdhouse" points={pts([[x - 8, y], [x, y - 7], [x + 8, y], [x + 7, y + 11], [x - 7, y + 11]])} fill="#E58C7E" stroke="#A9825F" strokeWidth={1.5} />,
      <Circle key="birdhole" cx={x} cy={y + 3} r={2.4} fill="#5B4A40" />,
      <Line key="birdpole" x1={x} y1={y + 10} x2={x} y2={y + 18} stroke={BEAM} strokeWidth={1.4} />,
    );
    out.push([x, y - 9]);
  }
  if (L >= 54) {
    const r = r1 + m * 0.5, c = midC;
    const [x, y] = P(r, c, 1);
    front.push(
      <Ellipse key="pond" cx={x} cy={y} rx={17} ry={8} fill="#82BDD2" stroke="#F5F1E9" strokeWidth={2} />,
      <Ellipse key="pondshine" cx={x - 4} cy={y - 1.5} rx={5} ry={1.3} fill="#E9FAFF" fillOpacity={0.85} />,
    );
    life.breath.push(<Ellipse key="pondripple" cx={x + 3} cy={y + 1} rx={9} ry={3.6} fill="none" stroke="#E9FAFF" strokeWidth={0.8} strokeOpacity={0.7} />);
    life.twA.push(sparkle('pondsa', x - 6, y - 2, 2.6, '#FFFFFF'), <Ellipse key="pondsha" cx={x + 6} cy={y + 2} rx={3} ry={0.8} fill="#FFFFFF" fillOpacity={0.7} />);
    life.twB.push(sparkle('pondsb', x + 7, y - 1, 2.2, '#FFFFFF'), <Ellipse key="pondshb" cx={x - 2} cy={y + 3} rx={3.5} ry={0.8} fill="#FFFFFF" fillOpacity={0.7} />);
  }
  if (L >= 60) {
    const roses = ['#E58C7E', '#F4A6C0', '#C2546C', '#F2C46D'];
    for (let i = 0; i < 8; i++) {
      const r = r1 + m * 0.48, c = c0 + 0.25 + i * Math.max(0.35, (c1 - c0 - 0.5) / 7);
      const [x, y] = P(r, c, 3);
      front.push(<Circle key={'rose' + i} cx={x} cy={y} r={3.2} fill={roses[i % roses.length]} stroke="#FFF7EE" strokeWidth={0.8} />);
    }
  }
  if (L >= 66) {
    const r = r1 + m * 0.85, c = c1 + m * 0.35;
    const [x1, y1] = P(r, c, 0), [x2, y2] = P(r - 0.5, c, 25), [x3, y3] = P(r - 1, c, 0);
    front.push(
      <Polyline key="arch" points={pts([[x1, y1], [x2, y2], [x3, y3]])} fill="none" stroke="#7C9D72" strokeWidth={4} strokeLinecap="round" />,
      <Circle key="archflower1" cx={x2 - 2} cy={y2 + 3} r={3} fill="#F4A6C0" />,
      <Circle key="archflower2" cx={x2 + 3} cy={y2 + 1} r={2.5} fill={GOLD} />,
    );
    out.push([x2, y2 - 4]);
  }
  if (L >= 72) {
    for (let i = 0; i < 5; i++) {
      const [x, y] = P(r0 + 0.35 + i * 0.27, c1 + m * 0.75, 31 + (i % 2) * 5);
      life.wings.push({ x, y, col: ['#F4A6C0', '#9CC9E0', GOLD][i % 3], s: 0.95 });
    }
  }
  if (L >= 78) {
    const r = r1 + m * 0.72, c = c0 + 0.5;
    box('bench', r, c, 0.16, 0.78, 3, 5, BEAM).forEach(f => front.push(<Polygon key={f.key} points={f.points} fill={f.fill} />));
    for (const [i, v] of [0.08, 0.76].entries()) {
      const [x, y] = P(r + 0.1, c + v, 2);
      front.push(<Line key={'benchleg' + i} x1={x} y1={y} x2={x} y2={y + 8} stroke="#795B43" strokeWidth={2} />);
    }
  }
  if (L >= 84) {
    const r = r1 + m * 0.65, c = c0 - m * 0.5;
    const [x, y] = P(r, c, 38);
    back.push(
      <Line key="fruittrunk" x1={x} y1={y + 10} x2={x} y2={y + 24} stroke={BEAM} strokeWidth={3} />,
      <Circle key="fruitcrown1" cx={x} cy={y} r={11} fill="#6F9A64" />,
      <Circle key="fruitcrown2" cx={x - 7} cy={y + 5} r={7} fill="#83AE70" />,
      <Circle key="fruitcrown3" cx={x + 7} cy={y + 5} r={7} fill="#83AE70" />,
      <Circle key="fruit1" cx={x - 4} cy={y + 1} r={2.1} fill="#D95D4F" />,
      <Circle key="fruit2" cx={x + 5} cy={y + 5} r={2.1} fill="#D95D4F" />,
    );
    out.push([x, y - 12]);
  }
  if (L >= 90) {
    const [x, y] = P(r1 + m * 0.5, midC, 5);
    front.push(
      <Ellipse key="fountainbasin" cx={x} cy={y} rx={10} ry={4.7} fill="#89BFD0" stroke="#F5F1E9" strokeWidth={1.4} />,
      <Line key="fountainjet" x1={x} y1={y - 1} x2={x} y2={y - 11} stroke="#9CC9E0" strokeWidth={2} strokeLinecap="round" />,
      <Circle key="fountaincap" cx={x} cy={y - 12} r={2.2} fill="#B8E1EF" />,
    );
    life.twA.push(<Circle key="dropa" cx={x - 3} cy={y - 9} r={1} fill="#E9FAFF" />, <Circle key="dropb" cx={x + 3.5} cy={y - 6} r={0.9} fill="#E9FAFF" />);
    life.twB.push(<Circle key="dropc" cx={x + 2.5} cy={y - 10} r={1} fill="#E9FAFF" />, <Circle key="dropd" cx={x - 3.5} cy={y - 5} r={0.9} fill="#E9FAFF" />);
  }
  if (L >= 95) {
    for (let i = 0; i < 9; i++) {
      const [x, y] = P(r1 + m * 0.9, c0 + 0.1 + i * Math.max(0.25, (c1 - c0 - 0.2) / 8), 10 + (i % 3) * 3);
      front.push(<Circle key={'fairy' + i} cx={x} cy={y} r={2.2} fill={i % 2 ? '#FFF1B8' : '#F4A6C0'} stroke="#FFFFFF" strokeWidth={0.7} />);
      (i % 2 ? life.twB : life.twA).push(<Circle key={'fairyg' + i} cx={x} cy={y} r={6} fill="url(#h3dLamp)" />);
    }
  }
  if (L >= 100) {
    const r = r0 - m * 0.7, c = c1 + m * 0.7;
    const [x, y] = P(r, c, 49);
    back.push(
      <Polygon key="dreamspark" points={pts([[x, y - 10], [x + 2.5, y - 2.5], [x + 10, y], [x + 2.5, y + 2.5], [x, y + 10], [x - 2.5, y + 2.5], [x - 10, y], [x - 2.5, y - 2.5]])} fill={GOLD} stroke="#FFF5C8" strokeWidth={1.2} />,
    );
    life.breath.push(<Circle key="dreamglow" cx={x} cy={y} r={16} fill="url(#h3dLamp)" />);
    out.push([x, y - 12]);
  }
  // Her ev günü yeni bir filiz eklenir; bitkiler evin dış kenarlarına yayılır.
  if (L >= 9) {
    const count = Math.min(12, L - 8);
    for (let i = 0; i < count; i++) {
      const side = i % 4;
      const t = 0.18 + Math.floor(i / 4) * 0.32;
      const [r, c] = side === 0
        ? [r1 + m * 0.55, c0 + (c1 - c0) * t]
        : side === 1
          ? [r1 - (r1 - r0) * t, c1 + m * 0.55]
          : side === 2
            ? [r0 - m * 0.55, c1 - (c1 - c0) * t]
            : [r0 + (r1 - r0) * t, c0 - m * 0.55];
      const [x, y] = P(r, c, 1);
      const leaf = ['#79A96E', '#8DBB78', '#6F9A64'][i % 3];
      sprouts.push(
        <G key={'sprout' + i}>
          <Line x1={x} y1={y} x2={x} y2={y - 7} stroke="#638C5C" strokeWidth={1.5} strokeLinecap="round" />
          <Ellipse cx={x - 2.4} cy={y - 4.2} rx={2.8} ry={1.5} fill={leaf} transform={`rotate(-28 ${x - 2.4} ${y - 4.2})`} />
          <Ellipse cx={x + 2.4} cy={y - 5.7} rx={2.8} ry={1.5} fill={shade(leaf, 0.12)} transform={`rotate(28 ${x + 2.4} ${y - 5.7})`} />
          {L >= 12 && <Circle cx={x} cy={y - 8.5} r={1.8} fill={i % 3 === 0 ? '#F2C46D' : '#E58C7E'} />}
        </G>,
      );
    }
  }
  return { ground, back, front, sprouts, life, pts: out };
}

/** Temalara göre çim rengi [açık, koyu]. Gündüz varsayılan renktir. */
const GRASS: Partial<Record<HouseTheme, [string, string]>> = {
  gece: ['#6F9A7C', '#2F4A3A'],
  kis: ['#F3F7FA', '#C9D3DE'],
  sonbahar: ['#D9B36C', '#7A6236'],
  cottage: ['#A9CFA0', '#46684A'],
  minimal: ['#EDE6DA', '#6F6A62'],
  lavanta: ['#CFC3E3', '#4F4768'],
};
/** Gökyüzü [açık, koyu]. */
const SKY: Partial<Record<HouseTheme, [string, string]>> = {
  gece: ['#2B3556', '#1A2033'],
  kis: ['#DCE8F2', '#2E3A52'],
  sonbahar: ['#F6E6D3', '#4A3B36'],
  cottage: ['#FBEBD8', '#3F3A4A'],
  minimal: ['#F6F1EA', '#3A3844'],
  lavanta: ['#E9E0F5', '#3A3556'],
};

/** Aynı ev için hep aynı yerlere düşen "rastgele" noktalar. */
function scatter(n: number, seed: number) {
  let x = seed;
  const r = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: n }, () => [r(), r(), r()] as const);
}

/** Temanın gökyüzü (arkada) ve süsleri (önde): yıldızlar ve ay, kar taneleri ya da düşen yapraklar. */
function themeParts(theme: HouseTheme, dark: boolean, box: { x: number; y: number; w: number; h: number }, animatedSnow = false, petals = true) {
  const { x, y, w, h } = box;
  const back: ReactElement[] = [];
  const front: ReactElement[] = [];
  if (theme === 'gece' || dark) {
    // Yıldız ve ay: SkyBackdrop.
  } else if (theme === 'kis') {
    if (!animatedSnow) scatter(42, 3).forEach(([u, v, k], i) =>
      front.push(<Circle key={'sn' + i} cx={x + u * w} cy={y + v * h} r={1 + k * 2} fill="#FFFFFF" opacity={0.6 + k * 0.4} />),
    );
  } else if (theme === 'sonbahar') {
    const leaf = ['#D9813F', '#C2543A', '#E3A64B', '#A86B3C'];
    scatter(22, 11).forEach(([u, v, k], i) => {
      const cx = x + u * w, cy = y + v * h;
      front.push(<Ellipse key={'lf' + i} cx={cx} cy={cy} rx={4.8} ry={2.3} fill={leaf[i % 4]} opacity={0.88} transform={`rotate(${Math.round(k * 180)} ${cx.toFixed(1)} ${cy.toFixed(1)})`} />);
    });
  } else if (theme === 'minimal') {
    // Sade: süs yok.
  } else if (petals) {
    // Gündüz / Bahar tatlı süzülen pembe & altın çiçek yaprakları
    const petalColors = ['#F4A6C0', '#FFE082', '#E58C7E', '#FFF0F5'];
    scatter(14, 5).forEach(([u, v, k], i) => {
      const cx = x + u * w, cy = y + v * h * 0.8;
      front.push(<Ellipse key={'pet' + i} cx={cx} cy={cy} rx={3.5} ry={1.8} fill={petalColors[i % 4]} opacity={0.75} transform={`rotate(${Math.round(k * 120)} ${cx.toFixed(1)} ${cy.toFixed(1)})`} />);
    });
  }
  return { back, front };
}

/** Ayrı bir katmanı native driver ile döngüde kaydırır / solduralır. `reduce` açıksa durur. */
function Drift({ vb, scale, dx = 0, dy = 0, ms, restart, fade, reduce, children }: {
  vb: string; scale: number; dx?: number; dy?: number; ms: number; restart?: boolean; fade?: boolean; reduce: boolean; children: ReactElement | ReactElement[];
}) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) return;
    const a = Animated.loop(
      restart
        ? Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: true })
        : Animated.sequence([
            Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
    );
    a.start();
    return () => a.stop();
  }, [v, ms, restart, reduce]);
  const from = restart ? 0 : -1;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: fade ? v.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.8, 0.35, 0] }) : 1,
          transform: [
            { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [from * dx * scale, dx * scale] }) },
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from * dy * scale, dy * scale] }) },
          ],
        },
      ]}
    >
      <Svg width="100%" height="100%" viewBox={vb}>{children}</Svg>
    </Animated.View>
  );
}

type RoamNode = { x: number; y: number; nb: number[] };
type RoamMode = 'walk' | 'sit' | 'sleep' | 'look';

/** Evcil hayvan: odasındaki boş bloklarda gezer; yumuşak hızlanıp yavaşlar, yürürken zıplar, durur, bakar, oturur, uyur. */
function Roamer({ vb, scale, nodes, start, home, kind, reduce, children }: {
  vb: string; scale: number; nodes: RoamNode[]; start: number; home: Pt; kind: 'kedi' | 'kopek'; reduce: boolean; children: ReactElement | ReactElement[];
}) {
  const [x] = useState(() => new Animated.Value(0));
  const [y] = useState(() => new Animated.Value(0));
  const [bob] = useState(() => new Animated.Value(0));
  const [mode, setMode] = useState<RoamMode>('sit');
  const [flip, setFlip] = useState(false);
  const live = useRef({ nodes, scale, cur: start, flip: false });
  live.current.nodes = nodes;
  live.current.scale = scale;
  const sig = nodes.map(n => n.x.toFixed(0) + n.y.toFixed(0)).join('|') + ':' + scale.toFixed(2);
  const dog = kind === 'kopek';

  // Yerleşim (döndürme ya da ölçek değişince) mevcut bloğa oturt.
  useEffect(() => {
    const n = live.current.nodes[live.current.cur] ?? live.current.nodes[0];
    if (!n) return;
    x.setValue(n.x * scale);
    y.setValue(n.y * scale);
  }, [sig, x, y, scale]);

  // Zıplama / nefes döngüsü kipe göre.
  useEffect(() => {
    if (reduce) return;
    const period = mode === 'walk' ? (dog ? 170 : 240) : mode === 'sleep' ? 1500 : mode === 'sit' ? 1000 : 0;
    bob.setValue(0);
    if (!period) return;
    const a = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: period, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: period, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [mode, bob, dog, reduce]);

  // Davranış döngüsü.
  useEffect(() => {
    if (reduce) return;
    let dead = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let anim: Animated.CompositeAnimation | undefined;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const wait = (ms: number, fn: () => void) => { timer = setTimeout(() => { if (!dead) fn(); }, ms); };
    const face = (f: boolean) => { live.current.flip = f; setFlip(f); };

    const path = (from: number, to: number): number[] => {
      const ns = live.current.nodes;
      const prev = new Map<number, number>([[from, -1]]);
      const q = [from];
      while (q.length) {
        const u = q.shift()!;
        if (u === to) break;
        for (const v of ns[u]?.nb ?? []) if (!prev.has(v)) { prev.set(v, u); q.push(v); }
      }
      if (!prev.has(to)) return [];
      const out: number[] = [];
      for (let u = to; u !== -1; u = prev.get(u)!) out.unshift(u);
      return out.slice(1);
    };

    const next = (): void => {
      if (dead) return;
      const ns = live.current.nodes;
      const r = Math.random();
      const canWalk = ns.length > 1;
      if (canWalk && r < 0.5) return walk();
      if (r < 0.7) { setMode('sit'); return wait(rnd(2500, 6000), next); }
      if (r < 0.88) {
        setMode('look');
        face(!live.current.flip);
        return wait(rnd(1200, 2400), () => { if (Math.random() < 0.6) face(!live.current.flip); next(); });
      }
      setMode('sleep');
      wait(rnd(7000, 14000), () => { setMode('sit'); wait(rnd(800, 1600), next); });
    };

    const walk = (): void => {
      const ns = live.current.nodes;
      const sc = live.current.scale;
      const from = Math.min(live.current.cur, ns.length - 1);
      let to = Math.floor(Math.random() * ns.length);
      if (to === from) to = (to + 1) % ns.length;
      const p = path(from, to);
      if (!p.length) return next();
      // Önce yönüne dön, kısa bir an bekle.
      const dx0 = ns[p[0]].x - ns[from].x;
      const need = dx0 !== 0 && (dx0 < 0) !== live.current.flip;
      setMode('look');
      if (need) face(dx0 < 0);
      wait(need ? 220 : 80, () => {
        setMode('walk');
        const speed = (dog ? 24 : 15) * rnd(0.75, 1.3); // vb birimi / sn
        const legs = p.map((idx, k) => {
          const a = k === 0 ? ns[from] : ns[p[k - 1]];
          const b = ns[idx];
          const ms = Math.max(350, (Math.hypot(b.x - a.x, b.y - a.y) / speed) * 1000);
          const easing = p.length === 1 ? Easing.inOut(Easing.quad) : k === 0 ? Easing.in(Easing.quad) : k === p.length - 1 ? Easing.out(Easing.quad) : Easing.linear;
          return Animated.parallel([
            Animated.timing(x, { toValue: b.x * sc, duration: ms, easing, useNativeDriver: true }),
            Animated.timing(y, { toValue: b.y * sc, duration: ms, easing, useNativeDriver: true }),
          ]);
        });
        anim = Animated.sequence(legs);
        // Yürürken dönüşler: yön değişince yüzü çevir.
        let k = 0;
        const turnWatch = () => {
          if (dead) return;
          const a = k === 0 ? ns[from] : ns[p[k - 1]];
          const dx = ns[p[k]].x - a.x;
          if (Math.abs(dx) > 0.5) face(dx < 0);
        };
        const total = p.map((_, i) => {
          const a = i === 0 ? ns[from] : ns[p[i - 1]];
          const b = ns[p[i]];
          return Math.max(350, (Math.hypot(b.x - a.x, b.y - a.y) / speed) * 1000);
        });
        let acc = 0;
        for (let i = 1; i < p.length; i++) {
          acc += total[i - 1];
          const idx = i;
          setTimeout(() => { if (!dead) { k = idx; turnWatch(); } }, acc);
        }
        anim.start(({ finished }) => {
          if (dead || !finished) return;
          live.current.cur = to;
          setMode('sit');
          wait(rnd(1500, 5000), next);
        });
      });
    };

    wait(rnd(500, 3000), next);
    return () => { dead = true; if (timer) clearTimeout(timer); anim?.stop(); };
  }, [x, y, dog, reduce]);

  const amp = (mode === 'walk' ? (dog ? 2.6 : 1.8) : mode === 'sit' ? 0.5 : mode === 'sleep' ? 0.35 : 0) * scale;
  const lie = mode === 'sleep' ? 2.5 * scale : 0;
  const [hx, hy] = home;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { transform: [{ translateX: x }, { translateY: Animated.add(Animated.add(y, bob.interpolate({ inputRange: [0, 1], outputRange: [lie, lie - amp] })), 0) }] },
      ]}
    >
      <Svg width="100%" height="100%" viewBox={vb}>
        <G transform={flip ? `translate(${(2 * hx).toFixed(1)} 0) scale(-1 1)` : undefined}>{children}</G>
        {mode === 'sleep' && (
          <G>
            <SvgText x={hx + 5} y={hy - 8} fontSize={5} fill="#8B786D" opacity={0.9}>z</SvgText>
            <SvgText x={hx + 9} y={hy - 13} fontSize={7} fill="#8B786D" opacity={0.7}>Z</SvgText>
          </G>
        )}
      </Svg>
    </Animated.View>
  );
}

/** Onarım ya da seviye atlama: evin ortasından yıldız halkası saçılır, solar. */
function Burst({ vb, cx, cy, spread }: { vb: string; cx: number; cy: number; spread: number }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const a = Animated.timing(v, { toValue: 1, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [v]);
  const cols = [GOLD, '#FFFFFF', '#E58C7E', '#78A1BB'];
  const stars = Array.from({ length: 12 }, (_, i) => {
    const t = (i / 12) * Math.PI * 2;
    const d = spread * (i % 2 ? 0.55 : 0.8);
    return sparkle('bs' + i, cx + Math.cos(t) * d, cy + Math.sin(t) * d * 0.55, 4 + (i % 3) * 2, cols[i % 4]);
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { opacity: v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.25] }) }] }]}
    >
      <Svg width="100%" height="100%" viewBox={vb}>{stars}</Svg>
    </Animated.View>
  );
}

/** Gökyüzü zemini: hava durumuna göre renk, gece yıldız (parlar) ve ay, gündüz güneş. `bleed` ev kutusunun dışındaki boşluğu da boyar. */
function SkyBackdrop({ colors, w, h, bleed, night, sun, twA, twB, breath }: {
  colors: [string, string]; w: number; h: number; bleed: boolean; night: boolean; sun: boolean;
  twA: Animated.AnimatedInterpolation<number>; twB: Animated.AnimatedInterpolation<number>; breath: Animated.AnimatedInterpolation<number>;
}) {
  const pad = bleed ? 500 : 0;
  const vb = `${-pad} ${-pad} ${w + 2 * pad} ${h + 2 * pad}`;
  const pos = { position: 'absolute' as const, left: -pad, top: -pad };
  const stars = useMemo(() => scatter(bleed ? 90 : 36, 7), [bleed]);
  const starEls = (parity: number) =>
    stars.filter((_, i) => i % 2 === parity).map(([u, v, k], i) => (
      <Circle key={'bs' + parity + i} cx={-pad + u * (w + 2 * pad)} cy={-pad + v * (h * 0.6 + pad)} r={0.8 + k * 1.4} fill="#FFF6D8" opacity={0.5 + k * 0.5} />
    ));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, !bleed && { borderRadius: 22, overflow: 'hidden' }]}>
      <Svg style={pos} width={w + 2 * pad} height={h + 2 * pad} viewBox={vb}>
        <Defs>
          <LinearGradient id="h3dSky" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={h}>
            <Stop offset="0" stopColor={colors[0]} />
            <Stop offset="1" stopColor={colors[1]} />
          </LinearGradient>
        </Defs>
        <Rect x={-pad} y={-pad} width={w + 2 * pad} height={h + 2 * pad} fill="url(#h3dSky)" />
        {night && (
          <>
            <Circle cx={w * 0.84} cy={h * 0.13} r={Math.min(w, h) * 0.06} fill="#FFF1B8" />
            <Circle cx={w * 0.84 + Math.min(w, h) * 0.027} cy={h * 0.13 - Math.min(w, h) * 0.018} r={Math.min(w, h) * 0.051} fill={colors[0]} />
          </>
        )}
      </Svg>
      {night && (
        <>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: twA }]}>
            <Svg style={pos} width={w + 2 * pad} height={h + 2 * pad} viewBox={vb}>{starEls(0)}</Svg>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: twB }]}>
            <Svg style={pos} width={w + 2 * pad} height={h + 2 * pad} viewBox={vb}>{starEls(1)}</Svg>
          </Animated.View>
        </>
      )}
      {sun && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: breath }]}>
          <Svg style={pos} width={w + 2 * pad} height={h + 2 * pad} viewBox={vb}>
            <Circle cx={w * 0.82} cy={h * 0.14} r={Math.min(w, h) * 0.16} fill="#FFE9A6" opacity={0.3} />
            <Circle cx={w * 0.82} cy={h * 0.14} r={Math.min(w, h) * 0.09} fill="#FFE08A" opacity={0.6} />
            <Circle cx={w * 0.82} cy={h * 0.14} r={Math.min(w, h) * 0.055} fill="#FFD25A" />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}

/** Gökyüzü renkleri [üst, alt]. Hava yoksa temanın kendi gökyüzü; gündüz varsayılanı gökyüzü çizmez. */
function skyColors(theme: HouseTheme, dark: boolean, wx: Sky | null): [string, string] | null {
  if (wx) {
    if (dark || !wx.day) return wx.kind === 'clear' ? ['#141B30', '#2B3556'] : ['#1B2336', '#3A445E'];
    switch (wx.kind) {
      case 'clear': return ['#8CC8F0', '#E4F3FB'];
      case 'cloudy': return ['#AEBCCB', '#DCE4EB'];
      case 'rain': case 'storm': return ['#7F8FA3', '#B4BFCC'];
      case 'fog': return ['#C4CCD3', '#E6EAED'];
      case 'snow': return ['#C7D4E1', '#EEF3F7'];
    }
  }
  const t = SKY[theme];
  return t ? [t[dark ? 1 : 0], t[dark ? 1 : 0]] : null;
}

/** Hava: gündüz bulut ve kuş, yağmur ya da kar; ev bitince bacadan duman. */
function ambient(o: { theme: HouseTheme; dark: boolean; wx: Sky | null; L: number; box: { x: number; y: number; w: number; h: number }; chimney?: Pt }) {
  const { theme, dark, wx, L, box: { x, y, w, h }, chimney } = o;
  const night = dark || theme === 'gece' || (!!wx && !wx.day);
  const rain = wx ? wx.kind === 'rain' || wx.kind === 'storm' : !night && theme === 'sonbahar';
  const snow = theme === 'kis' || wx?.kind === 'snow';
  const overcast = !!wx && wx.kind !== 'clear';
  const cloudFill = night ? '#59637A' : rain || wx?.kind === 'fog' ? '#B8C2CE' : '#FFFFFF';
  const cloud = (cx: number, cy: number, s: number, i: number) => (
    <G key={'cl' + i} opacity={rain ? 0.7 : 0.9}>
      <Ellipse cx={cx} cy={cy} rx={22 * s} ry={7 * s} fill={cloudFill} />
      <Ellipse cx={cx - 11 * s} cy={cy - 5 * s} rx={11 * s} ry={7 * s} fill={cloudFill} />
      <Ellipse cx={cx + 6 * s} cy={cy - 7 * s} rx={13 * s} ry={8 * s} fill={cloudFill} />
    </G>
  );
  const drops = (copy: number) =>
    scatter(34, 21).map(([u, v, k], i) => {
      const px = x + u * w, py = y + v * h - copy * h;
      return <Line key={'rd' + copy + i} x1={px} y1={py} x2={px - 3} y2={py + 9 + k * 4} stroke="#8FB4D0" strokeWidth={1.1} strokeLinecap="round" opacity={0.65} />;
    });
  const flakes = (copy: number) =>
    scatter(40, 3).map(([u, v, k], i) => <Circle key={'fk' + copy + i} cx={x + u * w} cy={y + v * h - copy * h} r={1 + k * 1.8} fill="#FFFFFF" opacity={0.7 + k * 0.3} />);
  return {
    clouds: night && !overcast ? [] : [cloud(x + w * 0.22, y + h * 0.1, 1, 0), cloud(x + w * 0.7, y + h * 0.17, 0.8, 1), ...(overcast ? [cloud(x + w * 0.45, y + h * 0.22, 1.1, 3)] : [])],
    clouds2: night && !overcast ? [] : [cloud(x + w * 0.5, y + h * 0.06, 1.2, 2), ...(overcast ? [cloud(x + w * 0.1, y + h * 0.16, 1, 4), cloud(x + w * 0.85, y + h * 0.08, 1.3, 5)] : [])],
    birds: !night && !rain && !snow && !overcast && L >= 7
      ? [0, 1].map(i => {
          const bx = x + w * (0.35 + i * 0.1), by = y + h * (0.14 + i * 0.04);
          return <Polyline key={'bd' + i} points={pts([[bx - 4, by - 2], [bx, by + 1], [bx + 4, by - 2]])} fill="none" stroke={dark ? '#C9D3DE' : '#4A4F63'} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />;
        })
      : [],
    rain: rain ? [...drops(0), ...drops(1)] : [],
    snow: snow ? [...flakes(0), ...flakes(1)] : [],
    smoke: chimney && L >= 7
      ? [0, 1, 2].map(i => <Circle key={'sm' + i} cx={chimney[0] + (i - 1) * 3} cy={chimney[1] - i * 7} r={3 + i * 1.6} fill={night ? '#9AA3B5' : '#E9E4DC'} opacity={0.75 - i * 0.15} />)
      : [],
  };
}

/** Işık geçişleri: lamba/pencere hâlesi, ışık huzmesi, oda glow'ları. */
const lightDefs = (
  <Defs>
    <RadialGradient id="h3dLamp" cx="50%" cy="50%" r="50%">
      <Stop offset="0" stopColor="#FFE082" stopOpacity={0.75} />
      <Stop offset="1" stopColor="#FFE082" stopOpacity={0} />
    </RadialGradient>
    <LinearGradient id="h3dBeam" x1="0" y1="0" x2="0" y2="1">
      <Stop offset="0" stopColor="#FFE9A6" stopOpacity={0.6} />
      <Stop offset="1" stopColor="#FFE9A6" stopOpacity={0} />
    </LinearGradient>
    <RadialGradient id="h3dLate" cx="50%" cy="50%" r="50%">
      <Stop offset="0" stopColor="#E58C7E" stopOpacity={0.6} />
      <Stop offset="1" stopColor="#E58C7E" stopOpacity={0} />
    </RadialGradient>
    <RadialGradient id="h3dToday" cx="50%" cy="50%" r="50%">
      <Stop offset="0" stopColor="#F2C46D" stopOpacity={0.55} />
      <Stop offset="1" stopColor="#F2C46D" stopOpacity={0} />
    </RadialGradient>
  </Defs>
);

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
  /** Evin kendisine dokunma eylemi. */
  onPressHouse?: () => void;
  /** Modeli kadraj içinde sabit oranda büyütür. */
  zoom?: number;
  /** Gökyüzü zemini ev kutusunun dışına da taşar (tam ekran görünüm). */
  bleed?: boolean;
  /** İki parmakla büyütme sadece tam ekran ev görünümünde (Evim); ana ekrandaki önizlemede kapalı. */
  pinchZoom?: boolean;
  mood?: Mood;
  /** Dokununca odaya yaklaş (kamera odaya kayar, yakınlaşır); "Odaya gir" onOpenRoom'u çağırır. Yakınlaştırma ile çatı kalkar, uzaklaştırınca çatılı ev görünür. */
  roomZoom?: boolean;
  /**
   * Gösterilen kat (dubleks). 0: zemin kat (üst kat gizli, içi görünsün). 1: üst kat; zemin kat
   * altında kapalı bir kütle olarak durur, pencereleri ve kapısıyla.
   */
  floor?: Floor;
};

export function House3D({ state: S, onOpenRoom, onPressHouse, zoom = 1, bleed = false, pinchZoom = false, now: nowProp, build, theme = 'gunduz', labels: showLabels = true, mood = 'keyifli', floor: floorProp = 0, roomZoom = false }: Props) {
  const L = build?.level ?? MAX_LEVEL;
  const idle = L > 0 ? build?.idle ?? 0 : 0;
  const c = useColors();
  const tick = useNow();
  const now = nowProp ?? tick;
  const dark = useIsDark();
  const sky = useSky(theme === 'gunduz');
  const wx = theme === 'gunduz' ? sky : null;

  // Açılışta ev hafifçe zıplayarak yerine otursun.
  const [pop] = useState(() => new Animated.Value(0));
  const [sproutScale] = useState(() => new Animated.Value(1));
  const [sproutOpacity] = useState(() => new Animated.Value(1));
  const [floatAnim] = useState(() => new Animated.Value(0));
  const [swayAnim] = useState(() => new Animated.Value(0));
  const [breathAnim] = useState(() => new Animated.Value(0));
  const [twinkle] = useState(() => new Animated.Value(0));
  const previousLevel = useRef(L);
  const [reduceSys, setReduce] = useState(false);
  const active = useActive();
  const reduce = reduceSys || !active;
  const [boxW, setBoxW] = useState(0);
  const [burst, setBurst] = useState(0);
  const [pinch] = useState(() => new Animated.Value(1));
  const [pan] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  const pinchRef = useRef({ d: 0, base: 1, cur: 1, px: 0, py: 0, lx: 0, ly: 0, moved: false });
  const [focus, setFocus] = useState<string | null>(null);
  const focusFn = useRef<(id: string | null) => void>(() => {});
  const prevIdle = useRef(idle);
  useEffect(() => {
    if (prevIdle.current > 0 && idle === 0) setBurst(b => b + 1);
    prevIdle.current = idle;
  }, [idle]);
  useEffect(() => {
    let on = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => on && setReduce(v)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', v => setReduce(v));
    return () => { on = false; sub.remove(); };
  }, []);

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }).start();
  }, [pop]);

  // Tamamı native driver: süzülme, hafif yanal salınım ve ışıkların nefesi birbirinden bağımsız, farklı periyotlarda.
  useEffect(() => {
    const loop = (v: Animated.Value, ms: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        ]),
      );
    if (reduce) return;
    const loops = [loop(floatAnim, 3300), loop(swayAnim, 5100), loop(breathAnim, 2600), loop(twinkle, 1500)];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [floatAnim, swayAnim, breathAnim, twinkle, reduce]);

  useEffect(() => {
    const grew = previousLevel.current !== L;
    const up = L > previousLevel.current;
    previousLevel.current = L;
    if (grew && L >= 1) setBurst(b => b + 1);
    if (up) sfx('levelup');
    if (!grew || L < 9) return;
    sproutScale.setValue(0.45);
    sproutOpacity.setValue(0);
    const growth = Animated.parallel([
      Animated.spring(sproutScale, { toValue: 1, friction: 5, tension: 75, useNativeDriver: true }),
      Animated.timing(sproutOpacity, { toValue: 1, duration: 360, useNativeDriver: true }),
    ]);
    growth.start();
    return () => growth.stop();
  }, [L, sproutOpacity, sproutScale]);

  const { cols, rows } = S;
  const upperCells = S.cells2 && S.cells2.length === S.cells.length ? S.cells2 : null;
  const floor: Floor = floorProp === 1 && upperCells?.some(Boolean) ? 1 : 0;
  const cells = floor === 1 && upperCells ? upperCells : S.cells;
  const ground = S.cells;
  // Kadraj iki katın birleşimine göre: katlar arasında geçerken ev yerinden kaymasın.
  let rMin = rows, cMin = cols, rMax = 0, cMax = 0;
  cells.forEach((cell, i) => {
    if (!cell && !ground[i] && !upperCells?.[i]) return;
    const r = Math.floor(i / cols), c = i % cols;
    rMin = Math.min(rMin, r); cMin = Math.min(cMin, c);
    rMax = Math.max(rMax, r + 1); cMax = Math.max(cMax, c + 1);
  });
  const angle = 0;
  const centerR = (rMin + rMax) / 2, centerC = (cMin + cMax) / 2;
  setProjection(angle, centerR, centerC);
  const at = (r: number, col: number) => (r >= 0 && r < rows && col >= 0 && col < cols ? cells[r * cols + col] : null);

  const wallFace = dark ? c.surface2 : WHITE;
  const cap = c.wall;
  const slab = dark ? '#5A4F50' : '#BFA89E';

  // Memoize room clean percentages & anchors
  const clean = useMemo(() => {
    const res: Record<string, number> = {};
    for (const id of S.order) res[id] = roomClean(S, id, now);
    return res;
  }, [S, now]);

  const anchors: Record<string, number> = {};
  const variantOf: Record<string, number> = {};
  {
    const seen: Record<string, number> = {};
    for (const rid of S.order) {
      const t = S.rooms[rid]?.type;
      if (!t) continue;
      variantOf[rid] = seen[t] ?? 0;
      seen[t] = variantOf[rid] + 1;
    }
  }
  const props: Record<string, number> = {};
  const depth = (i: number) => {
    const dr = Math.floor(i / cols) + 0.5 - projectionCenter[0];
    const dc = i % cols + 0.5 - projectionCenter[1];
    return dc * (Math.cos(angle) + Math.sin(angle)) + dr * (Math.cos(angle) - Math.sin(angle));
  };
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

  const DUSTY = dark ? '#5E5A57' : '#BDB3A6';

  // Merdiven: üst kat varsa, iki katta da dolu olan bir blokta (önce antre, sonra salon).
  let stairAt = -1;
  if (upperCells?.some(Boolean)) {
    const both = ground.map((g, i) => (g && upperCells[i] ? i : -1)).filter(i => i >= 0 && i !== anchors[ground[i]!] && i !== props[ground[i]!]);
    const pref = (t: RoomType) => both.find(i => S.rooms[ground[i]!]?.type === t);
    stairAt = pref('antre') ?? pref('salon') ?? both[0] ?? -1;
  }

  // Mağazadan alınan eşyalar: odanın etiket ve eşya dışındaki bloklarına sırayla.
  const itemAt: Record<number, string[]> = {};
  for (const [item, rid] of Object.entries(S.play?.placed ?? {})) {
    if (!rid || !S.rooms[rid] || !S.play.owned.includes(item)) continue;
    const mine: number[] = [];
    cells.forEach((x, i) => x === rid && mine.push(i));
    if (!mine.length) continue;
    const spot = spotOf(S, item);
    if (spot && spot.floor !== floor) continue;
    const free = mine.filter(i => i !== anchors[rid] && i !== props[rid] && !itemAt[i] && i !== stairAt);
    const i = spot && cells[spot.i] === rid ? spot.i : free.length ? free[0] : mine.find(j => j !== props[rid]) ?? mine[0];
    (itemAt[i] ||= []).push(item);
  }

  // Ressam sıralaması: arkadaki bloklar (satır + sütun küçük olan) önce çizilir.
  const order = cells.map((_, i) => i).filter(i => cells[i]);
  order.sort((a, b) => depth(a) - depth(b) || a - b);

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const grow = ([x, y]: Pt) => {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  };
  const els: ReactElement[] = [];
  /** Gezen evcil hayvanlar: kendi katmanlarında odalarında volta atar. */
  const pets: { id: string; el: ReactElement; nodes: RoamNode[]; start: number; home: Pt }[] = [];
  const add = (f: Face) => els.push(renderFace({ strokeWidth: 0.8, ...f }));
  // Üstte canlandırılan ışıklar: oda glow'ları ve pencere huzmeleri (nefes), temiz oda parıltıları (twA / twB).
  const life = emptyLife();

  // Seviyeye göre duvarlar: 2 iskelet, 3 yarım boy tuğla, 4+ boyalı.
  const painted = L >= 4;
  const wallColor = painted ? wallFace : BRICK;
  const capColor = painted ? cap : shade(BRICK, -0.15);
  const wallH = (h: number) => (L === 3 ? Math.round(h * 0.55) : h);
  const wall = (key: string, r0: number, c0: number, dr: number, dc: number, h: number, color = wallColor) =>
    box(key, r0, c0, dr, dc, 0, h, color, 0.6).forEach(f => {
      if (f.key.endsWith('t')) {
        add({ ...f, fill: capColor });
      } else {
        add(f);
      }
    });
  /** İskelet: köşede bir direk ve duvar boyunca üst kiriş. */
  const frame = (key: string, r0: number, c0: number, dr: number, dc: number, h: number) => {
    box(key + 'p', r0, c0, T * 0.7, T * 0.7, 0, h, BEAM).forEach(add);
    box(key + 'k', r0, c0, Math.max(dr, T * 0.7), Math.max(dc, T * 0.7), h - 3, 3, shade(BEAM, 0.1)).forEach(add);
  };
  const crack = (key: string, ps: Pt[]) =>
    els.push(<Polyline key={key} points={pts(ps)} fill="none" stroke="#5B4A40" strokeWidth={1.1} strokeLinejoin="round" strokeLinecap="round" />);

  const handleOpenRoom = (id: string) => {
    haptic('light');
    sfx('tap');
    if (roomZoom) focusFn.current(id);
    else onOpenRoom?.(id);
  };
  const handlePressHouse = () => {
    haptic('light');
    sfx('tap');
    onPressHouse?.();
  };

  const isNight = dark || theme === 'gece' || (!!wx && !wx.day);
  /** Bekleyen işi olan odalar: gecikme varsa true, sadece bugün varsa false. */
  const roomLate: Record<string, boolean> = {};
  for (const id of S.order) {
    const rc = roomCounts(S, id, now);
    if (rc.late + rc.today > 0) roomLate[id] = rc.late > 0;
  }

  /** Duvar rengi: oda seçtiyse o, yoksa temanın beyazı. Koyu temada biraz koyulaşır. */
  const facade = facadeOf(S)?.color;
  const wallTint = (rid: string, outer: boolean) => {
    const hex = (outer && facade) || wallOf(S, rid)?.color;
    if (!hex || !painted) return wallColor;
    return dark ? shade(hex, -0.45) : hex;
  };
  // Kapılar: iki oda arasındaki her duvarda bir kapı (en arkadaki ortak blokta), giriş kapısı antrede.
  const doors = new Set<string>();
  const seenPair = new Set<string>();
  // Antre (koridor) varsa odalar sadece antreye açılır; odalar arası kapı yok.
  const hallway = cells.some(cid => cid && S.rooms[cid]?.type === 'antre');
  for (const i of order) {
    const id = cells[i]!, r = Math.floor(i / cols), col = i % cols;
    for (const [dir, nb] of [['n', at(r - 1, col)], ['w', at(r, col - 1)]] as const) {
      if (!nb || nb === id) continue;
      if (hallway && S.rooms[id]?.type !== 'antre' && S.rooms[nb]?.type !== 'antre') continue;
      const pair = [id, nb].sort().join('|');
      if (seenPair.has(pair)) continue;
      seenPair.add(pair);
      doors.add(i + dir);
    }
  }
  let entrance = '';
  if (floor === 0) {
    const outerAt = (i: number) => {
      const r = Math.floor(i / cols), col = i % cols;
      return !at(r - 1, col) ? 'n' : !at(r, col - 1) ? 'w' : '';
    };
    const cand = order.filter(i => outerAt(i) && i !== stairAt);
    const pick = cand.find(i => S.rooms[cells[i]!]?.type === 'antre') ?? cand.find(i => S.rooms[cells[i]!]?.type === 'salon') ?? cand[0];
    if (pick != null) entrance = pick + outerAt(pick);
  }
  /** Kapı: duvarın iç yüzüne ahşap kanat ve topuz. `axis` 'n' kuzey duvarı, 'w' batı duvarı. */
  const door = (key: string, r: number, col: number, axis: 'n' | 'w', main: boolean) => {
    const h = main ? 20 : 15, u0 = 0.3, u1 = 0.7;
    const q = (u: number, z: number) => (axis === 'n' ? P(r + T, col + u, z) : P(r + u, col + T, z));
    const wood = main ? '#8C5E45' : '#B08A6C';
    add({ key: key + 'df', fill: shade(wood, 0.25), points: pts([q(u0 - 0.04, 0), q(u1 + 0.04, 0), q(u1 + 0.04, h + 1.5), q(u0 - 0.04, h + 1.5)]) });
    add({ key: key + 'd', fill: wood, points: pts([q(u0, 0), q(u1, 0), q(u1, h), q(u0, h)]) });
    const [kx, ky] = q(u1 - 0.07, h * 0.48);
    els.push(<Circle key={key + 'dk'} cx={kx} cy={ky} r={1.1} fill={GOLD} />);
    if (main) {
      const [wx1, wy1] = q(0.5, h - 4);
      els.push(<Circle key={key + 'dw'} cx={wx1} cy={wy1} r={2.2} fill={isNight ? '#FFF2B2' : c.hi} />);
    }
  };
  /** Merdiven: zemin katta basamaklar, üst katta korkuluklu boşluk. */
  const stairs = (key: string, r: number, col: number) => {
    if (floor === 0) {
      for (let s = 0; s < 5; s++)
        box(key + 'st' + s, r + 0.18 + s * 0.13, col + 0.25, 0.14, 0.5, 0, (5 - s) * 4.2, shade(WOOD, -0.05 * (s % 2)), 0.4).forEach(add);
    } else {
      add({ key: key + 'sh', fill: shade(slab, -0.45), points: pts([P(r + 0.2, col + 0.25), P(r + 0.2, col + 0.75), P(r + 0.85, col + 0.75), P(r + 0.85, col + 0.25)]) });
      box(key + 'rl', r + 0.18, col + 0.22, 0.69, 0.05, 0, 9, BEAM, 0.4).forEach(add);
      box(key + 'rr', r + 0.18, col + 0.73, 0.69, 0.05, 0, 9, BEAM, 0.4).forEach(add);
    }
  };

  // Üst katta: zemin kat altta kapalı bir kütle. Öne bakan yüzlerinde pencereler, giriş kapısı; üstü açıkta kalan yerler teras.
  if (floor === 1 && L >= 3) {
    const gat = (r: number, col: number) => (r >= 0 && r < rows && col >= 0 && col < cols ? ground[r * cols + col] : null);
    const gorder = ground.map((_, i) => i).filter(i => ground[i]).sort((a, b) => depth(a) - depth(b) || a - b);
    const Z0 = -(WALL_H + SLAB);
    let doorDone = false;
    for (const i of gorder) {
      const r = Math.floor(i / cols), col = i % cols, gid = ground[i]!;
      const tint = facade ?? wallOf(S, gid)?.color ?? WHITE;
      const tc = painted ? (dark ? shade(tint, -0.45) : tint) : BRICK;
      box('g' + i, r, col, 1, 1, Z0, WALL_H, tc).forEach(f => add(f.key.endsWith('t') ? { ...f, fill: upperCells?.[i] ? shade(slab, -0.1) : (dark ? '#6B6F7A' : '#C9C3BA') } : f));
      for (const pt of [P(r + 1, col + 1, Z0 - SLAB), P(r + 1, col, Z0 - SLAB)]) grow(pt);
      if (L < 5) continue;
      const wm = winOf(S, gid);
      const lit = isNight ? '#FFF2B2' : c.hi;
      // Güney yüzü (r + 1) ve doğu yüzü (col + 1) kameraya bakar.
      if (!gat(r + 1, col)) {
        if (!doorDone && (S.rooms[gid]?.type === 'antre' || i === gorder[gorder.length - 1])) {
          doorDone = true;
          add({ key: 'g' + i + 'gd', fill: '#8C5E45', points: pts([P(r + 1, col + 0.32, Z0), P(r + 1, col + 0.68, Z0), P(r + 1, col + 0.68, Z0 + 22), P(r + 1, col + 0.32, Z0 + 22)]) });
        } else if (wm === 2 || (wm === 1 && (r + col) % 2 === 0))
          add({ key: 'g' + i + 'gs', fill: lit, points: pts([P(r + 1, col + 0.3, Z0 + 12), P(r + 1, col + 0.7, Z0 + 12), P(r + 1, col + 0.7, Z0 + 25), P(r + 1, col + 0.3, Z0 + 25)]) });
      }
      if (!gat(r, col + 1) && (wm === 2 || (wm === 1 && (r + col) % 2 === 1)))
        add({ key: 'g' + i + 'ge', fill: lit, points: pts([P(r + 0.3, col + 1, Z0 + 12), P(r + 0.7, col + 1, Z0 + 12), P(r + 0.7, col + 1, Z0 + 25), P(r + 0.3, col + 1, Z0 + 25)]) });
    }
  }

  for (const i of order) {
    const id = cells[i]!;
    const room = S.rooms[id];
    if (!room) continue;
    const r = Math.floor(i / cols), col = i % cols;
    for (const pt of [P(r, col, WALL_H), P(r + 1, col + 1, -SLAB), P(r + 1, col, -SLAB), P(r, col + 1, -SLAB), P(r, col, WALL_H + 8)]) grow(pt);
    const open = onOpenRoom ? () => handleOpenRoom(id) : handlePressHouse;
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
    const sin = Math.sin(angle), cos = Math.cos(angle);
    if (!at(r + 1, col) && cos - sin > 0)
      add({ key: k + 'bl', fill: shade(slab, -0.05), points: pts([P(r + 1, col, -SLAB), P(r + 1, col + 1, -SLAB), P(r + 1, col + 1, 0), P(r + 1, col, 0)]) });
    if (!at(r - 1, col) && cos - sin < 0)
      add({ key: k + 'bn', fill: shade(slab, -0.05), points: pts([P(r, col, -SLAB), P(r, col + 1, -SLAB), P(r, col + 1, 0), P(r, col, 0)]) });
    if (!at(r, col + 1) && cos + sin > 0)
      add({ key: k + 'br', fill: shade(slab, -0.2), points: pts([P(r, col + 1, -SLAB), P(r + 1, col + 1, -SLAB), P(r + 1, col + 1, 0), P(r, col + 1, 0)]) });
    if (!at(r, col - 1) && cos + sin < 0)
      add({ key: k + 'bln', fill: shade(slab, -0.2), points: pts([P(r, col, -SLAB), P(r + 1, col, -SLAB), P(r + 1, col, 0), P(r, col, 0)]) });

    // Taban. Damalı olsun diye her ikinci blok çok hafif koyu. 4. seviyeye kadar çıplak kalas.
    const p = clean[id] ?? 100;
    const fl = floorOf(S, id);
    const floorHex = fl ? ((r + col) % 2 && fl.alt ? fl.alt : fl.color) : '#D3B99A';
    const base = painted ? mix(dark ? shade(floorHex, -0.2) : floorHex, DUSTY, Math.min(1, Math.max(0, (95 - p) / 65)) * 0.8) : WOOD;
    add({ key: k + 'f', fill: base, points: tile, onPress: open, stroke: base, strokeWidth: 0.2 });
    // Kirli oda: zeminde toz topakları. Ne kadar kirliyse o kadar çok.
    if (p < 80) {
      const n = p < 40 ? 3 : p < 60 ? 2 : (r + col) % 2 === 0 ? 1 : 0;
      for (let j = 0; j < n; j++) {
        const [x, y] = P(r + 0.25 + ((j * 0.31 + r * 0.17) % 0.5), col + 0.2 + ((j * 0.43 + col * 0.13) % 0.6));
        els.push(<Ellipse key={k + 'dd' + j} cx={x} cy={y} rx={3.5} ry={1.6} fill="#9C8C7A" fillOpacity={0.55} />);
      }
    }
    // Tertemiz oda: zeminde minik parıltılar, sırayla yanıp söner.
    if (painted && p >= 100 && (r * 3 + col) % 3 === 0) {
      const [x, y] = P(r + 0.4, col + 0.6, 2);
      els.push(sparkle(k + 'sp', x, y, 5, GOLD));
      (((r + col) % 2) ? life.twB : life.twA).push(sparkle(k + 'sq', x + 7, y - 6, 3, '#FFFFFF'));
    }
    // İş bekleyen oda: zeminin altında nefes alan renkli ışık. Gecikmiş kırmızı, bugün sıcak sarı.
    if (painted && roomLate[id] !== undefined) {
      const [gx, gy] = P(r + 0.5, col + 0.5, 1);
      life.breath.push(<Ellipse key={k + 'rg'} cx={gx} cy={gy} rx={A * 0.95} ry={B * 1.25} fill={roomLate[id] ? 'url(#h3dLate)' : 'url(#h3dToday)'} />);
    }

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
    const wm = winOf(S, id);
    const winOn = (parity: number) => wm === 2 || (wm === 1 && (r + col) % 2 === parity);
    const winFill = isNight && p >= 70 ? '#FFF2B2' : c.hi;
    if (n !== id && L >= 2) {
      const balc = S.rooms[id]?.type === 'balkon';
      const h = wallH(n ? INNER_H : balc ? RAIL_H : WALL_H);
      if (L === 2) frame(k + 'n', r, col, T * 0.7, 1, h);
      else {
        wall(k + 'n', r, col, T, 1, h, wallTint(id, !n));
        if (L >= 5 && doors.has(i + 'n')) door(k + 'n', r, col, 'n', false);
        if (L >= 5 && entrance === i + 'n') door(k + 'n', r, col, 'n', true);
        else if (!n && !balc && L >= 5 && winOn(0)) {
          add({ key: k + 'nw', fill: winFill, points: pts([P(r + T, col + 0.32, 13), P(r + T, col + 0.68, 13), P(r + T, col + 0.68, 25), P(r + T, col + 0.32, 25)]) });
          if (p >= 70 && (isNight || p >= 100)) {
            const [gx, gy] = P(r + T + 0.1, col + 0.5, 19);
            const [bx, by] = P(r + 0.55, col + 0.5, 0);
            life.breath.push(
              <Circle key={k + 'nw_glow'} cx={gx} cy={gy} r={isNight ? 14 : 9} fill="url(#h3dLamp)" />,
              <Polygon key={k + 'nw_beam'} points={pts([[gx - 6, gy + 6], [gx + 6, gy + 6], [bx + 12, by + 3], [bx - 12, by + 3]])} fill="url(#h3dBeam)" opacity={isNight ? 1 : 0.5} />,
            );
          }
        }
        if (idle >= 2 && (r + col) % 2 === 1)
          crack(k + 'nc', [P(r + T, col + 0.5, h - 2), P(r + T, col + 0.6, h - 7), P(r + T, col + 0.47, h - 11), P(r + T, col + 0.58, h - 16)]);
        if (!n && !balc && L >= 26)
          for (const v of [0.2, 0.5, 0.8]) {
            const [x, y] = P(r, col + v, WALL_H + 3);
            els.push(<Circle key={k + 'li' + v} cx={x} cy={y} r={1.8} fill={GOLD} />);
          }
      }
    }
    if (w !== id && L >= 2) {
      const balc = S.rooms[id]?.type === 'balkon';
      const h = wallH(w ? INNER_H : balc ? RAIL_H : WALL_H);
      const r0 = n !== id ? r + T : r;
      if (L === 2) frame(k + 'w', r, col, 1, T * 0.7, h);
      else {
        wall(k + 'w', r0, col, r + 1 - r0, T, h, wallTint(id, !w));
        if (L >= 5 && doors.has(i + 'w')) door(k + 'w', r, col, 'w', false);
        if (L >= 5 && entrance === i + 'w') door(k + 'w', r, col, 'w', true);
        else if (!w && !balc && L >= 5 && winOn(1)) {
          add({ key: k + 'ww', fill: winFill, points: pts([P(r + 0.32, col + T, 13), P(r + 0.68, col + T, 13), P(r + 0.68, col + T, 25), P(r + 0.32, col + T, 25)]) });
          if (p >= 70 && (isNight || p >= 100)) {
            const [gx, gy] = P(r + 0.5, col + T + 0.1, 19);
            const [bx, by] = P(r + 0.5, col + 0.55, 0);
            life.breath.push(
              <Circle key={k + 'ww_glow'} cx={gx} cy={gy} r={isNight ? 14 : 9} fill="url(#h3dLamp)" />,
              <Polygon key={k + 'ww_beam'} points={pts([[gx - 6, gy + 6], [gx + 6, gy + 6], [bx + 12, by + 3], [bx - 12, by + 3]])} fill="url(#h3dBeam)" opacity={isNight ? 1 : 0.5} />,
            );
          }
        }
        if (idle >= 2 && (r + col) % 2 === 0)
          crack(k + 'wc', [P(r + 0.5, col + T, h - 3), P(r + 0.4, col + T, h - 8), P(r + 0.55, col + T, h - 12), P(r + 0.45, col + T, h - 17)]);
      }
    }

    if (i === stairAt && L >= 4) stairs(k, r, col);
    if (props[id] === i && L >= 6) els.push(<G key={k + 'e'} onPress={open}>{furniture(room.type, r, col, k + 'e', c, variantOf[id] ?? 0)}</G>);
    for (const item of itemAt[i] ?? []) {
      if (item === 'kedi' || item === 'kopek') {
        // Gezilebilir bloklar: odanın, mobilya / etiket / merdiven / başka eşya olmayan blokları.
        const walk = cells.map((x, j) => x === id && (j === i || (j !== anchors[id] && j !== props[id] && j !== stairAt && !(itemAt[j] ?? []).some(o => o !== 'kedi' && o !== 'kopek'))));
        const idxOf = new Map<number, number>();
        const nodes: RoamNode[] = [];
        const [ox, oy] = P(r + 0.5, col + 0.5, 0);
        walk.forEach((ok, j) => {
          if (!ok) return;
          idxOf.set(j, nodes.length);
          const [px, py] = P(Math.floor(j / cols) + 0.5, (j % cols) + 0.5, 0);
          nodes.push({ x: px - ox, y: py - oy, nb: [] });
        });
        idxOf.forEach((ni, j) => {
          const jr = Math.floor(j / cols), jc = j % cols;
          for (const [rr, cc] of [[jr - 1, jc], [jr + 1, jc], [jr, jc - 1], [jr, jc + 1]]) {
            if (rr < 0 || cc < 0 || cc >= cols) continue;
            const nj = idxOf.get(rr * cols + cc);
            if (nj !== undefined) nodes[ni].nb.push(nj);
          }
        });
        pets.push({ id: item, el: <G key={k + 'i' + item}>{itemShape(item, r, col, k + 'i' + item)}</G>, nodes, start: idxOf.get(i) ?? 0, home: P(r + 0.5, col + 0.5, 14) });
      }
      else els.push(<G key={k + 'i' + item} onPress={open}>{itemShape(item, r, col, k + 'i' + item)}</G>);
    }

    // 3. günden sonra: moloz.
    if (idle >= 3 && (r * 7 + col * 3) % 4 === 0) {
      box(k + 'm1', r + 0.62, col + 0.2, 0.16, 0.2, 0, 4, BRICK).forEach(add);
      box(k + 'm2', r + 0.7, col + 0.42, 0.12, 0.12, 0, 3, shade(BRICK, -0.1)).forEach(add);
    }

    // Ön duvarlar: dışarıya bakan kenarlarda alçak bir parapet, içi görünsün.
    if (L >= 3) {
      if (!at(r + 1, col)) wall(k + 's', r + 1 - T, col, T, 1, FRONT_H, wallTint(id, true));
      if (!at(r, col + 1)) wall(k + 'x', r, col + 1 - T, 1, T, FRONT_H, wallTint(id, true));
    } else if (L === 2) {
      if (!at(r + 1, col)) frame(k + 's', r + 1 - T * 0.7, col, T * 0.7, 1, WALL_H);
      if (!at(r, col + 1)) frame(k + 'x', r, col + 1 - T * 0.7, 1, T * 0.7, WALL_H);
    }
  }

  // Roof: a real gable per block (ridge runs along the column axis, so neighbours in a row merge into one ridge).
  // Slopes, gable triangles and the wall skirt are built from grid corners only, so everything sits exactly on the
  // wall tops in every rotation. No overhang means no overlap or z-fighting. Tile rows, ridge and eave lines and all
  // windows are merged into a few Paths to keep the node count low.
  const roofEls: ReactElement[] = [];
  if (L >= 3) {
    const roofBase = dark ? '#8A5C52' : '#C8826B';
    const snowy = theme === 'kis';
    const rc = snowy ? (dark ? '#B9C3CF' : '#F1F5F9') : roofBase;
    const RH = 14; // ridge height above the wall tops
    const zR = WALL_H + RH;
    const edges: [number, number, number, number][] = [[0, 0, 0, 1], [0, 1, 1, 1], [1, 1, 1, 0], [1, 0, 0, 0]];
    const dirs: Pt[] = [[-1, 0], [0, 1], [1, 0], [0, -1]];
    const f1 = (p: Pt) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    let lines = '', ridgeD = '', eaveD = '', glassD = '', frameD = '', shineD = '';
    const glass = isNight ? '#FFE9A0' : dark ? '#7FA2C2' : '#BFE1F2';
    for (const i of order) {
      const r = Math.floor(i / cols), col = i % cols, id = cells[i]!;
      const nb = [at(r - 1, col), at(r, col + 1), at(r + 1, col), at(r, col - 1)];
      const tint = mix(rc, '#FFFFFF', (r + col) % 2 ? 0.04 : 0);
      const [cx0, cy0] = P(r + 0.5, col + 0.5, 0);
      const wallC = wallTint(id, true);
      // 1. Wall skirt with windows on exposed, viewer-facing edges.
      edges.forEach(([dr1, dc1, dr2, dc2], e) => {
        if (nb[e]) return;
        const [nr, nc] = dirs[e];
        const mid = P(r + 0.5 + nr * 0.5, col + 0.5 + nc * 0.5, 0);
        if (mid[1] <= cy0 + 0.01) return;
        const left = mid[0] < cx0;
        const sk = left ? wallC : shade(wallC, -0.14);
        const a1 = r + dr1, b1 = col + dc1, a2 = r + dr2, b2 = col + dc2;
        roofEls.push(<Polygon key={`rk${i}_${e}`} points={pts([P(a1, b1, 0), P(a2, b2, 0), P(a2, b2, WALL_H), P(a1, b1, WALL_H)])} fill={sk} stroke={sk} strokeWidth={0.5} strokeLinejoin="round" />);
        // One window per edge, proportionally placed (t along the wall, z in the middle of the wall).
        const at2 = (t: number, z: number) => P(a1 + (a2 - a1) * t, b1 + (b2 - b1) * t, z);
        const q = [at2(0.3, 11), at2(0.7, 11), at2(0.7, 25), at2(0.3, 25)];
        glassD += `M${q.map(f1).join('L')}Z`;
        frameD += `M${q.map(f1).join('L')}Z M${f1(at2(0.5, 11))}L${f1(at2(0.5, 25))} M${f1(at2(0.3, 18))}L${f1(at2(0.7, 18))}`;
        shineD += `M${f1(at2(0.34, 23))}L${f1(at2(0.46, 23))}L${f1(at2(0.34, 15))}Z`;
      });
      // 2. Gable triangles on exposed, viewer-facing ends (west / east in grid terms).
      for (const e of [1, 3]) {
        if (nb[e]) continue;
        const [nr, nc] = dirs[e];
        const mid = P(r + 0.5 + nr * 0.5, col + 0.5 + nc * 0.5, 0);
        if (mid[1] <= cy0 + 0.01) continue;
        const cc2 = e === 1 ? col + 1 : col;
        const tri = [P(r, cc2, WALL_H), P(r + 1, cc2, WALL_H), P(r + 0.5, cc2, zR)];
        const gf = e === 1 ? shade(wallC, -0.14) : wallC;
        roofEls.push(<Polygon key={`rg${i}_${e}`} points={pts(tri)} fill={gf} stroke={shade(tint, -0.2)} strokeWidth={1.1} strokeLinejoin="round" />);
        // Small attic window in the triangle.
        const at3 = (t: number, z: number) => P(r + t, cc2, z);
        const aw = [at3(0.4, WALL_H + 3), at3(0.6, WALL_H + 3), at3(0.6, WALL_H + 8), at3(0.4, WALL_H + 8)];
        glassD += `M${aw.map(f1).join('L')}Z`;
        frameD += `M${aw.map(f1).join('L')}Z`;
      }
      // 3. Slopes: north (edge 0) and south (edge 2). Only the one that faces the viewer is drawn.
      for (const e of [0, 2]) {
        const rEave = e === 0 ? r : r + 1;
        const eave = [P(rEave, col, WALL_H), P(rEave, col + 1, WALL_H)];
        const ridge = [P(r + 0.5, col, zR), P(r + 0.5, col + 1, zR)];
        if ((eave[0][1] + eave[1][1]) / 2 <= (ridge[0][1] + ridge[1][1]) / 2 + 0.01) continue;
        const lit = (eave[0][0] + eave[1][0]) / 2 <= (ridge[0][0] + ridge[1][0]) / 2;
        const fill = lit ? tint : shade(tint, -0.16);
        roofEls.push(<Polygon key={`rs${i}_${e}`} points={pts([eave[0], eave[1], ridge[1], ridge[0]])} fill={fill} stroke={fill} strokeWidth={0.6} strokeLinejoin="round" />);
        // Tile rows parallel to the ridge.
        for (const u of [1 / 3, 2 / 3]) {
          const ra = rEave + (r + 0.5 - rEave) * u, z = WALL_H + RH * u;
          lines += `M${f1(P(ra, col, z))}L${f1(P(ra, col + 1, z))}`;
        }
        eaveD += `M${f1(eave[0])}L${f1(eave[1])}`;
        ridgeD += `M${f1(ridge[0])}L${f1(ridge[1])}`;
        for (const pt of ridge) grow(pt);
      }
    }
    // Merged line layers (drawn after all faces, so they never fight with them).
    const lineC = shade(rc, -0.25);
    roofEls.push(
      <Path key="rtile" d={lines} stroke={lineC} strokeWidth={0.6} strokeOpacity={0.7} fill="none" />,
      <Path key="reave" d={eaveD} stroke={shade(rc, -0.35)} strokeWidth={1.2} strokeLinecap="round" fill="none" />,
      <Path key="rridge" d={ridgeD} stroke={shade(rc, -0.4)} strokeWidth={1.6} strokeLinecap="round" fill="none" />,
      <Path key="rglass" d={glassD} fill={glass} />,
      <Path key="rshine" d={shineD} fill="#FFFFFF" fillOpacity={0.5} />,
      <Path key="rframe" d={frameD} stroke={dark ? '#E9E2D8' : '#FFFFFF'} strokeWidth={1} strokeLinejoin="round" fill="none" />,
    );
    if (L >= 7 && order.length) {
      const ci = order[0], cr = Math.floor(ci / cols), cc = ci % cols;
      box('rchim', cr + 0.25, cc + 0.55, 0.16, 0.16, WALL_H + 3, 22, BRICK, 0.4).forEach(f => roofEls.push(renderFace(f)));
    }
  }
  // Dış görünüm, bahçe henüz küçükken: çit, ağaçlar ve yol (sonra gelen bahçe süsleri bunların yerini alır).
  const extEls: ReactElement[] = [];
  if (L >= 3 && floor === 0 && order.length && L < 22) {
    const rr = rMax + 0.55, c0 = cMin - 0.5, c1 = cMax + 0.5, r0 = rMin - 0.5;
    const fenceC = '#EADFCF';
    const post = (key: string, a: number, b: number) => {
      const [x, y] = P(a, b, 0), [x2, y2] = P(a, b, 9);
      extEls.push(<Polyline key={key} points={pts([[x, y], [x2, y2]])} stroke={fenceC} strokeWidth={2.2} strokeLinecap="round" fill="none" />);
    };
    for (let v = c0; v <= c1 + 0.01; v += 0.5) post('fp' + v, rr, v);
    for (let u = r0; u <= rr + 0.01; u += 0.5) post('fq' + u, u, c1);
    extEls.push(
      <Polyline key="frs" points={pts([P(rr, c0, 6), P(rr, c1, 6), P(r0, c1, 6)])} stroke={fenceC} strokeWidth={1.6} fill="none" strokeLinejoin="round" />,
      <Polyline key="frt" points={pts([P(rr, c0, 3), P(rr, c1, 3), P(r0, c1, 3)])} stroke={fenceC} strokeWidth={1.2} fill="none" strokeLinejoin="round" />,
    );
    // Taş yol: evin ön kenarından çite doğru.
    const mid = (cMin + cMax) / 2;
    extEls.push(<Polygon key="path" points={pts([P(rMax, mid - 0.25), P(rMax, mid + 0.25), P(rr, mid + 0.25), P(rr, mid - 0.25)])} fill="#D8C7AE" />);
    const tree = (key: string, a: number, b: number, s: number) => {
      const [x, y] = P(a, b, 0);
      extEls.push(
        <G key={key}>
          <Ellipse cx={x} cy={y + 1} rx={9 * s} ry={3.5 * s} fill="rgba(40,48,68,0.14)" />
          <Polyline points={pts([[x, y], [x, y - 14 * s]])} stroke="#8C5E45" strokeWidth={3 * s} strokeLinecap="round" fill="none" />
          <Circle cx={x} cy={y - 21 * s} r={11 * s} fill={LEAF} />
          <Circle cx={x - 4 * s} cy={y - 24 * s} r={5 * s} fill={shade(LEAF, 0.2)} fillOpacity={0.7} />
        </G>,
      );
    };
    tree('t1', rr - 0.15, c0 + 0.25, 1);
    tree('t2', rr - 0.2, c1 - 0.3, 0.85);
    tree('t3', r0 + 0.25, c0 + 0.1, 0.9);
    ['#E58C7E', '#F2C46D', '#F4A6C0', '#FFFFFF'].forEach((col2, i) => {
      const [fx, fy] = P(rr - 0.3, c0 + 0.7 + i * 0.35, 1);
      extEls.push(<Circle key={'fl' + i} cx={fx} cy={fy} r={2.1} fill={col2} />);
    });
  }

  // Baca: en arkadaki bloğun duvarında; dumanı ambient katmanından çıkar.
  let chimney: Pt | undefined;
  if (L >= 7 && order.length) {
    const ci = order[0];
    const cr = Math.floor(ci / cols), cc = ci % cols;
    box('chim', cr + 0.55, cc + 0.55, 0.16, 0.16, WALL_H, 12, BRICK, 0.4).forEach(add);
    box('chimc', cr + 0.52, cc + 0.52, 0.22, 0.22, WALL_H + 12, 2, shade(BRICK, -0.2)).forEach(add);
    chimney = P(cr + 0.63, cc + 0.63, WALL_H + 16);
  }

  // Seviyeyle büyüyen giriş: paspas (8), fener direği (16), saksılı çiçeklik (24), altın kupa (50).
  if (L >= 8 && order.length) {
    const fi = order[order.length - 1];
    const fr = Math.floor(fi / cols), fc = fi % cols;
    box('mat', fr + 0.7, fc + 0.3, 0.2, 0.4, 0, 0.8, '#B8584C').forEach(add);
    if (L >= 16) {
      box('lp', fr + 0.78, fc + 0.8, 0.05, 0.05, 0, 18, '#283044').forEach(add);
      box('lh', fr + 0.74, fc + 0.76, 0.13, 0.13, 18, 4, GOLD).forEach(add);
      const [lx, ly] = P(fr + 0.8, fc + 0.82, 21);
      life.breath.push(<Circle key="porch_glow" cx={lx} cy={ly} r={isNight ? 16 : 8} fill="url(#h3dLamp)" />);
    }
    if (L >= 24) {
      box('fb', fr + 0.8, fc + 0.12, 0.1, 0.3, 0, 4, POT).forEach(add);
      [0.17, 0.26, 0.35].forEach((v, i) => {
        const [x, y] = P(fr + 0.85, fc + v, 6);
        els.push(<Circle key={'fbf' + i} cx={x} cy={y} r={2} fill={['#E58C7E', '#F2C46D', '#F4A6C0'][i]} />);
      });
    }
    if (L >= 50) {
      const [tx, ty] = P(fr + 0.5, fc + 0.5, 0);
      els.push(
        <G key="trophy">
          <Ellipse cx={tx} cy={ty + 1} rx={5} ry={2} fill="rgba(40,48,68,0.2)" />
          <Polygon points={pts([[tx - 3, ty - 12], [tx + 3, ty - 12], [tx + 2, ty - 5], [tx - 2, ty - 5]])} fill={GOLD} />
          <Rect x={tx - 1} y={ty - 5} width={2} height={4} fill={GOLD} />
          <Rect x={tx - 3} y={ty - 1.5} width={6} height={1.5} fill={shade(GOLD, -0.2)} />
        </G>,
      );
    }
  }

  // Minik 3D Moka maskotu evin salonunda veya çalışma odasında dolaşır (MokaPet).
  let moka: { cells: number[]; blocked: number } | null = null;
  if (L >= 5 && floor === 0) {
    const mokaRoomId = S.order.find(id => S.rooms[id]?.type === 'salon') ?? S.order.find(id => S.rooms[id]?.type === 'calisma') ?? S.order[0];
    const mine: number[] = [];
    cells.forEach((x, i) => x === mokaRoomId && mine.push(i));
    if (mokaRoomId && mine.length) moka = { cells: mine, blocked: props[mokaRoomId] ?? -1 };
  }

  // Bahçe ve süsler (evin çevresinde, ev bitince açılır).
  const garden = gardenParts(floor === 1 ? { ...S, cells: ground } : S, L, dark, theme);
  if (floor === 1) {
    // Bahçe zemin katın hizasında: üst kattan bakınca bir kat aşağıda.
    const down = (xs: ReactElement[]) => (xs.length ? [<G key="gdown" transform={`translate(0 ${WALL_H + SLAB})`}>{xs}</G>] : xs);
    garden.back = down(garden.back);
    garden.front = down(garden.front);
    if (garden.ground) garden.ground = <G transform={`translate(0 ${WALL_H + SLAB})`}>{garden.ground}</G>;
    garden.sprouts = [];
    garden.life.wings = [];
  } else {
    garden.pts.forEach(grow);
    life.breath.push(...garden.life.breath);
    life.twA.push(...garden.life.twA);
    life.twB.push(...garden.life.twB);
  }

  const rings = useMemo(() => {
    if (!pinchZoom || L < 3) return [];
    // Footprint of the ground floor; rings extend it outward in whole blocks.
    let r0 = rows, c0 = cols, r1 = 0, c1 = 0;
    ground.forEach((x, i) => {
      if (!x) return;
      const r = Math.floor(i / cols), c = i % cols;
      r0 = Math.min(r0, r); c0 = Math.min(c0, c); r1 = Math.max(r1, r + 1); c1 = Math.max(c1, c + 1);
    });
    if (r1 <= r0) return [];
    return buildGroundRings({ r0, r1, c0, c1 }, GRASS[theme]?.[dark ? 1 : 0] ?? (dark ? '#3E5A45' : '#BBD9AE'), theme === 'kis', dark);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinchZoom, L >= 3, ground, cols, rows, theme, dark, centerR, centerC]);

  if (!els.length) return null;

  // Keep one fixed projection frame while the model spins so it never grows or shrinks.
  const orbitR = Math.hypot(Math.max(centerR - rMin, rMax - centerR), Math.max(centerC - cMin, cMax - centerC)) + 1.15;
  const halfW = Math.SQRT2 * orbitR * A + 12;
  const halfDepth = Math.SQRT2 * orbitR * B;
  minX = -halfW;
  maxX = halfW;
  minY = -(halfDepth + (L >= 7 ? 82 : WALL_H + 14));
  maxY = halfDepth + SLAB + 18 + (upperCells?.some(Boolean) ? WALL_H + SLAB : 0);

  // Oda isimleri evin dışındaki beyaz alana, sol ve sağ kenara. Yazı ne zemine ne eve biner;
  // her odanın pininden kenardaki etikete bir ok çizgisi çekilir.
  const TAG_H = 34, TAG_GAP = 7, EDGE = 4;
  const ids = [...S.order].filter(id => anchors[id] != null && S.rooms[id]).sort((x, y) => depth(anchors[x]) - depth(anchors[y]));
  const tagW = (id: string) => {
    const rc = roomCounts(S, id, now);
    return 48 + S.rooms[id].name.length * 8.3 + (rc.late + rc.today ? 24 : 0);
  };
  const PAD = 18;
  const sideW = Math.max(0, ...ids.map(tagW));
  const houseMinY = minY, houseMaxY = maxY;
  const houseCenterX = (minX + maxX) / 2, houseCenterY = (houseMinY + houseMaxY) / 2;
  const PAD_X = showLabels ? sideW + TAG_GAP + EDGE : 8;
  minX -= PAD_X; maxX += PAD_X;
  minY -= showLabels ? PAD + TAG_H / 2 : 10; maxY += showLabels ? PAD + TAG_H / 2 : 10;
  const vbW = maxX - minX, vbH = maxY - minY;

  const scene = themeParts(theme, dark, { x: minX, y: minY, w: vbW, h: vbH }, !reduce, !wx || (wx.kind === 'clear' && wx.day && !dark));
  const air = ambient({ theme, dark, wx, L, box: { x: minX, y: minY, w: vbW, h: vbH }, chimney });
  const sc = boxW > 0 ? boxW / vbW : 0;
  const ZMAX = 3, ZMIN = 0.7;
  focusFn.current = (id: string | null) => {
    setFocus(id);
    if (!id || !sc) {
      Animated.parallel([
        Animated.spring(pinch, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 8, tension: 60, useNativeDriver: true }),
      ]).start();
      pinchRef.current.cur = 1; pinchRef.current.px = 0; pinchRef.current.py = 0;
      return;
    }
    const a = anchors[id];
    const [fx, fy] = P(Math.floor(a / cols) + 0.5, (a % cols) + 0.5, 6);
    const Z = 2.4;
    const total = Z * zoom;
    const ox = (fx - (minX + vbW / 2)) * sc, oy = (fy - (minY + vbH / 2)) * sc;
    const tx = -ox * total, ty = -oy * total;
    pinchRef.current.cur = Z; pinchRef.current.px = tx / 1; pinchRef.current.py = ty;
    Animated.parallel([
      Animated.spring(pinch, { toValue: Z, friction: 8, tension: 50, useNativeDriver: true }),
      Animated.spring(pan, { toValue: { x: tx, y: ty }, friction: 8, tension: 50, useNativeDriver: true }),
    ]).start();
  };
  // Zoom'a bağlı sürekli geçiş: yaklaştıkça çatı yükselip büyüyerek solar, çevre detayları da silikleşir.
  const roofOp = pinch.interpolate({ inputRange: [ZMIN, 0.9, 1], outputRange: [1, 0.55, 0], extrapolate: 'clamp' });
  const extOp = pinch.interpolate({ inputRange: [ZMIN, 1, 1.8], outputRange: [1, 1, 0.2], extrapolate: 'clamp' });

  // Square ground rings: ring k fades and scales in once the zoom-out reaches step k (max 5 rings).
  const ringLayers = rings.map(g => {
    const k = g.k;
    const s0 = 1 - 0.06 * (k - 1), s1 = s0 - 0.06;
    const op = pinch.interpolate({ inputRange: [0, s1, s0, 1.01, 4], outputRange: [1, 1, 0, 0, 0], extrapolate: 'clamp' });
    const sc2 = pinch.interpolate({ inputRange: [0, s1, s0, 1.01, 4], outputRange: [1, 1, 0.82, 0.82, 0.82], extrapolate: 'clamp' });
    const dy = floor === 1 ? WALL_H + SLAB : 0;
    return (
      <Animated.View key={'ring' + k} pointerEvents="none" style={{ position: 'absolute', left: `${((g.cx - g.hw - minX) / vbW) * 100}%`, top: `${((g.cy - g.hh + dy - minY) / vbH) * 100}%`, width: `${((2 * g.hw) / vbW) * 100}%`, height: `${((2 * g.hh) / vbH) * 100}%`, opacity: op, transform: [{ scale: sc2 }] }}>
        <Svg width="100%" height="100%" viewBox={`${g.cx - g.hw} ${g.cy - g.hh} ${2 * g.hw} ${2 * g.hh}`}>{g.els}</Svg>
      </Animated.View>
    );
  });
  // Evin altındaki yumuşak gölge.
  const shadow = <Ellipse key="sh" cx={(minX + maxX) / 2} cy={maxY - PAD - B * 1.5} rx={vbW * 0.42} ry={B * 1.8} fill={c.lift} />;

  const stacks = { tl: [] as number[], tr: [] as number[], bl: [] as number[], br: [] as number[] };
  const tags: { id: string; fx: number; fy: number; w: number; cardX: number; cardY: number; right: boolean }[] = [];
  for (const id of ids) {
    const i = anchors[id];
    const [fx, fy] = P(Math.floor(i / cols) + 0.5, (i % cols) + 0.5, 0);
    const right = fx >= houseCenterX;
    const upper = fy < houseCenterY;
    const ys = stacks[upper ? (right ? 'tr' : 'tl') : (right ? 'br' : 'bl')];
    const w = tagW(id);
    // Etiketler sağ ve sol kenar yerine dört köşede gruplanır.
    let top = upper ? houseMinY + EDGE : houseMaxY - EDGE - TAG_H;
    const direction = upper ? 1 : -1;
    for (let pass = 0; pass < 4; pass++) for (const y of ys) {
      if (Math.abs(y - top) < TAG_H + TAG_GAP) top = y + direction * (TAG_H + TAG_GAP);
    }
    ys.push(top);
    const cardX = right ? maxX - EDGE - w : minX + EDGE;
    tags.push({ id, fx, fy, w, cardX, cardY: top, right });
  }

  const svgLabels = showLabels ? tags.map(({ id, fx, fy, w, cardX, cardY, right }) => {
    const room = S.rooms[id];
    const rc = roomCounts(S, id, now);
    const nTask = rc.late + rc.today;
    const isClean = (clean[id] ?? 100) >= 100;
    const ax = right ? cardX : cardX + w;
    const ay = cardY + TAG_H / 2;
    const my = cardY + TAG_H / 2 + 5;

    return (
      <G key={'svgtag-' + id} onPress={() => handleOpenRoom(id)}>
        {/* Oda pini ve ok çizgisi: evdeki odadan etikete. */}
        <Polyline points={pts([[fx, fy], [ax, fy], [ax, ay]])} fill="none" stroke={c.ink} strokeWidth={2} strokeOpacity={0.8} strokeLinejoin="round" />
        <Circle cx={fx} cy={fy} r={4.5} fill={c.ink} />
        <Circle cx={ax} cy={ay} r={3.5} fill={c.ink} />
        {/* Etiket: beyaz kart, emoji, oda adı, varsa iş sayısı. */}
        <Rect x={cardX} y={cardY} width={w} height={TAG_H} rx={TAG_H / 2} fill={c.surface} stroke={c.line} strokeWidth={1.4} />
        <SvgText x={cardX + 19} y={my} fontSize={15} textAnchor="middle">
          {isClean ? '✨' : ROOM_EMOJI[room.type]}
        </SvgText>
        <SvgText x={cardX + 36} y={my} fontSize={14} fontFamily={fonts.bodyBlack} fill={c.ink}>
          {room.name}
        </SvgText>
        {nTask > 0 && (
          <G>
            <Circle cx={cardX + w - 11} cy={cardY + TAG_H / 2} r={7.5} fill={c.warm} />
            <SvgText x={cardX + w - 11} y={cardY + TAG_H / 2 + 3.5} fontSize={9.5} fontFamily={fonts.bodyBlack} fill={c.onBadge} textAnchor="middle">
              {nTask}
            </SvgText>
          </G>
        )}
      </G>
    );
  }) : null;

  const floatY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [1.2, -3.2] });
  const swayX = swayAnim.interpolate({ inputRange: [0, 1], outputRange: [-0.8, 0.8] });
  const tilt = swayAnim.interpolate({ inputRange: [0, 1], outputRange: ['-0.25deg', '0.25deg'] });
  const breathOp = breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const breathScale = breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] });
  const twOpA = twinkle.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.15, 1] });
  const twOpB = twinkle.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.15, 1, 0.15] });
  const vb = `${minX} ${minY} ${vbW} ${vbH}`;
  const layer = (key: string, opacity: Animated.AnimatedInterpolation<number> | Animated.Value, children: ReactElement[], scale?: Animated.AnimatedInterpolation<number>) =>
    children.length > 0 && (
      <Animated.View key={key} pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity, transform: scale ? [{ scale }] : [] }]}>
        <Svg width="100%" height="100%" viewBox={vb}>{lightDefs}{children}</Svg>
      </Animated.View>
    );
  const wings = (open: boolean) =>
    garden.life.wings.flatMap((w, i) => {
      const rx = open ? 2.6 * w.s : 1.5 * w.s, ry = open ? 1.8 * w.s : 2.2 * w.s;
      return [
        <Ellipse key={'wl' + i} cx={w.x - rx * 0.9} cy={w.y} rx={rx} ry={ry} fill={w.col} />,
        <Ellipse key={'wr' + i} cx={w.x + rx * 0.9} cy={w.y} rx={rx} ry={ry} fill={w.col} />,
      ];
    });

  const model = (
    <Animated.View
      onLayout={(e: LayoutChangeEvent) => setBoxW(e.nativeEvent.layout.width)}
      onTouchStart={e => {
        const g = pinchRef.current;
        const t = e.nativeEvent.touches[0];
        if (t) { g.lx = t.pageX; g.ly = t.pageY; }
        g.moved = false;
      }}
      onTouchMove={e => {
        if (!pinchZoom) return;
        const t = e.nativeEvent.touches;
        const g = pinchRef.current;
        if (t.length < 2) {
          // Yakınlaşmışken tek parmakla kaydır.
          if (g.cur > 1.05 && t[0]) {
            const dx = t[0].pageX - g.lx, dy = t[0].pageY - g.ly;
            g.lx = t[0].pageX; g.ly = t[0].pageY;
            if (Math.abs(dx) + Math.abs(dy) > 0.5) g.moved = true;
            const lim = boxW * g.cur * 0.5;
            g.px = Math.max(-lim, Math.min(lim, g.px + dx));
            g.py = Math.max(-lim, Math.min(lim, g.py + dy));
            pan.setValue({ x: g.px, y: g.py });
          }
          return;
        }
        const d = Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
        if (!g.d) { g.d = d; g.base = g.cur; return; }
        g.cur = Math.min(ZMAX, Math.max(ZMIN, g.base * (d / g.d)));
        pinch.setValue(g.cur);
        if (focus) setFocus(null);
      }}
      onTouchEnd={e => {
        if (e.nativeEvent.touches.length >= 2) return;
        const g = pinchRef.current;
        if (!g.d) return;
        g.d = 0;
        // Bırakınca kalır; 1'e yakınsa tam 1'e oturur.
        if (Math.abs(g.cur - 1) < 0.08) {
          g.cur = 1; g.px = 0; g.py = 0;
          Animated.parallel([
            Animated.spring(pinch, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }),
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 7, tension: 70, useNativeDriver: true }),
          ]).start();
        }
      }}
      style={{
        width: '100%',
        aspectRatio: vbW / vbH,
        opacity: pop,
        transform: [
          { translateX: pan.x },
          { translateY: pan.y },
          { translateY: floatY },
          { translateX: swayX },
          { rotate: tilt },
          { scale: zoom },
          { scale: pinch },
          { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
        ],
      }}
    >
      {pinchZoom && sc > 0 && ringLayers}
      <Svg width="100%" height="100%" viewBox={vb} onPress={handlePressHouse}>
        {lightDefs}
        {onPressHouse && <Rect x={minX} y={minY} width={vbW} height={vbH} fill="transparent" onPress={handlePressHouse} />}
        {scene.back}
        {garden.ground ?? shadow}
        {garden.back}
        {els}
        {garden.front}
        {scene.front}
        {svgLabels}
      </Svg>
      {layer('breath', breathOp, life.breath, breathScale)}
      {layer('twa', twOpA, [...life.twA, ...wings(true)])}
      {extEls.length > 0 && pinchZoom && (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: extOp }]}>
          <Svg width="100%" height="100%" viewBox={vb}>{extEls}</Svg>
        </Animated.View>
      )}
      {roofEls.length > 0 && pinchZoom && (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: roofOp }]}>
          <Svg width="100%" height="100%" viewBox={vb}>{roofEls}</Svg>
        </Animated.View>
      )}
      {layer('twb', twOpB, [...life.twB, ...wings(false)])}
      {sc > 0 && pets.map((pt, i) => <Roamer key={'pet' + i + pt.id} vb={vb} scale={sc} nodes={pt.nodes} start={pt.start} home={pt.home} kind={pt.id as 'kedi' | 'kopek'} reduce={reduce}>{pt.el}</Roamer>)}
      {burst > 0 && !reduce && <Burst key={burst} vb={vb} cx={(minX + maxX) / 2} cy={minY + vbH * 0.5} spread={vbW * 0.28} />}
      {sc > 0 && moka && <MokaPet vb={vb} roomCells={moka.cells} blocked={moka.blocked} cols={cols} project={P} reduce={reduce} celebrate={burst} night={isNight} />}
      {sc > 0 && air.clouds.length > 0 && <Drift vb={vb} scale={sc} dx={vbW * 0.08} ms={24000} reduce={reduce}>{air.clouds}</Drift>}
      {sc > 0 && air.clouds2.length > 0 && <Drift vb={vb} scale={sc} dx={-vbW * 0.06} ms={36000} reduce={reduce}>{air.clouds2}</Drift>}
      {sc > 0 && air.birds.length > 0 && <Drift vb={vb} scale={sc} dx={vbW * 0.3} dy={-vbH * 0.03} ms={14000} reduce={reduce}>{air.birds}</Drift>}
      {sc > 0 && !reduce && air.smoke.length > 0 && <Drift vb={vb} scale={sc} dy={-12} dx={4} ms={3200} restart fade reduce={reduce}>{air.smoke}</Drift>}
      {sc > 0 && !reduce && air.rain.length > 0 && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
          <Drift vb={vb} scale={sc} dy={vbH} dx={-vbW * 0.02} ms={1400} restart reduce={reduce}>{air.rain}</Drift>
        </View>
      )}
      {sc > 0 && !reduce && air.snow.length > 0 && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
          <Drift vb={vb} scale={sc} dy={vbH} dx={vbW * 0.03} ms={9000} restart reduce={reduce}>{air.snow}</Drift>
        </View>
      )}
      {garden.sprouts.length > 0 && (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: sproutOpacity, transform: [{ scale: sproutScale }] }]}>
          <Svg width="100%" height="100%" viewBox={vb}>
            <G>{garden.sprouts}</G>
          </Svg>
        </Animated.View>
      )}
    </Animated.View>
  );
  const focusRoom = focus ? S.rooms[focus] : null;
  const focusBar = focusRoom ? (
    <View style={[st3.bar, { backgroundColor: c.surface, borderColor: c.line }]}>
      <Pressable accessibilityRole="button" onPress={() => focusFn.current(null)} hitSlop={8} style={st3.btn}>
        <SvgLessText color={c.ink}>← Uzaklaş</SvgLessText>
      </Pressable>
      <SvgLessText color={c.ink} bold>{ROOM_EMOJI[focusRoom.type]} {focusRoom.name}</SvgLessText>
      {onOpenRoom && (
        <Pressable accessibilityRole="button" onPress={() => { const id = focus!; focusFn.current(null); onOpenRoom(id); }} hitSlop={8} style={[st3.btn, { backgroundColor: c.ink }]}>
          <SvgLessText color={c.bg}>Odaya gir →</SvgLessText>
        </Pressable>
      )}
    </View>
  ) : null;
  const colors = skyColors(theme, dark, wx);
  const boxH = sc > 0 ? (boxW * vbH) / vbW : 0;
  const content = onPressHouse ? (
    <Pressable accessibilityRole="button" accessibilityLabel="Evi yakından görüntüle" onPress={handlePressHouse} style={{ width: '100%' }}>
      {model}
    </Pressable>
  ) : model;
  if (!colors) return <View style={{ width: '100%' }}>{content}{focusBar}</View>;
  return (
    <View style={{ width: '100%' }}>
      {sc > 0 && <SkyBackdrop colors={colors} w={boxW} h={boxH} bleed={bleed} night={isNight} sun={!!wx && wx.day && wx.kind === 'clear' && !dark} twA={twOpA} twB={twOpB} breath={breathOp} />}
      {content}
      {focusBar}
    </View>
  );
}

function SvgLessText({ children, color, bold }: { children: React.ReactNode; color: string; bold?: boolean }) {
  return <RNText style={{ color, fontFamily: bold ? fonts.bodyBlack : fonts.bodyBold, fontSize: 14 }}>{children}</RNText>;
}
const st3 = StyleSheet.create({
  bar: { position: 'absolute', left: 12, right: 12, bottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 8, borderRadius: 999, borderWidth: 1 },
  btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
});
