import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { MOKA_ASSETS } from '@/constants/moka';
import type { RoomType } from '@/domain/types';
import { brand, fonts, radius, useColors } from '@/theme';

/**
 * Tanıtım sayfalarının çizimleri. Hepsi tombul, yuvarlak hatlı, yumuşak gölgeli (logodaki tarz).
 * `t`: 0 → 1 arası sürekli dönen saat; her çizim kendi hareketini bundan türetir.
 */
type Props = { t: Animated.Value };

const SIZE = 280;

/* ---------- 1. Evini çiz ---------- */

const PLAN: (RoomType | null)[] = [
  'yatak', 'yatak', 'mutfak', 'mutfak',
  'yatak', 'yatak', 'mutfak', 'mutfak',
  'antre', 'antre', 'banyo', 'banyo',
  'salon', 'salon', 'salon', 'balkon',
];

export function PlanArt({ t }: Props) {
  const c = useColors();
  const cell = 52;
  const gap = 6;
  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[s.board, { backgroundColor: c.surface }]}>
        <View style={{ width: cell * 4 + gap * 3, flexDirection: 'row', flexWrap: 'wrap', gap }}>
          {PLAN.map((type, i) => {
            const start = 0.03 + i * 0.035;
            const scale = t.interpolate({
              inputRange: [0, start, start + 0.07, start + 0.1, 0.9, 0.97, 1],
              outputRange: [0, 0, 1.12, 1, 1, 0, 0],
              extrapolate: 'clamp',
            });
            return (
              <View key={i} style={[s.cellHole, { width: cell, height: cell, backgroundColor: c.hatch }]}>
                <Animated.View
                  style={[
                    StyleSheet.absoluteFill,
                    { borderRadius: 12, backgroundColor: type ? c.room[type] : c.surface2, transform: [{ scale }] },
                  ]}
                />
              </View>
            );
          })}
        </View>
        <Badge t={t} n={2} color={c.late} style={{ top: 18, left: 62 }} at={0.62} />
        <Badge t={t} n={1} color={c.warm} style={{ top: 132, right: 30 }} at={0.7} />
      </View>
      <Finger t={t} />
    </View>
  );
}

function Badge({ t, n, color, style, at }: Props & { n: number; color: string; style: object; at: number }) {
  const c = useColors();
  const scale = t.interpolate({ inputRange: [0, at, at + 0.06, at + 0.1, 0.9, 0.95, 1], outputRange: [0, 0, 1.3, 1, 1, 0, 0], extrapolate: 'clamp' });
  return (
    <Animated.View style={[s.badge, style, { backgroundColor: color, borderColor: c.surface, transform: [{ scale }] }]}>
      <Text style={{ color: c.onBadge, fontFamily: fonts.bodyBlack, fontSize: 14 }}>{n}</Text>
    </Animated.View>
  );
}

/** Blokları boyayan parmak: plan boyunca kayar. */
function Finger({ t }: Props) {
  const c = useColors();
  const x = t.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 1], outputRange: [-70, 40, -40, 60, -70] });
  const y = t.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 1], outputRange: [-60, -50, 20, 70, -60] });
  return (
    <Animated.View pointerEvents="none" style={[s.finger, { borderColor: c.surface, backgroundColor: c.hi, transform: [{ translateX: x }, { translateY: y }] }]} />
  );
}

/* ---------- 2. Rutinler ---------- */

