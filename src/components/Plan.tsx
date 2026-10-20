import { useLayoutEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import { roomBounds, roomCounts } from '@/domain/logic';
import type { AppState } from '@/domain/types';
import { fonts, radius, useColors } from '@/theme';

const WALL = 3;

type Props = {
  state: AppState;
  edit?: boolean;
  /** Düzenleme modunda boyanan oda id'si (çerçevesi taralı görünür). */
  activeId?: string | null;
  /** Görünüm modunda bir odaya dokunulunca. */
  onOpenRoom?: (id: string) => void;
  /** Düzenleme modunda bir hücreye dokunulunca ya da parmak üstünden geçince. */
  onPaint?: (index: number, first: boolean) => void;
  onPaintEnd?: () => void;
  onPaintingChange?: (painting: boolean) => void;
};

export function Plan({ state: S, edit, activeId, onOpenRoom, onPaint, onPaintEnd, onPaintingChange }: Props) {
  const c = useColors();
  const [width, setWidth] = useState(0);
  const size = width / S.cols;

  const live = useRef<PaintState>({ size, cols: S.cols, rows: S.rows, last: -1, ox: 0, oy: 0, px: 0, py: 0 });
  useLayoutEffect(() => {
    Object.assign(live.current, { size, onPaint, onPaintEnd, onPaintingChange, cols: S.cols, rows: S.rows });
  });
  // Ref yalnızca dokunma olaylarında okunur; render sırasında okunmuyor.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() => createPaintResponder(live));

  const { cols, rows, cells } = S;
  const same = (r: number, col: number, id: string) =>
    r >= 0 && r < rows && col >= 0 && col < cols && cells[r * cols + col] === id;

  // Hücreleri tam piksele oturt; kesirli boyutlarda aynı odanın hücreleri arasında ince çizgi kalmasın.
  const px = (n: number) => Math.round(n * size);
  const cellBox = (r: number, col: number, h = 1, w = 1) => ({
    left: px(col), top: px(r), width: px(col + w) - px(col), height: px(r + h) - px(r),
  });

  const tiles = [];
  if (size > 0) {
    for (let i = 0; i < cols * rows; i++) {
      const id = cells[i];
      const r = Math.floor(i / cols), col = i % cols;
      const pos = cellBox(r, col);
      if (!id) {
        tiles.push(
          edit ? (
            <View key={i} style={[styles.abs, pos, { padding: 1 }]}>
              <View style={{ flex: 1, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.line, borderRadius: 6 }} />
            </View>
          ) : (
            <View key={i} style={[styles.abs, pos, styles.center]}>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: c.line }} />
            </View>
          ),
        );
        continue;
      }
      const room = S.rooms[id];
      if (!room) continue;
      const t = !same(r - 1, col, id), b = !same(r + 1, col, id), l = !same(r, col - 1, id), ri = !same(r, col + 1, id);
      const R = radius.plan;
      tiles.push(
        <View
          key={i}
          style={[
            styles.abs,
            pos,
            // Aynı odanın komşu hücresine 1 px taş; ölçeklenen ekranlarda aradaki ince çizgi görünmesin.
            { width: pos.width + (ri ? 0 : 1), height: pos.height + (b ? 0 : 1) },
            {
              backgroundColor: c.room[room.type],
              borderColor: c.wall,
              borderTopWidth: t ? WALL : 0,
              borderBottomWidth: b ? WALL : 0,
              borderLeftWidth: l ? WALL : 0,
              borderRightWidth: ri ? WALL : 0,
              borderTopLeftRadius: t && l ? R : 0,
              borderTopRightRadius: t && ri ? R : 0,
              borderBottomRightRadius: b && ri ? R : 0,
              borderBottomLeftRadius: b && l ? R : 0,
            },
          ]}
        >
          {edit && id === activeId && <View style={[StyleSheet.absoluteFill, { backgroundColor: c.hatch }]} />}
        </View>,
      );
    }
  }

  const labels =
    size > 0
      ? S.order.map(id => {
          const bb = roomBounds(S, id);
          if (!bb) return null;
          let badge = null;
          if (!edit) {
            const rc = roomCounts(S, id);
            const n = rc.late + rc.today;
            if (n)
              badge = (
                <View style={[styles.badge, { backgroundColor: rc.late ? c.late : c.warm }]}>
                  <Text style={[styles.badgeText, { color: c.onBadge }]}>{n}</Text>
                </View>
              );
          }
          const box = labelBox(S, id, bb, cellBox);
          return (
            <View key={'l' + id} pointerEvents="none" style={[styles.abs, styles.center, box, { padding: 5, gap: 4 }]}>
              <Text style={[styles.rname, { color: c.ink }]} numberOfLines={2}>{S.rooms[id].name}</Text>
              {badge}
            </View>
          );
        })
      : null;

  // Görünüm modunda: her odanın hücreleri dokunulabilir.
  const hitAreas =
    !edit && size > 0
      ? cells.map((id, i) => {
          if (!id) return null;
          // Ekran okuyucu her oda için tek bir buton duysun.
          const firstCell = cells.indexOf(id) === i;
          return (
            <Pressable
              key={'p' + i}
              accessible={firstCell}
              accessibilityRole="button"
              accessibilityLabel={`${S.rooms[id]?.name} odasını aç`}
              onPress={() => onOpenRoom?.(id)}
              style={[styles.abs, cellBox(Math.floor(i / cols), i % cols)]}
            />
          );
        })
      : null;

  return (
    <View style={[styles.wrap, { backgroundColor: c.surface, boxShadow: `0 3px 0 ${c.line}, 0 12px 28px ${c.lift}` }]}>
      <View
        onLayout={e => setWidth(e.nativeEvent.layout.width)}
        style={{ width: '100%', aspectRatio: cols / rows }}
        {...(edit ? responder.panHandlers : null)}
      >
        <View pointerEvents={edit ? 'none' : 'box-none'} style={StyleSheet.absoluteFill}>
          {tiles}
          {labels}
          {hitAreas}
        </View>
      </View>
    </View>
  );
}

