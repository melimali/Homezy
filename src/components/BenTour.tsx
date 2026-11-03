import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, Dimensions, Easing, Image, Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Btn, T } from '@/components/ui';
import { MOKA_ASSETS, type MokaPose } from '@/constants/moka';
import { radius, useColors } from '@/theme';

export type TourStep = { key: string; text: string; pose: MokaPose };
type Rect2 = { x: number; y: number; w: number; h: number };
type Tgt = ComponentRef<typeof View>;

const PAD = 8;
const RX = 22;
/** Yuvarlak köşeli dikdörtgen yolu. */
function rr(x: number, y: number, w: number, h: number, r0: number) {
  const r = Math.max(0, Math.min(r0, w / 2, h / 2));
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}
const hole = (W: number, H: number, o: Rect2) => `M0 0H${W}V${H}H0Z${o.w > 0 ? rr(o.x, o.y, o.w, o.h, RX) : ''}`;
const EASE = Easing.out(Easing.cubic);

/** Ben sekmesi gezisi: yuvarlak köşeli ışık deliği (SVG maske), Moka balonu, adım noktaları. */
export function BenTour({ steps, targets, getY, scrollTo, onDone }: {
  steps: TourStep[];
  targets: { current: Record<string, Tgt | null> };
  getY: () => number;
  scrollTo: (y: number) => void;
  onDone: () => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = Dimensions.get('window');
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect2 | null>(null);
  const [bh, setBh] = useState(150);
  const [fade] = useState(() => new Animated.Value(0));
  const [bub] = useState(() => new Animated.Value(0));
  const [pos] = useState(() => ({ x: new Animated.Value(0), y: new Animated.Value(0), w: new Animated.Value(0), h: new Animated.Value(0) }));
  const first = useRef(true);
  const [live, setLive] = useState<Rect2>({ x: W / 2, y: H / 2, w: 0, h: 0 });
  const step = steps[i];
  const safeTop = insets.top + 16;
  const safeBottom = H - insets.bottom - 16;

  useEffect(() => {
    const upd = () => {
      const g = (v: Animated.Value) => (v as unknown as { __getValue(): number }).__getValue();
      setLive({ x: g(pos.x), y: g(pos.y), w: g(pos.w), h: g(pos.h) });
    };
    const ids = [pos.x, pos.y, pos.w, pos.h].map(v => v.addListener(upd));
    return () => { [pos.x, pos.y, pos.w, pos.h].forEach((v, k) => v.removeListener(ids[k])); };
  }, [pos]);

  useEffect(() => {
    let dead = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) => new Promise<void>(res => { timers.push(setTimeout(res, ms)); });
    const once = () => new Promise<Rect2 | null>(res => {
      const t = targets.current[step.key];
      if (!t) return res(null);
      t.measureInWindow((x: number, y: number, w: number, h: number) => res(w ? { x: x - PAD, y: y - PAD, w: w + PAD * 2, h: h + PAD * 2 } : null));
    });
    // Kayma/animasyon bitene kadar (iki ölçüm aynı çıkana dek) bekle.
    const measure = async () => {
      let prev: Rect2 | null = null;
      for (let k = 0; k < 14 && !dead; k++) {
        const r = await once();
        if (r && prev && Math.abs(r.x - prev.x) < 1 && Math.abs(r.y - prev.y) < 1 && Math.abs(r.h - prev.h) < 1) return r;
        prev = r;
        await wait(90);
      }
      return prev;
    };
    (async () => {
      Animated.timing(bub, { toValue: 0, duration: 120, useNativeDriver: false }).start();
      await wait(first.current ? 450 : 80);
      let r = await measure();
      if (dead || !r) return;
      // Hedefi görünür bandın üst kısmına getir (balon için alt yarı boş kalsın).
      const want = safeTop + 24;
      const fits = r.y >= safeTop && r.y + r.h <= H * 0.62;
      if (!fits) {
        scrollTo(getY() + (r.y - want));
        await wait(250);
        if (dead) return;
        r = await measure();
        if (dead || !r) return;
      }
      setRect(r);
      if (first.current) {
        first.current = false;
        pos.x.setValue(r.x); pos.y.setValue(r.y); pos.w.setValue(r.w); pos.h.setValue(r.h);
        Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: false }).start();
      } else {
        Animated.parallel([
          Animated.timing(pos.x, { toValue: r.x, duration: 320, easing: EASE, useNativeDriver: false }),
          Animated.timing(pos.y, { toValue: r.y, duration: 320, easing: EASE, useNativeDriver: false }),
          Animated.timing(pos.w, { toValue: r.w, duration: 320, easing: EASE, useNativeDriver: false }),
          Animated.timing(pos.h, { toValue: r.h, duration: 320, easing: EASE, useNativeDriver: false }),
        ]).start();
      }
      Animated.timing(bub, { toValue: 1, duration: 260, delay: 120, easing: EASE, useNativeDriver: false }).start();
    })();
    return () => { dead = true; timers.forEach(clearTimeout); };
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  const last = i === steps.length - 1;
  const finish = () => Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: false }).start(onDone);

  // Balon: hedefin altına, sığmazsa üstüne; ekran dışına asla taşmaz.
  let top = safeTop;
  if (rect) {
    const below = rect.y + rect.h + 14 + bh <= safeBottom;
    top = below ? rect.y + rect.h + 14 : rect.y - 14 - bh;
    top = Math.min(Math.max(top, safeTop), safeBottom - bh);
  }
  const slide = bub.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  return (
    <Modal transparent statusBarTranslucent animationType="none" visible onRequestClose={finish}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
          <Path d={hole(W, H, live)} fillRule="evenodd" fill="rgba(20,26,40,0.74)" />
          <Path d={rr(live.x, live.y, live.w, live.h, RX)} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={2} />
        </Svg>
        {rect && (
          <Animated.View
            onLayout={e => setBh(e.nativeEvent.layout.height)}
            style={[st.card, { top, backgroundColor: c.surface, opacity: bub, transform: [{ translateY: slide }] }]}
          >
            <View style={st.head}>
              <View style={st.mokaBox}><Image source={MOKA_ASSETS[step.pose]} style={StyleSheet.absoluteFill} resizeMode="contain" accessibilityIgnoresInvertColors /></View>
              <View style={{ flex: 1 }}><T v="body">{step.text}</T></View>
            </View>
            <View style={st.foot}>
              <View style={st.dots}>
                {steps.map((_, k) => (
                  <View key={k} style={[st.dot, { backgroundColor: k === i ? c.hi : c.line, width: k === i ? 18 : 7 }]} />
                ))}
              </View>
              <View style={{ flex: 1 }} />
              {!last && <Btn label="Atla" kind="soft" small onPress={finish} />}
              <Btn label={last ? 'Bitti' : 'İleri'} kind="primary" small onPress={() => (last ? finish() : setI(i + 1))} />
            </View>
          </Animated.View>
        )}
      </Animated.View>
    </Modal>
  );
}

const st = StyleSheet.create({
  card: { position: 'absolute', left: 14, right: 14, borderRadius: radius.card, padding: 16, gap: 14, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mokaBox: { width: 68, height: 68, flexShrink: 0, flexGrow: 0 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { height: 7, borderRadius: 4 },
});
