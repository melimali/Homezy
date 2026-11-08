import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, StyleSheet, View } from 'react-native';

import { useReduceMotion } from '@/components/motion';
import { useColors } from '@/theme';

/**
 * Sıradaki pencere: arka plan yumuşakça kararır, kart aşağıdan süzülerek gelir.
 * Kapatırken `dismiss()` aynı hareketi tersine oynatır, bitince `onClose` çağrılır.
 */
export function StepModal({
  children,
  onClose,
  onBack,
}: {
  children: (dismiss: () => void) => ReactNode;
  onClose: () => void;
  onBack?: () => void;
}) {
  const c = useColors();
  const reduce = useReduceMotion();
  const [v] = useState(() => new Animated.Value(0));
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const a = Animated.timing(v, { toValue: 1, duration: reduce ? 1 : 320, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [v, reduce]);
  const dismiss = () => {
    if (leaving) return;
    setLeaving(true);
    Animated.timing(v, { toValue: 0, duration: reduce ? 1 : 240, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => onClose());
  };
  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={onBack ?? dismiss}>
      <Animated.View style={[styles.bg, { backgroundColor: c.shadow, opacity: v }]}>
        <Animated.View
          style={[
            styles.wrap,
            {
              opacity: v,
              transform: [
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) },
                { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
              ],
            },
          ]}
        >
          <View style={styles.inner}>{children(dismiss)}</View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  inner: { alignSelf: 'stretch', alignItems: 'center' },
});
