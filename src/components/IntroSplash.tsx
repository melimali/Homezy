import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { MOKA_ASSETS } from '@/constants/moka';
import { brand, fonts } from '@/theme';

/**
 * Açılış (~2,2 sn): yazısız, sadece Homezy logosu. Mint zemin, yumuşak ışık,
 * Moka ve logo yavaşça belirir, üç nokta nabız atar. Dokununca ya da "Geç" ile atlanır; her soğuk açılışta bir kez.
 * Sadece opacity ve transform (useNativeDriver). Döngü yok.
 */

const MOKA = 150;
const LOGO_W = 260;
const LOGO_H = LOGO_W / 3;

export function IntroSplash({ onDone }: { onDone: () => void }) {
  const [v] = useState(() => ({
    glow: new Animated.Value(0),
    moka: new Animated.Value(0),
    logo: new Animated.Value(0),
    dots: [0, 1, 2].map(() => new Animated.Value(0)),
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
    // Üç nokta bir kez nabız atar (döngü yok, intro mutlaka biter).
    const pulse = (i: number) =>
      Animated.sequence([
        Animated.delay(900 + i * 150),
        Animated.timing(v.dots[i], { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(v.dots[i], { toValue: 0.25, duration: 280, useNativeDriver: true }),
        Animated.timing(v.dots[i], { toValue: 1, duration: 280, useNativeDriver: true }),
      ]);
    const anim = Animated.parallel([
      t(0, v.glow, 1200),
      t(100, v.moka, 900),
      t(450, v.logo, 900),
      ...[0, 1, 2].map(pulse),
      t(1900, v.all, 350, 0),
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
    <Animated.View style={[StyleSheet.absoluteFill, st.root, { backgroundColor: brand.mint, opacity: v.all }]}>
      <StatusBar style="dark" />
      <Pressable style={st.fill} onPress={skip} accessibilityRole="button" accessibilityLabel="Açılışı geç">
        <View style={st.center} pointerEvents="none">
          {/* Arkada yumuşak mavi ışık */}
          <Animated.View style={{ position: 'absolute', top: '24%', opacity: v.glow, transform: [{ scale: lerp(v.glow, 0.8, 1) }] }}>
            <Svg width={420} height={420}>
              <Defs>
                <RadialGradient id="g" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={brand.blue} stopOpacity={0.28} />
                  <Stop offset="1" stopColor={brand.blue} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={210} cy={210} r={210} fill="url(#g)" />
            </Svg>
          </Animated.View>
          <Animated.Image
            source={MOKA_ASSETS.happy}
            resizeMode="contain"
            style={{ width: MOKA, height: MOKA, opacity: v.moka, transform: [{ translateY: lerp(v.moka, 18, 0) }] }}
          />
          <Animated.Image
            source={require('../../assets/logo-yatay.png')}
            resizeMode="contain"
            style={{ width: LOGO_W, height: LOGO_H, marginTop: 4, opacity: v.logo, transform: [{ translateY: lerp(v.logo, 14, 0) }] }}
          />
          <View style={st.dots}>
            {v.dots.map((d, i) => (
              <Animated.View key={i} style={[st.dot, { opacity: d, transform: [{ scale: lerp(d, 0.7, 1.15) }] }]} />
            ))}
          </View>
        </View>
        <Text style={[st.skip, { color: brand.cocoa }]}>Geç</Text>
      </Pressable>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  root: { zIndex: 100, elevation: 100 },
  fill: { flex: 1 },
  center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 10, marginTop: 36, height: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: brand.blue },
  skip: { position: 'absolute', right: 24, bottom: 40, fontFamily: fonts.bodyBold, fontSize: 14, opacity: 0.7 },
});
