import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import type { DayBar, DotMark, MoodPoint } from '@/domain/stats';
import type { RoomType } from '@/domain/types';
import { fonts, radius, useColors } from '@/theme';

import { useReduceMotion } from './motion';

/** Gelişim grafikleri: yuvarlak uçlu, pastel, yerel sürücüyle büyüyen (docs/skeleton-v3.md). */

/** 0 → 1 büyüme değeri; hareketi azalt açıksa hemen 1. */
function useGrow(delay = 0) {
  const reduce = useReduceMotion();
  const [v] = useState(() => new Animated.Value(reduce ? 1 : 0));
  useEffect(() => {
    if (reduce) return v.setValue(1);
    const a = Animated.timing(v, { toValue: 1, duration: 650, delay, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [v, delay, reduce]);
  return v;
}

/** Son 7 günün çubukları. Bugünkü çubuk vurgulu, üstünde sayı. */
export function WeekBars({ bars, height = 120 }: { bars: DayBar[]; height?: number }) {
  const c = useColors();
  const max = Math.max(3, ...bars.map(b => b.n));
  // Hiç iş yoksa boş bir kutu yerine alçak, sakin bir şerit.
  if (!bars.some(b => b.n)) height = 36;
  return (
    <View style={[st.bars, { height: height + 40 }]} accessibilityLabel={bars.map(b => `${b.label} ${b.n}`).join(', ')}>
      {bars.map((b, i) => (
        <Bar1 key={b.key} b={b} i={i} h={Math.max(10, (b.n / max) * height)} color={b.today ? c.peach : b.n ? c.sage : c.surface2} ink={c.ink} muted={c.muted} />
      ))}
    </View>
  );
}

function Bar1({ b, i, h, color, ink, muted }: { b: DayBar; i: number; h: number; color: string; ink: string; muted: string }) {
  const v = useGrow(i * 60);
  return (
    <View style={st.barCol}>
      <Text style={[st.barN, { color: b.n ? ink : 'transparent' }]}>{b.n}</Text>
      <Animated.View style={[st.bar, { height: h, backgroundColor: color, transformOrigin: 'bottom', transform: [{ scaleY: v }] }]} />
      <Text style={[st.barL, { color: b.today ? ink : muted, fontFamily: b.today ? fonts.bodyBlack : fonts.bodyBold }]}>{b.label}</Text>
    </View>
  );
}

/** Yüzde halkası; ortada büyük sayı ve küçük ad. */
export function Ring({ pct, size = 112, stroke = 13, color, label, emoji }: { pct: number; size?: number; stroke?: number; color?: string; label?: string; emoji?: string }) {
  const c = useColors();
  const v = useGrow();
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  const id = `rg${Math.round(size)}${label ?? ''}`.replace(/\W/g, '');
  return (
    <Animated.View style={{ width: size, height: size, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }} accessibilityLabel={`${label ?? ''} yüzde ${p}`}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color ?? c.sage} />
            <Stop offset="1" stopColor={c.accent} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.surface2} strokeWidth={stroke} fill="none" />
        {p > 0 && <Circle
          cx={size / 2} cy={size / 2} r={r} stroke={`url(#${id})`} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${(len * p) / 100} ${len}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />}
      </Svg>
      <View style={[StyleSheet.absoluteFill, st.center]}>
        {emoji ? <Text style={{ fontSize: size * 0.16 }}>{emoji}</Text> : null}
        <Text style={[st.ringN, { color: c.ink, fontSize: size * 0.24 }]}>%{p}</Text>
        {label ? <Text style={[st.ringL, { color: c.muted }]}>{label}</Text> : null}
      </View>
    </Animated.View>
  );
}

/** Son 4 haftanın seri takvimi: pazartesiden başlayan 7 sütun. */
export function StreakDots({ dots }: { dots: { key: string; mark: DotMark }[] }) {
  const c = useColors();
  const fill: Record<DotMark, string> = { done: c.peach, ice: c.lavender, miss: c.surface2, today: c.surface, future: 'transparent' };
  return (
    <View style={{ gap: 6 }}>
      <View style={st.dotRow}>
        {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map(d => <Text key={d} style={[st.dotHead, { color: c.muted }]}>{d}</Text>)}
      </View>
      {[0, 1, 2, 3].map(w => (
        <View key={w} style={st.dotRow}>
          {dots.slice(w * 7, w * 7 + 7).map(d => (
            <View key={d.key} style={[st.dot, { backgroundColor: fill[d.mark], borderColor: d.mark === 'today' ? c.peach : 'transparent' }]}>
              {d.mark === 'done' ? <Text style={st.dotE}>🔥</Text> : d.mark === 'ice' ? <Text style={st.dotE}>❄️</Text> : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** Ruh hali çizgisi: bilinen günler yumuşak eğriyle bağlanır, noktalarda emoji. */
export function MoodLine({ points, height = 110 }: { points: MoodPoint[]; height?: number }) {
  const c = useColors();
  const [w, setW] = useState(0);
  if (!points.some(p => p.score != null)) height = 44;
  const pad = 14;
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1);
  const y = (s: number) => pad + ((5 - s) / 4) * (height - pad * 2);
  const known = points.map((p, i) => ({ ...p, i })).filter(p => p.score != null) as (MoodPoint & { i: number; score: number })[];
  let d = '';
  known.forEach((p, k) => {
    const X = x(p.i), Y = y(p.score);
    if (!k) d = `M${X} ${Y}`;
    else {
      const q = known[k - 1];
      const mx = (x(q.i) + X) / 2;
      d += ` C${mx} ${y(q.score)} ${mx} ${Y} ${X} ${Y}`;
    }
  });
  const area = known.length > 1 ? `${d} L${x(known[known.length - 1].i)} ${height} L${x(known[0].i)} ${height} Z` : '';
  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)} style={{ height: height + 18 }}>
      {w > 0 && (
        <Svg width={w} height={height}>
          <Defs>
            <LinearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c.rose} stopOpacity={0.55} />
              <Stop offset="1" stopColor={c.rose} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {[1, 3, 5].map(s => <Path key={s} d={`M${pad} ${y(s)} H${w - pad}`} stroke={c.line} strokeWidth={1} strokeDasharray="3 6" />)}
          {area ? <Path d={area} fill="url(#moodFill)" /> : null}
          {d ? <Path d={d} stroke={c.rose} strokeWidth={3.5} fill="none" strokeLinecap="round" /> : null}
        </Svg>
      )}
      {w > 0 && known.map(p => (
        <Text key={p.key} style={[st.moodE, { left: x(p.i) - 11, top: y(p.score) - 12 }]}>{p.emoji}</Text>
      ))}
      {w > 0 && (
        <View style={st.moodAxis}>
          {points.map((p, i) => (i % 2 === points.length % 2 ? null : <Text key={p.key} style={[st.moodL, { color: c.muted, left: x(i) - 10 }]}>{p.label}</Text>))}
        </View>
      )}
    </View>
  );
}

/** Odaların temizlik yüzdesi: oda renginde yatay çubuklar. */
export function RoomBars({ rooms, emoji }: { rooms: { id: string; name: string; type: RoomType; pct: number }[]; emoji: Record<RoomType, string> }) {
  const c = useColors();
  return (
    <View style={{ gap: 12 }}>
      {rooms.map((r, i) => <RoomBar key={r.id} r={r} i={i} emoji={emoji[r.type]} color={c.room[r.type]} />)}
    </View>
  );
}

function RoomBar({ r, i, emoji, color }: { r: { name: string; pct: number }; i: number; emoji: string; color: string }) {
  const c = useColors();
  const v = useGrow(i * 70);
  return (
    <View style={st.roomRow} accessibilityLabel={`${r.name} yüzde ${r.pct} temiz`}>
      <View style={[st.roomIcon, { backgroundColor: color }]}><Text style={{ fontSize: 17 }}>{emoji}</Text></View>
      <View style={{ flex: 1, gap: 5 }}>
        <View style={st.roomHead}>
          <Text numberOfLines={1} style={[st.roomName, { color: c.ink }]}>{r.name}</Text>
          <Text style={[st.roomPct, { color: r.pct < 40 ? c.late : c.muted }]}>%{r.pct}</Text>
        </View>
        <View style={[st.track, { backgroundColor: c.surface2 }]}>
          <Animated.View style={[st.fill, { width: `${Math.max(4, r.pct)}%`, backgroundColor: color, transformOrigin: 'left', transform: [{ scaleX: v }] }]} />
        </View>
      </View>
    </View>
  );
}

/** Küçük sayı kutucuğu (ör. "12 gün seri"). */
export function StatPill({ emoji, n, label, tint }: { emoji: string; n: string | number; label: string; tint: string }) {
  const c = useColors();
  return (
    <View style={[st.pill, { backgroundColor: tint }]}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text style={[st.pillN, { color: c.ink }]}>{n}</Text>
      <Text style={[st.pillL, { color: c.muted }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  bar: { width: '100%', maxWidth: 30, borderRadius: radius.pill },
  barN: { fontFamily: fonts.bodyBlack, fontSize: 12 },
  barL: { fontSize: 12 },
  ringN: { fontFamily: fonts.displayBold, letterSpacing: -0.5 },
  ringL: { fontFamily: fonts.bodyBold, fontSize: 11.5, marginTop: -4 },
  dotRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dotHead: { width: 34, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 11 },
  dot: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dotE: { fontSize: 14 },
  moodE: { position: 'absolute', fontSize: 18, width: 22, textAlign: 'center' },
  moodAxis: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 16 },
  moodL: { position: 'absolute', width: 20, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 10.5 },
  roomRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roomIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  roomHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  roomName: { flex: 1, fontFamily: fonts.bodyBlack, fontSize: 14 },
  roomPct: { fontFamily: fonts.bodyBlack, fontSize: 13 },
  track: { height: 12, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: 12, borderRadius: radius.pill },
  pill: { flex: 1, alignItems: 'center', gap: 1, borderRadius: radius.tile, paddingVertical: 14 },
  pillN: { fontFamily: fonts.displayBold, fontSize: 24, lineHeight: 28 },
  pillL: { fontFamily: fonts.bodyBold, fontSize: 12 },
});