export function RoutineArt({ t }: Props) {
  const c = useColors();
  const rows = [
    { name: 'Bulaşık', pill: 'Gecikti', fg: c.late, bg: c.lateSoft },
    { name: 'Çiçekleri sula', pill: 'Bugün', fg: c.today, bg: c.todaySoft },
    { name: 'Çarşafları değiştir', pill: '3 gün kaldı', fg: c.ok, bg: c.okSoft },
  ];
  // İlk satır "Tamamladım"a basılınca yeşerir: zil gibi kısa bir zıplama.
  const press = t.interpolate({ inputRange: [0, 0.45, 0.5, 0.55, 1], outputRange: [1, 1, 0.82, 1.08, 1] });
  const done = t.interpolate({ inputRange: [0, 0.5, 0.52, 0.95, 1], outputRange: [0, 0, 1, 1, 0] });
  return (
    <View style={{ width: SIZE, height: SIZE, justifyContent: 'center', gap: 12 }}>
      {rows.map((r, i) => {
        const bob = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: i % 2 ? [3, -3, 3] : [-3, 3, -3] });
        return (
          <Animated.View
            key={r.name}
            style={[s.row, { backgroundColor: c.surface, transform: [{ translateY: bob }] }]}
          >
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 15, color: c.ink }}>{r.name}</Text>
              <View style={[s.pill, { backgroundColor: r.bg }]}>
                {i === 0 ? (
                  <View>
                    <Animated.Text style={[s.pillText, { color: r.fg, opacity: Animated.subtract(1, done) }]}>{r.pill}</Animated.Text>
                    <Animated.Text style={[s.pillText, StyleSheet.absoluteFill, { color: c.ok, opacity: done }]}>Yapıldı</Animated.Text>
                  </View>
                ) : (
                  <Text style={[s.pillText, { color: r.fg }]}>{r.pill}</Text>
                )}
              </View>
            </View>
            <Animated.View style={[s.check, { backgroundColor: i === 0 ? c.accent : c.surface2, transform: [{ scale: i === 0 ? press : 1 }] }]}>
              <Svg width={22} height={22} viewBox="0 0 24 24">
                <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={i === 0 ? c.onAccent : c.muted} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Animated.View>
          </Animated.View>
        );
      })}
    </View>
  );
}

/* ---------- 3. Odaya özel işler ---------- */

export function RoomsArt({ t }: Props) {
  const c = useColors();
  const tiles = [
    { key: 'gardirop', bg: c.room.yatak, label: 'Gardırop', x: -70, y: -62, bob: [0, -9, 0, 9, 0], tilt: -4 },
    { key: 'buzdolabi', bg: c.room.mutfak, label: 'Buzdolabı', x: 72, y: -18, bob: [9, 0, -9, 0, 9], tilt: 4 },
    { key: 'bitki', bg: c.room.balkon, label: 'Bitkiler', x: -30, y: 80, bob: [0, 9, 0, -9, 0], tilt: -3 },
  ] as const;
  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      {tiles.map(tile => {
        const y = t.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: tile.bob });
        const rotate = t.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [`${tile.tilt}deg`, `${-tile.tilt}deg`, `${tile.tilt}deg`],
        });
        return (
          <Animated.View
            key={tile.key}
            style={[
              s.tile,
              {
                backgroundColor: tile.bg,
                transform: [{ translateX: tile.x }, { translateY: Animated.add(y, tile.y) }, { rotate }],
              },
            ]}
          >
            <RoomIcon name={tile.key} color={c.wall} />
            <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 12.5, color: c.ink, marginTop: 4 }}>{tile.label}</Text>
          </Animated.View>
        );
      })}
      <Sparkle t={t} x={92} y={-96} at={0.1} />
      <Sparkle t={t} x={-104} y={40} at={0.45} />
      <Sparkle t={t} x={86} y={92} at={0.75} />
    </View>
  );
}

