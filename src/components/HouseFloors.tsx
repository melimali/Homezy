import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { hasUpper, type Floor } from '@/domain/plan-templates';
import { haptic } from '@/lib/sfx';
import { fonts, useColors } from '@/theme';

import { House3D } from './House3D';
import { Squish } from './motion';

type Props = Omit<ComponentProps<typeof House3D>, 'floor'> & {
  /** Başlangıç katı. */
  initial?: Floor;
  /** Kat değişince (ör. dekor ekranı seçili katı bilsin). */
  onFloorChange?: (f: Floor) => void;
  /** Dışarıdan kontrol edilen kat. */
  floor?: Floor;
};

/**
 * Dubleks ev: 3B evi tek kat gösterir; sağdaki ▲ / ▼ ile katlar arasında geçilir. Geçişte eski kat
 * kayarak kaybolur, yenisi öbür yönden gelir (yukarı çıkınca kamera da yükseliyormuş gibi).
 * Ev tek katlıysa düz `House3D` gibi davranır.
 */
export function HouseFloors({ initial = 0, onFloorChange, floor: controlled, ...rest }: Props) {
  const c = useColors();
  const upper = hasUpper(rest.state);
  const [own, setOwn] = useState<Floor>(initial);
  const floor: Floor = upper ? controlled ?? own : 0;
  const [shown, setShown] = useState<Floor>(floor);
  const [y] = useState(() => new Animated.Value(0));
  const [op] = useState(() => new Animated.Value(1));
  const [reduce, setReduce] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
  }, []);

  // Kat değişince: eski kat kayıp solar, yeni kat öbür taraftan yerine oturur.
  useEffect(() => {
    if (floor === shown || reduce) return;
    busy.current = true;
    const dir = floor > shown ? 1 : -1;
    Animated.parallel([
      Animated.timing(y, { toValue: dir * 46, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(op, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setShown(floor);
      y.setValue(-dir * 46);
      Animated.parallel([
        Animated.spring(y, { toValue: 0, friction: 7, tension: 70, useNativeDriver: true }),
        Animated.timing(op, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start(() => (busy.current = false));
    });
  }, [floor, shown, reduce, y, op]);

  const go = (f: Floor) => {
    if (f === floor || busy.current) return;
    haptic('light');
    setOwn(f);
    onFloorChange?.(f);
  };

  return (
    <View>
      <Animated.View style={{ opacity: op, transform: [{ translateY: y }] }}>
        <House3D {...rest} floor={reduce ? floor : shown} />
      </Animated.View>
      {upper && (
        <View style={[st.rail, { backgroundColor: c.surface, shadowColor: c.shadow }]} pointerEvents="box-none">
          <Squish
            onPress={() => go(1)}
            disabled={floor === 1}
            accessibilityRole="button"
            accessibilityLabel="Üst kata çık"
            hitSlop={6}
            style={[st.btn, { backgroundColor: floor === 1 ? c.surface2 : c.ink, opacity: floor === 1 ? 0.45 : 1 }]}
          >
            <Text style={[st.arrow, { color: floor === 1 ? c.ink : c.bg }]}>▲</Text>
          </Squish>
          <Text style={[st.label, { color: c.ink }]}>{floor + 1}. kat</Text>
          <Squish
            onPress={() => go(0)}
            disabled={floor === 0}
            accessibilityRole="button"
            accessibilityLabel="Alt kata in"
            hitSlop={6}
            style={[st.btn, { backgroundColor: floor === 0 ? c.surface2 : c.ink, opacity: floor === 0 ? 0.45 : 1 }]}
          >
            <Text style={[st.arrow, { color: floor === 0 ? c.ink : c.bg }]}>▼</Text>
          </Squish>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  rail: {
    position: 'absolute', right: 6, top: 8, alignItems: 'center', gap: 4, borderRadius: 24, padding: 5,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 3,
  },
  btn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  arrow: { fontFamily: fonts.bodyBlack, fontSize: 14, lineHeight: 18 },
  label: { fontFamily: fonts.bodyBlack, fontSize: 11 },
});
