import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { HOME_MOKA_ASSETS, type HomeMokaPose } from '@/constants/home-moka';
import { useReduceMotion } from './motion';

/** Sabit sahne üzerinde yalnızca Moka hafifçe hareket eder. */
export function HomeMokaAnimation({ pose }: { pose: HomeMokaPose }) {
  const reduce = useReduceMotion();
  const [motion] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduce) {
      motion.setValue(0);
      return;
    }

    const idle = Animated.loop(Animated.sequence([
      Animated.timing(motion, { toValue: 1, duration: 2100, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(motion, { toValue: 0, duration: 2100, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    idle.start();
    return () => idle.stop();
  }, [motion, reduce]);

  const lift = motion.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });
  const sway = motion.interpolate({ inputRange: [0, 1], outputRange: ['-0.25deg', '0.25deg'] });

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip]}>
      <Animated.Image
        key={pose}
        source={HOME_MOKA_ASSETS[pose]}
        style={[styles.moka, { transform: [{ translateY: lift }, { rotate: sway }] }]}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  moka: { position: 'absolute', left: '22%', bottom: '7%', width: '56%', height: '62%' },
});
