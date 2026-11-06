import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { MOKA_ASSETS } from '@/constants/moka';
import { fonts, useColors } from '@/theme';

/**
 * Açılış (~1,8 sn): sade ve sakin. Düz zemin, Moka yumuşakça belirir,
 * altında "Homezy" ve slogan. Dokununca ya da "Geç" ile atlanır; her soğuk açılışta bir kez.
 * Sadece opacity ve transform (useNativeDriver). Döngü yok.
 */

const MOKA = 150;

export function IntroSplash({ onDone }: { onDone: () => void }) {
  const c = useColors();
  const [v] = useState(() => ({
    moka: new Animated.Value(0),
    word: new Animated.Value(0),
    tag: new Animated.Value(0),
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
    const at = (delay: number, val: Animated.Value, duration: number, toValue = 1) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(val, { toValue, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]);
    const anim = Animated.parallel([
      at(0, v.moka, 500),
      at(300, v.word, 450),
      at(700, v.tag, 450),
      at(1500, v.all, 300, 0),
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
    <Animated.View style={[StyleSheet.absoluteFill, st.root, { backgroundColor: c.bg, opacity: v.all }]}>
      <StatusBar style="auto" />
      <Pressable style={st.fill} onPress={skip} accessibilityRole="button" accessibilityLabel="Açılışı geç">
        <View style={st.center} pointerEvents="none">
          <Animated.Image
            source={MOKA_ASSETS.happy}
            resizeMode="contain"
            style={{ width: MOKA, height: MOKA, opacity: v.moka, transform: [{ translateY: lerp(v.moka, 12, 0) }, { scale: lerp(v.moka, 0.94, 1) }] }}
          />
          <Animated.Text style={[st.word, { color: c.ink, opacity: v.word, transform: [{ translateY: lerp(v.word, 8, 0) }] }]}>
            Homezy
          </Animated.Text>
          <Animated.Text style={[st.tag, { color: c.muted, opacity: v.tag }]}>
            Küçük adımlar, uzun soluklu disiplin
          </Animated.Text>
        </View>
        <Text style={[st.skip, { color: c.muted }]}>Geç</Text>
      </Pressable>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  root: { zIndex: 100, elevation: 100 },
  fill: { flex: 1 },
  center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  word: { fontFamily: fonts.displayBold, fontSize: 44, lineHeight: 54, marginTop: 8, letterSpacing: -0.5 },
  tag: { fontFamily: fonts.body, fontSize: 15, marginTop: 4, textAlign: 'center' },
  skip: { position: 'absolute', right: 24, bottom: 40, fontFamily: fonts.bodyBold, fontSize: 14 },
});
