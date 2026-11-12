import { forwardRef, useEffect, useImperativeHandle, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { useReduceMotion } from '@/components/motion';
import { brand, fonts, useColors } from '@/theme';

/**
 * Not kağıdı: bantlı, çizgili, el yazısı yazı tipli. Dokununca hafifçe sağa sola sallanır.
 * Sadece `Animated` (ek paket yok). "Hareketi azalt" açıksa sallanma ve çizgi animasyonu yok.
 */
export type NoteHandle = { sway: () => void };
export const LINE = 38;

export const PaperNote = forwardRef<NoteHandle, { children: ReactNode }>(function PaperNote({ children }, ref) {
  const c = useColors();
  const reduce = useReduceMotion();
  const [rot] = useState(() => new Animated.Value(0));
  const sway = () => {
    if (reduce) return;
    rot.stopAnimation();
    const step = (to: number, ms: number) => Animated.timing(rot, { toValue: to, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true });
    Animated.sequence([step(1, 110), step(-0.8, 150), step(0.5, 140), step(-0.25, 130), step(0, 120)]).start();
  };
  useImperativeHandle(ref, () => ({ sway }));
  // Girişte bir kez hafifçe oturur.
  useEffect(() => {
    const t = setTimeout(sway, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[st.wrap, { transform: [{ rotate: '-1deg' }, { rotate: rot.interpolate({ inputRange: [-1, 1], outputRange: ['-4.5deg', '4.5deg'] }) }] }]}>
      <Pressable onPress={sway} accessibilityLabel="Alışveriş notu" style={[st.paper, { backgroundColor: c.cream, shadowColor: c.shadow }]}>
        {children}
      </Pressable>
      <View pointerEvents="none" style={[st.tape, { backgroundColor: c.peach }]} />
    </Animated.View>
  );
});

/** Tek satır: çizgili kâğıtta el yazısı ürün; işaretlenince üstü elle çizilmiş gibi çizilir. */
export function NoteLine({ done, label, onToggle, right, big }: { done: boolean; label: string; onToggle?: () => void; right?: ReactNode; big?: boolean }) {
  const reduce = useReduceMotion();
  const [v] = useState(() => new Animated.Value(done ? 1 : 0));
  const [tw, setTw] = useState(0);
  useEffect(() => {
    if (reduce) return void v.setValue(done ? 1 : 0);
    const a = Animated.timing(v, { toValue: done ? 1 : 0, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [done, reduce, v]);
  const ink = brand.navy;
  return (
    <View style={[st.line, { borderBottomColor: 'rgba(120,161,187,0.45)' }]}>
      <Pressable onPress={onToggle} accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={label} style={st.main} disabled={!onToggle}>
        <Text style={[st.box, { color: ink }]}>{done ? '☑' : '☐'}</Text>
        <View style={st.textWrap}>
          <Text onLayout={e => setTw(e.nativeEvent.layout.width)} style={[st.txt, big && st.big, { color: ink, opacity: done ? 0.5 : 1 }]} numberOfLines={1}>{label}</Text>
          {tw > 0 && <Animated.View pointerEvents="none" style={[st.strike, { width: v.interpolate({ inputRange: [0, 1], outputRange: [0, tw + 6] }), backgroundColor: ink }]} />}
        </View>
      </Pressable>
      {right}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { paddingTop: 10 },
  paper: { borderRadius: 8, paddingHorizontal: 16, paddingTop: 26, paddingBottom: 14, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4 },
  tape: { position: 'absolute', top: 0, alignSelf: 'center', width: 96, height: 26, borderRadius: 3, opacity: 0.85, transform: [{ rotate: '-3deg' }] },
  line: { flexDirection: 'row', alignItems: 'center', minHeight: LINE, borderBottomWidth: 1.5 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: LINE },
  box: { fontSize: 24, lineHeight: 28 },
  textWrap: { flexShrink: 1, justifyContent: 'center' },
  txt: { fontFamily: fonts.hand, fontSize: 26, lineHeight: 32 },
  big: { lineHeight: 39, fontSize: 30 },
  strike: { position: 'absolute', left: -2, top: '55%', height: 3, borderRadius: 2, transform: [{ rotate: '-2deg' }] },
});
