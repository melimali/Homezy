import { useEffect, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { HOME_MOKA_SEATED } from '@/constants/curated-scenes';

import { useReduceMotion } from './motion';

/** Ana sahnede Moka sakin nefes alır; fincanından iki ince buhar kıvrımı yükselir. */
export function HomeMokaAnimation() {
  const reduce = useReduceMotion();
  const [breath] = useState(() => new Animated.Value(0));
  const [steam] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduce) {
      breath.setValue(0);
      steam.setValue(0);
      return;
    }

    const breathe = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration: 2300, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(breath, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    const warmCup = Animated.loop(Animated.sequence([
      Animated.delay(350),
      Animated.timing(steam, { toValue: 1, duration: 1700, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }),
      Animated.timing(steam, { toValue: 0, duration: 500, easing: Easing.in(Easing.quad), useNativeDriver: true, isInteraction: false }),
    ]));
    breathe.start();
    warmCup.start();
    return () => {
      breathe.stop();
      warmCup.stop();
    };
  }, [breath, steam, reduce]);

  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [0.99, 1.025] });
  const lift = breath.interpolate({ inputRange: [0, 1], outputRange: [1, -2] });
  const steamOpacity = steam.interpolate({ inputRange: [0, 0.18, 0.7, 1], outputRange: [0, 0.75, 0.42, 0] });
  const steamLift = steam.interpolate({ inputRange: [0, 1], outputRange: [0, -26] });
  const steamScale = steam.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1.08] });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.moka, { transform: [{ translateY: lift }, { scale }] }]}>
        <Image source={HOME_MOKA_SEATED} style={styles.image} resizeMode="contain" accessibilityIgnoresInvertColors />
      </Animated.View>
      <Animated.View style={[styles.steam, { opacity: steamOpacity, transform: [{ translateY: steamLift }, { scale: steamScale }] }]}>
        <Svg width={42} height={48} viewBox="0 0 42 48">
          <Path d="M13 45c-12-9 12-13 2-23C6 14 22 10 17 2M30 43c-10-8 9-12 2-20-5-6 3-10 2-15" fill="none" stroke="#fff4dc" strokeWidth={3} strokeLinecap="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  moka: { position: 'absolute', left: '28%', bottom: '24%', width: '44%', height: '46%', alignItems: 'center', justifyContent: 'flex-end' },
  image: { width: '100%', height: '100%' },
  steam: { position: 'absolute', left: '51%', top: '44%', width: 42, height: 48 },
});