/**
 * Oda adının yazılacağı alan. Oda dikdörtgense tamamı; L gibi bir şekildeyse adın başka
 * odanın üstüne taşmaması için odanın en uzun yatay şeridi.
 */
function labelBox(
  S: AppState,
  id: string,
  bb: { minr: number; minc: number; maxr: number; maxc: number },
  cellBox: (r: number, col: number, h?: number, w?: number) => { left: number; top: number; width: number; height: number },
) {
  const h = bb.maxr - bb.minr + 1, w = bb.maxc - bb.minc + 1;
  let filled = 0;
  for (let r = bb.minr; r <= bb.maxr; r++) for (let c = bb.minc; c <= bb.maxc; c++) if (S.cells[r * S.cols + c] === id) filled++;
  if (filled === h * w) return cellBox(bb.minr, bb.minc, h, w);
  let best = { r: bb.minr, c: bb.minc, len: 0 };
  for (let r = bb.minr; r <= bb.maxr; r++) {
    let run = 0;
    for (let c = bb.minc; c <= bb.maxc + 1; c++) {
      if (c <= bb.maxc && S.cells[r * S.cols + c] === id) run++;
      else {
        if (run > best.len) best = { r, c: c - run, len: run };
        run = 0;
      }
    }
  }
  return cellBox(best.r, best.c, 1, best.len);
}

type PaintState = Pick<Props, 'onPaint' | 'onPaintEnd' | 'onPaintingChange'> & {
  size: number; cols: number; rows: number;
  /** Sürüklerken son boyanan hücre; aynı hücre tekrar boyanmasın. */
  last: number;
  /** Izgaranın ekrandaki sol üst köşesi. */
  ox: number; oy: number;
  /** Son dokunma noktası (ızgaraya göre). */
  px: number; py: number;
};

/** Parmağın altındaki hücreyi bulup `onPaint` çağıran dokunma yöneticisi. */
function createPaintResponder(ref: { current: PaintState }) {
  const paintAt = (x: number, y: number, first: boolean) => {
    const p = ref.current;
    const col = Math.floor(x / p.size), row = Math.floor(y / p.size);
    if (col < 0 || row < 0 || col >= p.cols || row >= p.rows) return;
    const i = row * p.cols + col;
    if (i === p.last) return;
    p.last = i;
    p.onPaint?.(i, first);
  };
  const hit = (e: GestureResponderEvent, first: boolean) => {
    const p = ref.current;
    if (p.size <= 0) return;
    const x = e.nativeEvent.pageX - p.ox, y = e.nativeEvent.pageY - p.oy;
    // Hızlı kaydırmada dokunma olayları seyrek gelir; aradaki hücreler atlanmasın.
    if (!first) {
      const steps = Math.ceil(Math.hypot(x - p.px, y - p.py) / (p.size / 3));
      for (let k = 1; k < steps; k++) paintAt(p.px + ((x - p.px) * k) / steps, p.py + ((y - p.py) * k) / steps, false);
    }
    p.px = x;
    p.py = y;
    paintAt(x, y, first);
  };
  const end = () => {
    ref.current.onPaintingChange?.(false);
    ref.current.onPaintEnd?.();
  };
  return PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: e => {
      const { pageX, pageY, locationX, locationY } = e.nativeEvent;
      Object.assign(ref.current, { ox: pageX - locationX, oy: pageY - locationY, last: -1 });
      ref.current.onPaintingChange?.(true);
      hit(e, true);
    },
    onPanResponderMove: e => hit(e, false),
    onPanResponderRelease: end,
    onPanResponderTerminate: end,
  });
}

/** Oda ekranının başlığındaki küçük şekil. */
export function MiniShape({ state: S, id }: { state: AppState; id: string }) {
  const c = useColors();
  const bb = roomBounds(S, id);
  if (!bb) return null;
  const rowsOut = [];
  for (let r = bb.minr; r <= bb.maxr; r++) {
    const row = [];
    for (let col = bb.minc; col <= bb.maxc; col++) {
      const on = S.cells[r * S.cols + col] === id;
      row.push(
        <View key={col} style={{ width: 10, height: 10, margin: 1, borderRadius: 3, backgroundColor: on ? c.wall : 'transparent', opacity: on ? 0.85 : 1 }} />,
      );
    }
    rowsOut.push(<View key={r} style={{ flexDirection: 'row' }}>{row}</View>);
  }
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{rowsOut}</View>;
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.card, padding: 14 },
  abs: { position: 'absolute' },
  center: { alignItems: 'center', justifyContent: 'center' },
  rname: { fontFamily: fonts.display, fontSize: 12, lineHeight: 14, textAlign: 'center' },
  badge: { minWidth: 20, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, alignItems: 'center' },
  badgeText: { fontFamily: fonts.bodyBlack, fontSize: 11 },
});
