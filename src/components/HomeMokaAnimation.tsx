import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { HOME_MOKA_SEATED } from '@/constants/curated-scenes';
import { useReduceMotion } from './motion';

/** Moka koltukta otururken hafifçe nefes alır; fincanından yumuşak buhar yükselir. */
export function HomeMokaAnimation() {
  const reduce = useReduceMotion();
  const [values] = useState(() => ({
    breath: new Animated.Value(0),
    steamA: new Animated.Value(0),
    steamB: new Animated.Value(0),
  }));

  useEffect(() => {
    const { breath, steamA, steamB } = values;
    if (reduce) {
      breath.setValue(0);
      steamA.setValue(0);
      steamB.setValue(0);
      return;
    }

    const breathing = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(breath, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    const steamLoop = (value: Animated.Value, delay: number) => Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(value, { toValue: 1, duration: 1450, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }),
      Animated.timing(value, { toValue: 0, duration: 1, useNativeDriver: true, isInteraction: false }),
    ]));
    const steamAAnimation = steamLoop(steamA, 0);
    const steamBAnimation = steamLoop(steamB, 620);
    breathing.start();
    steamAAnimation.start();
    steamBAnimation.start();
    return () => {
      breathing.stop();
      steamAAnimation.stop();
      steamBAnimation.stop();
    };
  }, [reduce, values]);

  const mokaScale = values.breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.012] });
  const mokaLift = values.breath.interpolate({ inputRange: [0, 1], outputRange: [0, -1] });
  const steamStyle = (value: Animated.Value) => ({
    opacity: value.interpolate({ inputRange: [0, 0.12, 0.72, 1], outputRange: [0, 0.72, 0.28, 0] }),
    transform: [
      { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, -22] }) },
      { scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1.08] }) },
    ],
  });

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.layer]}>
      <Animated.Image
        source={HOME_MOKA_SEATED}
        style={[styles.moka, { transform: [{ translateY: mokaLift }, { scale: mokaScale }] }]}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <Animated.View style={[styles.steamA, steamStyle(values.steamA)]}>
        <Svg width="100%" height="100%" viewBox="0 0 28 40">
          <Path d="M17 38c-12-8 8-13 0-21S19 7 14 2" fill="none" stroke="#684832" strokeOpacity={0.28} strokeWidth={4} strokeLinecap="round" />
          <Path d="M17 38c-12-8 8-13 0-21S19 7 14 2" fill="none" stroke="#FFF3DF" strokeWidth={2.2} strokeLinecap="round" />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.steamB, steamStyle(values.steamB)]}>
        <Svg width="100%" height="100%" viewBox="0 0 28 40">
          <Path d="M12 38c11-8-8-13 0-21S10 7 15 2" fill="none" stroke="#684832" strokeOpacity={0.28} strokeWidth={4} strokeLinecap="round" />
          <Path d="M12 38c11-8-8-13 0-21S10 7 15 2" fill="none" stroke="#FFF3DF" strokeWidth={2.2} strokeLinecap="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { overflow: 'hidden' },
  moka: { position: 'absolute', left: '28%', bottom: '24%', width: '44%', height: '50%' },
  steamA: { position: 'absolute', left: '51%', top: '44.5%', width: 28, height: 40 },
  steamB: { position: 'absolute', left: '54%', top: '44%', width: 26, height: 37 },
});
