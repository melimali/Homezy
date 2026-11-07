import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { fonts, useColors } from '@/theme';

/**
 * Açılış (~1,7 sn): yazısız, sadece Homezy logosu. Koyu zemin, yumuşak ışık,
 * logo yaylanarak belirir. Dokununca ya da "Geç" ile atlanır; her soğuk açılışta bir kez.
 * Sadece opacity ve transform (useNativeDriver). Döngü yok.
 */

const LOGO_W = 280;
const LOGO_H = LOGO_W / 3;

export function IntroSplash({ onDone }: { onDone: () => void }) {
  const c = useColors();
  const [v] = useState(() => ({
    glow: new Animated.Value(0),
    logo: new Animated.Value(0),
    all: new Animated.Value(1),
  }));
  const [ending, setEnding] = useState(false);

  const skip = () => {
    if (ending) return;
    setEnding(true);
    Animated.timing(v.all, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => onDone());
  };

  useEffect(() => {
    let alive = true;
    const t = (delay: number, val: Animated.Value, duration: number, toValue = 1) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(val, { toValue, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]);
    const anim = Animated.parallel([
      t(0, v.glow, 900),
      Animated.sequence([Animated.delay(150), Animated.spring(v.logo, { toValue: 1, friction: 9, tension: 60, useNativeDriver: true })]),
      t(1400, v.all, 300, 0),
    ]);
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (!alive) return;
        if (reduce) onDone();
        else anim.start(({ finished }) => finished && alive && onDone());
      });
    return () => {
      alive = false;
      anim.stop();
    };
    // Sadece ilk açılışta bir kez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lerp = (val: Animated.Value, from: number, to: number) =>
    val.interpolate({ inputRange: [0, 1], outputRange: [from, to] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, st.root, { backgroundColor: c.night, opacity: v.all }]}>
      <StatusBar style="light" />
      <Pressable style={st.fill} onPress={skip} accessibilityRole="button" accessibilityLabel="Açılışı geç">
        <View style={st.center} pointerEvents="none">
          {/* Arkada yumuşak ışık */}
          <Animated.View style={{ position: 'absolute', opacity: v.glow, transform: [{ scale: lerp(v.glow, 0.7, 1) }] }}>
            <Svg width={460} height={460}>
              <Defs>
                <RadialGradient id="g" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={c.cream} stopOpacity={0.22} />
                  <Stop offset="1" stopColor={c.cream} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={230} cy={230} r={230} fill="url(#g)" />
            </Svg>
          </Animated.View>
          {/* Logo: açık hap içinde, yaylanarak belirir, üstünden bir kez ışık geçer */}
          <Animated.View
            style={[
              st.pill,
              { backgroundColor: c.cream, opacity: v.logo.interpolate({ inputRange: [0, 0.3], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ scale: lerp(v.logo, 0.85, 1) }, { translateY: lerp(v.logo, 14, 0) }] },
            ]}>
            <Image source={require('../../assets/logo-yatay.png')} style={{ width: LOGO_W, height: LOGO_H }} resizeMode="contain" />
            <Animated.View
              style={[
                st.shine,
                { opacity: v.shine.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateX: lerp(v.shine, -LOGO_W, LOGO_W) }, { rotate: '18deg' }] },
              ]}
            />
          </Animated.View>
        </View>
        <Text style={[st.skip, { color: c.onNight }]}>Geç</Text>
      </Pressable>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  root: { zIndex: 100, elevation: 100 },
  fill: { flex: 1 },
  center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  pill: {
    paddingHorizontal: 28,
    paddingVertical: 20,
    borderRadius: 44,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  skip: { position: 'absolute', right: 24, bottom: 40, fontFamily: fonts.bodyBold, fontSize: 14, opacity: 0.7 },
});