/** Gardırop turu: tarama, durum takibi ve eldeki parçalardan kombin seçimi. */
export function WardrobeArt({ t }: Props) {
  const c = useColors();
  const lift = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -5, 0] });
  const pulse = t.interpolate({ inputRange: [0, 0.4, 0.5, 0.6, 1], outputRange: [1, 1, 1.08, 1, 1] });
  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ width: 222, borderRadius: 30, padding: 16, gap: 13, backgroundColor: c.fashionSurface, borderWidth: 1, borderColor: c.fashionLine, shadowColor: c.fashionInk, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.13, shadowRadius: 20, elevation: 5, transform: [{ translateY: lift }] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: c.fashionAccent, fontFamily: fonts.bodyBlack, fontSize: 10, letterSpacing: 1.3 }}>MOKA&apos;NIN SEÇİMİ</Text>
            <Text style={{ color: c.fashionInk, fontFamily: fonts.displayBold, fontSize: 18 }}>Bugünkü kombin</Text>
          </View>
          <Animated.View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fashion, transform: [{ scale: pulse }] }}>
            <Text style={{ fontSize: 18 }}>✦</Text>
          </Animated.View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { e: '🧥', bg: '#DCE7E1' }, { e: '👕', bg: '#EBDDD2' }, { e: '👖', bg: '#DCE3EE' },
          ].map((x, i) => (
            <View key={i} style={{ flex: 1, height: 76, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: x.bg }}>
              <Text style={{ fontSize: 34 }}>{x.e}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 5 }}>
            {['#6F8190', '#B78F7B', '#D4BE9A'].map(x => <View key={x} style={{ width: 17, height: 17, borderRadius: 9, backgroundColor: x, borderWidth: 2, borderColor: c.fashionSurface }} />)}
            <Text style={{ color: c.fashionInk, fontFamily: fonts.bodyBold, fontSize: 11, marginLeft: 2 }}>Uyumlu renkler</Text>
          </View>
          <Text style={{ color: c.ok, fontFamily: fonts.bodyBlack, fontSize: 11 }}>✓ Temiz</Text>
        </View>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', top: 28, right: 7, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, transform: [{ rotate: '5deg' }, { translateY: lift }] }}>
        <Text style={{ color: c.ink, fontFamily: fonts.bodyBlack, fontSize: 11 }}>📷  Fotoğraftan tara</Text>
      </Animated.View>
      <View style={{ position: 'absolute', bottom: 20, left: 7, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, transform: [{ rotate: '-4deg' }] }}>
        <Text style={{ color: c.muted, fontFamily: fonts.bodyBlack, fontSize: 11 }}>🧺  Kirli · 2 parça</Text>
      </View>
      <Image pointerEvents="none" source={MOKA_ASSETS.scarf} style={{ position: 'absolute', width: 76, height: 76, right: 4, bottom: -2 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      <Sparkle t={t} x={108} y={-82} at={0.18} />
    </View>
  );
}

/** Buzdolabı turu: yapay zekâ tahmini kullanıcı onayından sonra listeye dönüşür. */
export function FridgeArt({ t }: Props) {
  const c = useColors();
  const bob = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -5, 0] });
  const arrive = (at: number) => ({
    opacity: t.interpolate({ inputRange: [0, at, at + 0.08, 1], outputRange: [0.5, 0.5, 1, 1], extrapolate: 'clamp' }),
    transform: [{ translateX: t.interpolate({ inputRange: [0, at, at + 0.1, 1], outputRange: [18, 18, 0, 0], extrapolate: 'clamp' }) }],
  });
  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ width: 132, height: 204, borderRadius: 28, padding: 10, backgroundColor: c.surface, borderWidth: 2, borderColor: c.line, transform: [{ translateY: bob }] }}>
        <View style={{ flex: 1, borderRadius: 20, backgroundColor: c.room.mutfak, padding: 12, gap: 10 }}>
          <View style={{ alignSelf: 'flex-end', width: 5, height: 35, borderRadius: 4, backgroundColor: c.warm }} />
          <View style={{ height: 1, backgroundColor: c.line }} />
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
            <Text style={{ fontSize: 25 }}>🥛</Text><Text style={{ fontSize: 25 }}>🥕</Text>
          </View>
          <View style={{ height: 1, backgroundColor: c.line }} />
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
            <Text style={{ fontSize: 25 }}>🧀</Text><Text style={{ fontSize: 25 }}>🍋</Text>
          </View>
        </View>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: -2, top: 40, width: 132, borderRadius: 22, padding: 12, gap: 9, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line }, arrive(0.08)]}>
        <Text style={{ color: c.ink, fontFamily: fonts.bodyBlack, fontSize: 12 }}>🛒  Alışveriş listesi</Text>
        <Text style={{ color: c.muted, fontFamily: fonts.bodyBold, fontSize: 11 }}>🥛  Süt · Az</Text>
        <Text style={{ color: c.late, fontFamily: fonts.bodyBlack, fontSize: 11 }}>🧀  Peynir · Bitti</Text>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', right: -6, bottom: 24, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 18, backgroundColor: c.accent, transform: [{ rotate: '4deg' }] }, arrive(0.25)]}>
        <Text style={{ color: c.onAccent, fontFamily: fonts.bodyBlack, fontSize: 11 }}>✓  Sen onayla</Text>
      </Animated.View>
      <Image pointerEvents="none" source={MOKA_ASSETS.chef} style={{ position: 'absolute', width: 88, height: 88, left: 4, bottom: -2 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      <Sparkle t={t} x={88} y={-94} at={0.42} />
    </View>
  );
}

