import { useEffect, useState, type ReactElement } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Polygon } from 'react-native-svg';

import { roomCounts } from '@/domain/logic';
import { useNow } from '@/hooks/useNow';
import { ROOM_ICON } from '@/domain/messages';
import type { AppState, RoomType } from '@/domain/types';
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
  const ball = (n: string, u: number, v: number, z: number, rad: number, fill: string) => {
    const [x, y] = P(r + u, c + v, z);
    return <Circle key={k + n} cx={x} cy={y} r={rad} fill={fill} />;
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
      ];
      break;
    case 'cocuk':
      faces = [
        ...b('a', 0.3, 0.22, 0.22, 0.22, 0, 9, '#E58C7E'),
        ...b('b', 0.3, 0.48, 0.22, 0.22, 0, 9, '#78A1BB'),
        ...b('c', 0.3, 0.35, 0.22, 0.22, 9, 9, '#F2C46D'),
      ];
      extra.push(ball('t', 0.72, 0.62, 5, 5, '#E58C7E'));
      break;
    case 'salon':
      faces = [
        ...b('s', 0.24, 0.14, 0.5, 0.72, 0, 7, '#BFA89E'),
        ...b('k', 0.24, 0.14, 0.14, 0.72, 7, 9, shade('#BFA89E', -0.05)),
        ...b('m', 0.4, 0.2, 0.3, 0.28, 7, 3, WHITE),
        ...b('n', 0.4, 0.52, 0.3, 0.28, 7, 3, WHITE),
      ];
      break;
    case 'mutfak':
      faces = [
        ...b('t', 0.12, 0.14, 0.3, 0.72, 0, 15, WHITE),
        ...b('p', 0.18, 0.3, 0.16, 0.18, 15, 6, '#B8584C'),
        ...b('m', 0.58, 0.3, 0.28, 0.42, 0, 9, WOOD),
      ];
      break;
    case 'banyo':
      faces = [...b('k', 0.2, 0.14, 0.62, 0.72, 0, 11, WHITE), ...b('s', 0.26, 0.2, 0.5, 0.6, 11, 0.5, WATER)];
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
  return [
    ...faces.map(f => <Polygon key={f.key} points={f.points} fill={f.fill} stroke={f.fill} strokeWidth={0.6} strokeLinejoin="round" />),
    ...extra,
  ];
}

type Props = {
  state: AppState;
  onOpenRoom?: (id: string) => void;
  now?: number;
};

