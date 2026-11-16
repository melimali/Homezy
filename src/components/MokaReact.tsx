import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { MokaSprite, type SpriteAnim } from '@/components/MokaSprite';
import { useReduceMotion } from '@/components/motion';

const BITS = ['💖', '✨', '⭐'];
const CYCLE: SpriteAnim[] = ['party', 'yawn', 'happy'];

/**
 * Dokununca tepki veren Moka: duygu değişir, 3 küçük emoji yükselir, sonra eski haline döner.
 * Tek seferlik, native sürücülü animasyon; "hareketi azalt" açıksa sadece duygu değişir.
 */
export function MokaReact({ anim = 'happy', size = 64, style, label = 'Moka', onTap }: { anim?: SpriteAnim; size?: number; style?: StyleProp<ViewStyle>; label?: string; onTap?: () => void }) {
  const reduce = useReduceMotion();
  const [over, setOver] = useState<SpriteAnim | null>(null);
  const [vals] = useState(() => BITS.map(() => new Animated.Value(0)));
  const n = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const tap = useCallback(() => {
    onTap?.();
    setOver(CYCLE[n.current++ % CYCLE.length]);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOver(null), 1800);
    if (reduce) return;
    vals.forEach((v, i) => {
      v.setValue(0);
      Animated.timing(v, { toValue: 1, duration: 1100, delay: i * 110, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }).start();
    });
  }, [onTap, reduce, vals]);

  return (
    <Pressable onPress={tap} accessibilityRole="button" accessibilityLabel={label} style={[{ width: size, height: size }, style]}>
      <MokaSprite anim={over ?? anim} size={size} />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {vals.map((v, i) => (
          <Animated.Text
            key={i}
            style={{
              position: 'absolute', left: size * (0.2 + i * 0.25), top: size * 0.1, fontSize: Math.max(12, size * 0.2),
              opacity: v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
              transform: [
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.6] }) },
                { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.2] }) },
              ],
            }}
          >
            {BITS[i]}
          </Animated.Text>
        ))}
      </View>
    </Pressable>
  );
}