function RoomIcon({ name, color }: { name: 'gardirop' | 'buzdolabi' | 'bitki'; color: string }) {
  const p = { stroke: color, strokeWidth: 3, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={46} height={46} viewBox="0 0 48 48">
      {name === 'gardirop' && (
        <>
          <Path {...p} d="M24 14a4 4 0 1 1 4 4c-2 0-4 1.5-4 3.5" />
          <Path {...p} d="M24 21.5L7 33a2 2 0 0 0 1 3.6h32A2 2 0 0 0 41 33z" />
        </>
      )}
      {name === 'buzdolabi' && (
        <>
          <Rect {...p} x={12} y={6} width={24} height={36} rx={6} />
          <Path {...p} d="M12 19h24M17 12v3M17 24v6" />
        </>
      )}
      {name === 'bitki' && (
        <>
          <Path {...p} d="M15 30h18l-2.5 11h-13z" />
          <Path {...p} d="M24 30V18M24 22c-6 0-9-4-9-9 6 0 9 3 9 9zM24 19c0-6 3-10 9-10 0 6-3 10-9 10z" />
        </>
      )}
    </Svg>
  );
}

function Sparkle({ t, x, y, at }: Props & { x: number; y: number; at: number }) {
  const scale = t.interpolate({ inputRange: [0, at, at + 0.08, at + 0.16, 1], outputRange: [0, 0, 1, 0, 0] });
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', transform: [{ translateX: x }, { translateY: y }, { scale }] }}>
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path d="M12 2c1 5 5 9 10 10-5 1-9 5-10 10-1-5-5-9-10-10 5-1 9-5 10-10z" fill={brand.clay} />
      </Svg>
    </Animated.View>
  );
}

/* ---------- 4. Sabah özeti ---------- */

export function MorningArt({ t }: Props) {
  const c = useColors();
  const rotate = t.interpolate({
    inputRange: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 1],
    outputRange: ['0deg', '-14deg', '12deg', '-8deg', '5deg', '0deg', '0deg'],
  });
  const drop = (at: number) => ({
    opacity: t.interpolate({ inputRange: [0, at, at + 0.08, 0.92, 1], outputRange: [0, 0, 1, 1, 0], extrapolate: 'clamp' }),
    transform: [
      { translateY: t.interpolate({ inputRange: [0, at, at + 0.08, at + 0.12, 1], outputRange: [-24, -24, 4, 0, 0], extrapolate: 'clamp' }) },
    ],
  });
  const notes = [
    { k: c.late, title: 'Gecikti: Bulaşık', text: 'Mutfak · 1 gün gecikti', at: 0.12 },
    { k: c.warm, title: 'Bugün: Çiçekleri sula', text: 'Balkon · Fesleğen, sardunya', at: 0.22 },
    { k: c.hi, title: '3 kirli parça birikti', text: 'Yatak odası · Çamaşır zamanı', at: 0.32 },
  ];
  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <Animated.View style={[s.bell, { backgroundColor: c.accent, transform: [{ rotate }] }]}>
        <Svg width={40} height={40} viewBox="0 0 24 24">
          <Path d="M6 16v-5a6 6 0 1 1 12 0v5l2 2H4z" fill={c.onAccent} />
          <Path d="M10 20.5h4" stroke={c.onAccent} strokeWidth={2.4} strokeLinecap="round" />
          <Circle cx={18.5} cy={5.5} r={3.2} fill={c.late} />
        </Svg>
      </Animated.View>
      <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 12, letterSpacing: 1, color: c.warm, marginTop: 2 }}>GÜNAYDIN · 09:00</Text>
      {notes.map(n => (
        <Animated.View key={n.title} style={[s.note, { backgroundColor: c.surface, borderColor: c.line }, drop(n.at)]}>
          <View style={[s.dot, { backgroundColor: n.k }]} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 13.5, color: c.ink }}>{n.title}</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: c.muted }}>{n.text}</Text>
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  board: { padding: 14, borderRadius: radius.card + 4 },
  cellHole: { borderRadius: 12, overflow: 'hidden' },
  badge: {
    position: 'absolute', minWidth: 30, height: 30, borderRadius: 15, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  finger: { position: 'absolute', width: 30, height: 30, borderRadius: 15, borderWidth: 4, opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.card, paddingVertical: 14, paddingHorizontal: 16 },
  pill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontFamily: fonts.bodyBlack, fontSize: 11.5 },
  check: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  tile: { position: 'absolute', width: 112, height: 112, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  bell: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  note: { width: SIZE - 20, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: 18, borderWidth: 1.5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