export function House3D({ state: S, onOpenRoom, now: nowProp }: Props) {
  const c = useColors();
  const tick = useNow();
  const now = nowProp ?? tick;
  const dark = useIsDark();
  const [width, setWidth] = useState(0);

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

  // Ressam sıralaması: arkadaki bloklar (satır + sütun küçük olan) önce çizilir.
  const order = cells.map((_, i) => i).filter(i => cells[i]);
  order.sort((a, b) => Math.floor(a / cols) + (a % cols) - (Math.floor(b / cols) + (b % cols)) || a - b);

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
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

  for (const i of order) {
    const id = cells[i]!;
    const room = S.rooms[id];
    if (!room) continue;
    const r = Math.floor(i / cols), col = i % cols;
    for (const [x, y] of [P(r, col, WALL_H), P(r + 1, col + 1, -SLAB), P(r + 1, col, -SLAB), P(r, col + 1, -SLAB), P(r, col, WALL_H + 8)]) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    const open = onOpenRoom ? () => onOpenRoom(id) : undefined;
    const floor = c.room[room.type];
    const k = 'c' + i;

    // Zemin kalınlığı: önü boşsa yan yüzü görünür.
    if (!at(r + 1, col))
      add({ key: k + 'bl', fill: shade(slab, -0.05), points: pts([P(r + 1, col, -SLAB), P(r + 1, col + 1, -SLAB), P(r + 1, col + 1, 0), P(r + 1, col, 0)]) });
    if (!at(r, col + 1))
      add({ key: k + 'br', fill: shade(slab, -0.2), points: pts([P(r, col + 1, -SLAB), P(r + 1, col + 1, -SLAB), P(r + 1, col + 1, 0), P(r, col + 1, 0)]) });

    // Taban. Damalı olsun diye her ikinci blok çok hafif koyu.
    add({
      key: k + 'f',
      fill: (r + col) % 2 ? shade(floor, dark ? 0.03 : -0.025) : floor,
      points: pts([P(r, col), P(r, col + 1), P(r + 1, col + 1), P(r + 1, col)]),
      onPress: open,
    });

    // Arka duvarlar (kuzey ve batı kenarı). Dışarıya bakan yüksek, iki oda arasındaki alçak.
    const n = at(r - 1, col), w = at(r, col - 1);
    if (n !== id) {
      const h = n ? INNER_H : WALL_H;
      box(k + 'n', r, col, T, 1, 0, h, wallFace).forEach(f => add({ ...f, fill: f.key.endsWith('t') ? cap : f.fill }));
      if (!n && (r + col) % 2 === 0)
        add({ key: k + 'nw', fill: c.hi, points: pts([P(r + T, col + 0.32, 13), P(r + T, col + 0.68, 13), P(r + T, col + 0.68, 25), P(r + T, col + 0.32, 25)]) });
    }
    if (w !== id) {
      const h = w ? INNER_H : WALL_H;
      const r0 = n !== id ? r + T : r;
      box(k + 'w', r0, col, r + 1 - r0, T, 0, h, wallFace).forEach(f => add({ ...f, fill: f.key.endsWith('t') ? cap : f.fill }));
      if (!w && (r + col) % 2 === 1)
        add({ key: k + 'ww', fill: c.hi, points: pts([P(r + 0.32, col + T, 13), P(r + 0.68, col + T, 13), P(r + 0.68, col + T, 25), P(r + 0.32, col + T, 25)]) });
    }

    if (props[id] === i) els.push(<G key={k + 'e'} onPress={open}>{furniture(room.type, r, col, k + 'e', c)}</G>);

    // Ön duvarlar: dışarıya bakan kenarlarda alçak bir parapet, içi görünsün.
    if (!at(r + 1, col)) box(k + 's', r + 1 - T, col, T, 1, 0, FRONT_H, wallFace).forEach(f => add({ ...f, fill: f.key.endsWith('t') ? cap : f.fill }));
    if (!at(r, col + 1)) box(k + 'x', r, col + 1 - T, 1, T, 0, FRONT_H, wallFace).forEach(f => add({ ...f, fill: f.key.endsWith('t') ? cap : f.fill }));
  }

  if (!els.length) return null;

  const PAD = 10;
  minX -= PAD; maxX += PAD; minY -= PAD; maxY += PAD + 6;
  const vbW = maxX - minX, vbH = maxY - minY;
  const scale = width ? width / vbW : 0;

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
      <View key={id} style={[styles.anchor, { left: x, top: y }]}>
        <Pressable
          onPress={() => onOpenRoom?.(id)}
          accessibilityRole="button"
          accessibilityLabel={`${room.name} odasını aç${nTask ? `, ${nTask} iş bekliyor` : ''}`}
          hitSlop={4}
          style={({ pressed }) => [
            styles.tag,
            { backgroundColor: c.surface, borderColor: c.line, boxShadow: `0 2px 0 ${c.line}` },
            pressed && { transform: [{ translateY: 1 }] },
          ]}
        >
          <Text style={styles.icon}>{ROOM_ICON[room.type]}</Text>
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
    <Animated.View
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
      style={{
        width: '100%',
        aspectRatio: vbW / vbH,
        opacity: pop,
        transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
      }}
    >
      <Svg width="100%" height="100%" viewBox={`${minX} ${minY} ${vbW} ${vbH}`}>
        {shadow}
        {els}
      </Svg>
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        {labels}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Genişliği sıfır bir çapa; içindeki etiket noktanın tam ortasına gelir.
  anchor: { position: 'absolute', width: 0, height: 0, alignItems: 'center', justifyContent: 'center' },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingLeft: 6, paddingRight: 8,
    borderRadius: 999, borderWidth: 1.5, maxWidth: 140,
  },
  icon: { fontSize: 12 },
  name: { fontFamily: fonts.display, fontSize: 12, lineHeight: 16, flexShrink: 1 },
  badge: { minWidth: 18, paddingHorizontal: 5, borderRadius: 999, alignItems: 'center', marginLeft: 2 },
  badgeText: { fontFamily: fonts.bodyBlack, fontSize: 11, lineHeight: 16 },
});
