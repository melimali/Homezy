import { useEffect, useState, type ComponentRef } from 'react';
import { Animated, Dimensions, Image, Modal, StyleSheet, Text, View } from 'react-native';

import { Btn, T } from '@/components/ui';
import { MOKA_ASSETS, type MokaPose } from '@/constants/moka';
import { fonts, radius, useColors } from '@/theme';

export type TourStep = { key: string; text: string; pose: MokaPose; down?: boolean };
type Rect = { x: number; y: number; w: number; h: number };

const PAD = 6;
const DIM = 'rgba(20,26,40,0.72)';

/** Ben sekmesi gezisi: ekran kararır, sadece anlatılan parça açık kalır, Moka balonla anlatır. */
export function BenTour({ steps, targets, onScroll, onDone }: {
  steps: TourStep[];
  targets: { current: Record<string, ComponentRef<typeof View> | null> };
  /** Hedef aşağıdaysa sayfayı kaydırır. */
  onScroll: (down: boolean) => void;
  onDone: () => void;
}) {
  const c = useColors();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [fade] = useState(() => new Animated.Value(0));
  const [pos] = useState(() => ({ x: new Animated.Value(0), y: new Animated.Value(0), w: new Animated.Value(0), h: new Animated.Value(0) }));
  const [first] = useState({ v: true });
  const step = steps[i];
  const { width: W, height: H } = Dimensions.get('window');

  useEffect(() => {
    let dead = false;
    onScroll(!!step.down);
    const timer = setTimeout(() => {
      targets.current[step.key]?.measureInWindow((x: number, y: number, w: number, h: number) => {
        if (dead || !w) return;
        const r = { x: x - PAD, y: y - PAD, w: w + PAD * 2, h: h + PAD * 2 };
        setRect(r);
        if (first.v) {
          first.v = false;
          pos.x.setValue(r.x); pos.y.setValue(r.y); pos.w.setValue(r.w); pos.h.setValue(r.h);
          Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: false }).start();
        } else {
          Animated.parallel([
            Animated.timing(pos.x, { toValue: r.x, duration: 260, useNativeDriver: false }),
            Animated.timing(pos.y, { toValue: r.y, duration: 260, useNativeDriver: false }),
            Animated.timing(pos.w, { toValue: r.w, duration: 260, useNativeDriver: false }),
            Animated.timing(pos.h, { toValue: r.h, duration: 260, useNativeDriver: false }),
          ]).start();
        }
      });
    }, i === 0 ? 350 : 420);
    return () => { dead = true; clearTimeout(timer); };
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  const last = i === steps.length - 1;
  const finish = () => Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: false }).start(onDone);
  const below = rect ? rect.y + rect.h / 2 < H / 2 : true;
  const bubbleTop = rect ? (below ? rect.y + rect.h + 14 : undefined) : undefined;
  const bubbleBottom = rect && !below ? H - rect.y + 14 : undefined;

  return (
    <Modal transparent statusBarTranslucent animationType="none" visible onRequestClose={finish}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        {/* Karartma: delik etrafında dört parça */}
        <Animated.View style={[st.dim, { left: 0, right: 0, top: 0, height: pos.y }]} />
        <Animated.View style={[st.dim, { left: 0, right: 0, top: Animated.add(pos.y, pos.h), bottom: 0 }]} />
        <Animated.View style={[st.dim, { left: 0, width: pos.x, top: pos.y, height: pos.h }]} />
        <Animated.View style={[st.dim, { left: Animated.add(pos.x, pos.w), right: 0, top: pos.y, height: pos.h }]} />
        <Animated.View pointerEvents="none" style={[st.ring, { left: pos.x, top: pos.y, width: pos.w, height: pos.h, borderColor: c.hi }]} />
        {rect && (
          <View style={[st.bubbleWrap, { top: bubbleTop, bottom: bubbleBottom, maxWidth: W - 24 }]}>
            <View style={[st.bubble, { backgroundColor: c.surface }]}>
              <Image source={MOKA_ASSETS[step.pose]} style={st.moka} resizeMode="contain" accessibilityIgnoresInvertColors />
              <View style={{ flex: 1, gap: 10 }}>
                <T v="body">{step.text}</T>
                <View style={st.row}>
                  <Text style={[st.count, { color: c.muted }]}>{i + 1} / {steps.length}</Text>
                  <View style={{ flex: 1 }} />
                  {!last && <Btn label="Atla" kind="soft" onPress={finish} />}
                  <Btn label={last ? 'Bitti' : 'İleri'} onPress={() => (last ? finish() : setI(i + 1))} />
                </View>
              </View>
            </View>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const st = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: DIM },
  ring: { position: 'absolute', borderWidth: 2, borderRadius: radius.card },
  bubbleWrap: { position: 'absolute', left: 12, right: 12 },
  bubble: { borderRadius: radius.card, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center' },
  moka: { width: 64, height: 64 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  count: { fontFamily: fonts.bodyBold, fontSize: 12 },
});
