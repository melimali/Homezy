import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { isEn } from '@/i18n/runtime';
import { brand, fonts } from '@/theme';

/**
 * Homezy açılışı (~2,5 sn, bir kez, döngü yok). Web sitelerindeki CSS intro tarzında, sade:
 * krem zemin, arkada sıcak ışık yavaşça açılır; Moka "expo" eğrisiyle büyüyerek belirir; "Homezy" harfleri tek tek aşağıdan gelir; ince bir çizgi ortadan açılır; altında
 * aralıklı küçük alt yazı belirir; sonra hepsi hafif büyüyerek solar.
 * Sadece opacity ve transform (native driver). Dokununca ya da "Geç" ile atlanır; "hareketi azalt" açıksa oynamaz.
 */

const CREAM = '#F7F2EA';
const expo = Easing.bezier(0.16, 1, 0.3, 1);
const exitEase = Easing.bezier(0.7, 0, 0.3, 1);
const LETTERS = 'Homezy'.split('');

/**
 * `play` false iken sadece opak krem perde olarak durur (Meikai introsunun altında); böylece
 * uygulama ekranları (tanıtım, sorular) intro bitmeden asla görünmez. `play` true olunca oynar.
 */
export function IntroSplash({ onDone, play = true }: { onDone: () => void; play?: boolean }) {
  const { width, height } = useWindowDimensions();
  const [v] = useState(() => ({
    glow: new Animated.Value(0),
    moka: new Animated.Value(0),
    letters: LETTERS.map(() => new Animated.Value(0)),
    line: new Animated.Value(0),
    sub: new Animated.Value(0),
    out: new Animated.Value(0),
  }));
  const [ending, setEnding] = useState(false);

  const skip = () => {
    if (ending || !play) return;
    setEnding(true);
    Animated.timing(v.out, { toValue: 1, duration: 200, useNativeDriver: true }).start(() => onDone());
  };

  useEffect(() => {
    if (!play) return;
    let alive = true;
    const at = (delay: number, val: Animated.Value, duration: number, easing: (x: number) => number) =>
      Animated.sequence([Animated.delay(delay), Animated.timing(val, { toValue: 1, duration, easing, useNativeDriver: true })]);
    const anim = Animated.parallel([
      at(0, v.glow, 1800, Easing.out(Easing.quad)),
      at(100, v.moka, 1000, expo),
      ...v.letters.map((l, i) => at(450 + i * 70, l, 700, expo)),
      at(1000, v.line, 800, expo),
      at(1200, v.sub, 700, Easing.out(Easing.quad)),
      at(2100, v.out, 420, exitEase),
    ]);
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then(reduce => {
        if (!alive) return;
        if (reduce) onDone();
        else anim.start(({ finished }) => finished && alive && onDone());
      });
    return () => {
      alive = false;
      anim.stop();
    };
    // Sadece ilk açılışta, oynatma başlayınca bir kez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play]);

  const lerp = (val: Animated.Value, a: number, b: number) => val.interpolate({ inputRange: [0, 1], outputRange: [a, b] });
  const moka = Math.round(Math.min(168, width * 0.4, height * 0.21));
  const glow = Math.round(Math.min(560, Math.max(width, height) * 0.8));
  const word = Math.min(46, width * 0.115);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, st.root, { backgroundColor: CREAM, opacity: lerp(v.out, 1, 0) }]}>
      <StatusBar style="dark" />
      <Pressable style={st.fill} onPress={skip} accessibilityRole="button" accessibilityLabel={isEn() ? 'Skip intro' : 'Açılışı geç'}>
        <View style={st.center} pointerEvents="none">
          {/* Sıcak ışık */}
          <Animated.View
            style={{
              position: 'absolute',
              width: glow,
              height: glow,
              opacity: v.glow.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 0.8] }),
              transform: [{ scale: lerp(v.glow, 0.6, 1) }],
            }}
          >
            <Svg width={glow} height={glow}>
              <Defs>
                <RadialGradient id="g" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#FFDDB3" stopOpacity={0.75} />
                  <Stop offset="0.45" stopColor="#FBE3D2" stopOpacity={0.45} />
                  <Stop offset="1" stopColor={CREAM} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={glow / 2} cy={glow / 2} r={glow / 2} fill="url(#g)" />
            </Svg>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: lerp(v.out, 1, 1.04) }], alignItems: 'center' }}>
            {/* Moka */}
            <Animated.View style={{ width: moka, height: moka, opacity: v.moka, transform: [{ scale: lerp(v.moka, 0.6, 1) }] }}>
              <Animated.Image source={require('../../assets/splash-moka.png')} style={{ width: moka, height: moka }} resizeMode="contain" />
            </Animated.View>

            {/* Harf harf "Homezy" */}
            <View style={st.name}>
              {LETTERS.map((ch, i) => (
                <Animated.Text
                  key={i}
                  style={[
                    st.letter,
                    { fontSize: word, lineHeight: word * 1.25, opacity: v.letters[i], transform: [{ translateY: lerp(v.letters[i]!, word * 0.35, 0) }] },
                  ]}
                >
                  {ch}
                </Animated.Text>
              ))}
            </View>

            {/* Ortadan açılan çizgi */}
            <Animated.View style={[st.line, { transform: [{ scaleX: v.line }] }]}>
              <Svg width={140} height={2}>
                <Defs>
                  <LinearGradient id="l" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor={brand.clay} stopOpacity={0} />
                    <Stop offset="0.5" stopColor={brand.cocoa} stopOpacity={1} />
                    <Stop offset="1" stopColor={brand.clay} stopOpacity={0} />
                  </LinearGradient>
                </Defs>
                <Rect width={140} height={2} fill="url(#l)" />
              </Svg>
            </Animated.View>

            <Animated.Text style={[st.sub, { opacity: v.sub, transform: [{ translateY: lerp(v.sub, 6, 0) }] }]}>
              {isEn() ? 'HOME · ROUTINE · YOU' : 'EV · RUTİN · SEN'}
            </Animated.Text>
          </Animated.View>
        </View>

        <Text style={[st.skip, { color: brand.cocoa }]}>{isEn() ? 'Skip' : 'Geç'}</Text>
      </Pressable>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  root: { zIndex: 100, elevation: 100 },
  fill: { flex: 1 },
  center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  name: { flexDirection: 'row', marginTop: 14 },
  letter: { color: brand.navy, fontFamily: fonts.displayBold, letterSpacing: 0.5 },
  line: { marginTop: 10, width: 140, height: 2 },
  sub: { marginTop: 14, paddingLeft: 5, color: brand.cocoa, fontFamily: fonts.bodyBlack, fontSize: 11.5, letterSpacing: 5 },
  skip: { position: 'absolute', right: 24, bottom: 40, fontFamily: fonts.bodyBold, fontSize: 14, opacity: 0.7 },
});
