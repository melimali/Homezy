import { useEffect, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

import { MOKA_ASSETS, type MokaPose } from '@/constants/moka';
import { useColors } from '@/theme';

import { Float, useReduceMotion } from './motion';
import { T } from './ui';

/** Yükleniyor: süzülen Moka, sırayla zıplayan üç nokta ve kısa bir cümle. Hareketi azalt açıksa noktalar durur. */
export function MokaLoading({ text, pose = 'analyzing', size = 96 }: { text?: string; pose?: MokaPose; size?: number }) {
  const c = useColors();
  const reduce = useReduceMotion();
  const [dots] = useState(() => [0, 1, 2].map(() => new Animated.Value(0)));
  useEffect(() => {
    if (reduce) return;
    const loops = dots.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 140),
          Animated.timing(v, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 280, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.delay((2 - i) * 140 + 200),
        ]),
      ),
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [reduce, dots]);
  return (
    <View style={st.box} accessibilityRole="progressbar" accessibilityLiveRegion="polite" accessibilityLabel={text ?? 'Yükleniyor'}>
      <Float amp={4} dur={2000}>
        <Image source={MOKA_ASSETS[pose]} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors />
      </Float>
      <View style={st.dots}>
        {dots.map((v, i) => (
          <Animated.View key={i} style={[st.dot, { backgroundColor: c.hi, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) }] }]} />
        ))}
      </View>
      {!!text && <T v="small" style={{ textAlign: 'center' }}>{text}</T>}
    </View>
  );
}

const st = StyleSheet.create({
  box: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  dots: { flexDirection: 'row', gap: 7, height: 16, alignItems: 'flex-end' },
  dot: { width: 9, height: 9, borderRadius: 5 },
});
