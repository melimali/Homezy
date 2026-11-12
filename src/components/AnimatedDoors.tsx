import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { useReduceMotion } from '@/components/motion';
import { T } from '@/components/ui';
import { useColors } from '@/theme';

/**
 * Açılan kapaklı dolap sahnesi: buzdolabı (tek kapak) ve gardırop (iki kapak).
 * Kapak(lar) ekran açılınca perspektifle döner, içindekiler raf raf belirir. Dokununca kapanıp tekrar açılır.
 * Sadece React Native `Animated` (ek paket yok); "hareketi azalt" açıksa kapaklar baştan açık, animasyon yok.
 */
export type CabinetItem = { key: string; emoji: string };

const OPEN_DEG = 78;

function Item({ emoji, show, delay, reduce }: { emoji: string; show: boolean; delay: number; reduce: boolean }) {
  const [v] = useState(() => new Animated.Value(reduce ? 1 : 0));
  useEffect(() => {
    if (reduce) return void v.setValue(show ? 1 : 0);
    if (!show) return void v.setValue(0);
    const a = Animated.spring(v, { toValue: 1, delay, friction: 6, tension: 90, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [show, delay, reduce, v]);
  return (
    <Animated.View style={{ opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
      <Text style={st.emoji}>{emoji}</Text>
    </Animated.View>
  );
}

function Door({ w, h, side, open, children, style }: { w: number; h: number; side: 'left' | 'right'; open: Animated.Value; children?: React.ReactNode; style: object }) {
  // Menteşe kenarda: merkezden kenara kaydır, döndür, geri kaydır.
  const p = side === 'left' ? -w / 2 : w / 2;
  const deg = open.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${side === 'left' ? -OPEN_DEG : OPEN_DEG}deg`] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[st.door, style, { width: w, height: h, [side]: 0, transform: [{ perspective: 900 }, { translateX: p }, { rotateY: deg }, { translateX: -p }] }]}
    >
      {children}
    </Animated.View>
  );
}

export function Cabinet({ kind, items, hint }: { kind: 'fridge' | 'wardrobe'; items: CabinetItem[]; hint: string }) {
  const c = useColors();
  const reduce = useReduceMotion();
  const [w, setW] = useState(0);
  const [open, setOpen] = useState(true);
  const [door] = useState(() => new Animated.Value(reduce ? 1 : 0));
  const [shown, setShown] = useState(false);
  const fridge = kind === 'fridge';
  const h = fridge ? 330 : 220;

  useEffect(() => {
    if (!w) return;
    if (reduce) {
      door.setValue(open ? 1 : 0);
      return;
    }
    const a = Animated.timing(door, { toValue: open ? 1 : 0, duration: open ? 900 : 550, delay: open ? 250 : 0, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    a.start(({ finished }) => finished && open && setShown(true));
    return () => a.stop();
  }, [open, w, reduce, door]);

  // Raflara dağıt: buzdolabı 3 raf x 4, gardırop askı 5 + raf 4.
  const rows: CabinetItem[][] = fridge
    ? [items.slice(0, 4), items.slice(4, 8), items.slice(8, 12)]
    : [items.slice(0, 5), items.slice(5, 9)];
  let n = 0;
  const doorFill = fridge ? c.sageSoft : c.peachSoft;
  const frame = fridge ? c.sage : c.clay;

  return (
    <View onLayout={e => setW(Math.round(e.nativeEvent.layout.width))} style={fridge ? { width: '100%', maxWidth: 240, alignSelf: 'center' } : undefined}>
      <Pressable
        onPress={() => { if (open) setShown(false); setOpen(!open); }}
        accessibilityRole="button"
        accessibilityLabel={fridge ? (open ? 'Buzdolabı kapağını kapat' : 'Buzdolabı kapağını aç') : (open ? 'Gardırop kapaklarını kapat' : 'Gardırop kapaklarını aç')}
        style={[st.cab, { height: h, borderColor: frame, backgroundColor: fridge ? c.cream : c.surface2 }]}
      >
        {/* İç */}
        <View style={st.inside}>
          {!fridge && <View style={[st.rail, { backgroundColor: c.muted }]} />}
          {rows.map((row, ri) => (
            <View key={ri} style={[st.shelf, { borderBottomColor: frame }, !fridge && ri === 0 && st.hang]}>
              {row.map(it => <Item key={it.key} emoji={it.emoji} show={reduce ? open : shown} delay={90 * n++} reduce={reduce} />)}
            </View>
          ))}
          {!items.length && <T v="small" style={st.hint}>{hint}</T>}
        </View>
        {/* Kapaklar */}
        {w > 0 && (fridge ? (
          <Door w={w - 6} h={h - 6} side="left" open={door} style={{ backgroundColor: doorFill, borderColor: frame }}>
            <View style={[st.seam, { backgroundColor: frame, top: '38%' }]} />
            <View style={[st.handle, { backgroundColor: c.muted, right: 12, top: '12%', height: 44 }]} />
            <View style={[st.handle, { backgroundColor: c.muted, right: 12, top: '48%', height: 60 }]} />
          </Door>
        ) : (
          <>
            <Door w={(w - 6) / 2} h={h - 6} side="left" open={door} style={{ backgroundColor: doorFill, borderColor: frame }}>
              <View style={[st.knob, { backgroundColor: c.warm, right: 10 }]} />
            </Door>
            <Door w={(w - 6) / 2} h={h - 6} side="right" open={door} style={{ backgroundColor: doorFill, borderColor: frame }}>
              <View style={[st.knob, { backgroundColor: c.warm, left: 10 }]} />
            </Door>
          </>
        ))}
      </Pressable>
      <T v="tiny" style={st.tap}>{open ? 'Kapatmak için dokun' : 'Açmak için dokun'}</T>
    </View>
  );
}

const st = StyleSheet.create({
  cab: { borderWidth: 3, borderRadius: 22, overflow: 'visible', padding: 2 },
  inside: { flex: 1, borderRadius: 18, overflow: 'hidden', paddingHorizontal: 10, justifyContent: 'space-evenly' },
  rail: { position: 'absolute', top: 18, left: 8, right: 8, height: 4, borderRadius: 2 },
  shelf: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderBottomWidth: 4, borderRadius: 2, paddingBottom: 2, minHeight: 52 },
  hang: { borderBottomWidth: 0, paddingTop: 14 },
  emoji: { lineHeight: 44, fontSize: 34 },
  hint: { textAlign: 'center' },
  door: { position: 'absolute', top: 0, borderWidth: 3, borderRadius: 18, backfaceVisibility: 'hidden' },
  seam: { position: 'absolute', left: 0, right: 0, height: 3 },
  handle: { position: 'absolute', width: 8, borderRadius: 4 },
  knob: { position: 'absolute', top: '50%', width: 12, height: 12, borderRadius: 6 },
  tap: { textAlign: 'center', marginTop: 6 },
});
