import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';

import { useReduceMotion } from '@/components/motion';

function Cloud({ size }: { size: number }) {
  return (
    <Svg width={size} height={size * 0.55} viewBox="0 0 200 110">
      <Ellipse cx="60" cy="70" rx="50" ry="32" fill="#FFFFFF" />
      <Ellipse cx="110" cy="50" rx="52" ry="40" fill="#FFFFFF" />
      <Ellipse cx="150" cy="72" rx="44" ry="30" fill="#FFFFFF" />
      <Ellipse cx="100" cy="78" rx="80" ry="28" fill="#FFFFFF" />
    </Svg>
  );
}

/** Bahçeye girerken: sade bulutlar iki yana açılır, arkadan bahçe görünür (~1.5 sn). Hareketi azalt açıksa gösterilmez. */
export function GardenGate(_props: { greeting?: string; title?: string }) {
  const reduce = useReduceMotion();
  const { width } = useWindowDimensions();
  const [v] = useState(() => new Animated.Value(0));
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (reduce) return;
    const a = Animated.sequence([
      Animated.delay(300),
      Animated.timing(v, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
    ]);
    a.start(() => setDone(true));
    return () => a.stop();
  }, [reduce, v]);

  if (reduce || done) return null;
  const move = (dir: number) => ({ transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, dir * (width / 2 + 220)] }) }] });
  const fade = { opacity: v.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }) };
  return (
    <Animated.View pointerEvents="auto" style={[StyleSheet.absoluteFill, styles.sky, fade]}>
      <Animated.View style={[styles.c, { left: -30, top: '10%' }, move(-1)]}><Cloud size={240} /></Animated.View>
      <Animated.View style={[styles.c, { left: '30%', top: '30%' }, move(1)]}><Cloud size={280} /></Animated.View>
      <Animated.View style={[styles.c, { right: -30, top: '52%' }, move(1)]}><Cloud size={240} /></Animated.View>
      <Animated.View style={[styles.c, { left: -20, top: '70%' }, move(-1)]}><Cloud size={260} /></Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sky: { backgroundColor: '#CFE5F2' },
  c: { position: 'absolute' },
});
