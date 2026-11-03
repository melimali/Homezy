import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, Dimensions, Easing, Image, Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';

import { Btn, T } from '@/components/ui';
import { MOKA_ASSETS, type MokaPose } from '@/constants/moka';
import { radius, useColors } from '@/theme';

export type TourStep = { key: string; text: string; pose: MokaPose };
type Rect2 = { x: number; y: number; w: number; h: number };
type Tgt = ComponentRef<typeof View>;

const AnimRect = Animated.createAnimatedComponent(Rect);
const PAD = 8;
const RX = 22;
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
  const step = steps[i];
  const safeTop = insets.top + 16;
  const safeBottom = H - insets.bottom - 16;

  useEffect(() => {
    let dead = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) => new Promise<void>(res => { timers.push(setTimeout(res, ms)); });
    const measure = () => new Promise<Rect2 | null>(res => {
      const t = targets.current[step.key];
      if (!t) return res(null);
      t.measureInWindow((x: number, y: number, w: number, h: number) => res(w ? { x: x - PAD, y: y - PAD, w: w + PAD * 2, h: h + PAD * 2 } : null));
    });
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
        await wait(520);
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
          <Defs>
            <Mask id="hole">
              <Rect x={0} y={0} width={W} height={H} fill="white" />
              <AnimRect x={pos.x} y={pos.y} width={pos.w} height={pos.h} rx={RX} ry={RX} fill="black" />
            </Mask>
          </Defs>
          <Rect x={0} y={0} width={W} height={H} fill="rgba(20,26,40,0.74)" mask="url(#hole)" />
          <AnimRect x={pos.x} y={pos.y} width={pos.w} height={pos.h} rx={RX} ry={RX} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={2} />
        </Svg>
        {rect && (
          <Animated.View
            onLayout={e => setBh(e.nativeEvent.layout.height)}
            style={[st.card, { top, backgroundColor: c.surface, opacity: bub, transform: [{ translateY: slide }] }]}
          >
            <View style={st.head}>
              <Image source={MOKA_ASSETS[step.pose]} style={st.moka} resizeMode="contain" accessibilityIgnoresInvertColors />
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
  moka: { width: 68, height: 68 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { height: 7, borderRadius: 4 },
});
