import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useReduceMotion } from '@/components/motion';
import { sfx } from '@/lib/sfx';
import { fonts } from '@/theme';

/**
 * Bahçeye girerken: iki çit kapısı iki yana açılır, Moka "hoş geldin" der, sonra perde kalkar.
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
  return (
    <View pointerEvents="auto" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[styles.door, { left: 0, width: half, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, -half] }) }] }]}
      >
        <Text style={[styles.leaf, { right: 14 }]}>🌿</Text>
      </Animated.View>
      <Animated.View
        style={[styles.door, { right: 0, width: half, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, half] }) }] }]}
      >
        <Text style={[styles.leaf, { left: 14 }]}>🌿</Text>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.center,
          {
            opacity: hello.interpolate({ inputRange: [0, 0.5, 1, 2], outputRange: [0, 1, 1, 0] }),
            transform: [{ scale: hello.interpolate({ inputRange: [0, 1, 2], outputRange: [0.6, 1, 1.25] }) }],
          },
        ]}
      >
        <Text style={{ fontSize: 64 }}>🦜</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{greeting}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  door: { position: 'absolute', top: 0, bottom: 0, backgroundColor: '#5E8A63', borderColor: '#46704B', borderWidth: 3, justifyContent: 'center' },
  leaf: { position: 'absolute', fontSize: 44, top: '45%' },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 6 },
  title: { fontFamily: fonts.displayBold, fontSize: 28, color: '#FFF8EC', textAlign: 'center' },
  sub: { fontFamily: fonts.bodyBlack, fontSize: 15, color: '#FFF8EC', textAlign: 'center' },
});
