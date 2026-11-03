import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useReduceMotion } from '@/components/motion';
import { sfx } from '@/lib/sfx';
import { fonts } from '@/theme';

/**
 * Bahçeye girerken: bulutlar aralanır, çiçekler belirir, Moka "hoş geldin" der, sonra perde kalkar.
 * Hareketi azalt açıksa hiç gösterilmez. Ekrana her girişte bir kere oynar.
 */
export function GardenGate({ greeting, title }: { greeting: string; title: string }) {
  const reduce = useReduceMotion();
  const { width } = useWindowDimensions();
  const [v] = useState(() => new Animated.Value(0)); // 0 kapalı → 1 açık
  const [hello] = useState(() => new Animated.Value(0));
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (reduce) return;
    const a = Animated.sequence([
      Animated.spring(hello, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.delay(450),
      Animated.parallel([
        Animated.timing(hello, { toValue: 2, duration: 500, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      ]),
    ]);
    const t = setTimeout(() => sfx('pop'), 150);
    a.start(() => setDone(true));
    return () => {
      clearTimeout(t);
      a.stop();
    };
  }, [reduce, v, hello]);

  if (reduce || done) return null;
  const half = width / 2;
  const fade = { opacity: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }) };
  return (
    <Animated.View pointerEvents="auto" style={[StyleSheet.absoluteFill, styles.sky, fade]}>
      <Animated.View style={[styles.cloudL, { transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, -half - 80] }) }] }]}>
        <Text style={styles.cloud}>☁️</Text>
      </Animated.View>
      <Animated.View style={[styles.cloudR, { transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, half + 80] }) }] }]}>
        <Text style={styles.cloud}>☁️</Text>
      </Animated.View>
      <Animated.View style={[styles.cloudM, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -300] }) }] }]}>
        <Text style={styles.cloud}>☁️</Text>
      </Animated.View>
      {['🌸', '🌷', '🌼', '🌻', '🌺'].map((e, i) => (
        <Animated.Text
          key={i}
          style={[
            styles.flower,
            {
              left: `${8 + i * 19}%`,
              opacity: hello.interpolate({ inputRange: [0, 0.4, 1, 2], outputRange: [0, 1, 1, 0] }),
              transform: [{ translateY: hello.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }, { scale: hello.interpolate({ inputRange: [0, 1, 2], outputRange: [0.3, 1, 1.3] }) }],
            },
          ]}
        >
          {e}
        </Animated.Text>
      ))}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.center,
          {
            opacity: hello.interpolate({ inputRange: [0, 0.5, 1, 2], outputRange: [0, 1, 1, 0] }),
            transform: [{ scale: hello.interpolate({ inputRange: [0, 1, 2], outputRange: [0.6, 1, 1.15] }) }],
          },
        ]}
      >
        <Text style={{ fontSize: 64 }}>🦜</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{greeting}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sky: { backgroundColor: '#BFDDEF' },
  cloud: { fontSize: 150 },
  cloudL: { position: 'absolute', left: -20, top: '12%' },
  cloudR: { position: 'absolute', right: -20, top: '38%' },
  cloudM: { position: 'absolute', left: '28%', top: '60%' },
  flower: { position: 'absolute', bottom: '14%', fontSize: 44 },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 6 },
  title: { fontFamily: fonts.displayBold, fontSize: 28, color: '#283044', textAlign: 'center' },
  sub: { fontFamily: fonts.bodyBlack, fontSize: 15, color: '#283044', textAlign: 'center' },
});
