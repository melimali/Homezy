import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { fonts } from '@/theme';

/**
 * Açılışın ilk bölümü: Meikai Digital introsu (themeikai.com'daki CSS introsunun aynısı, süreler ve eğriler oradan).
 * Siyah zemin, logo belirir ve parlar, "MEIKAI" harfleri tek tek gelir, ince çizgi, "DIGITAL". ~2,3 sn.
 * Bitince Homezy açılışına (IntroSplash) yumuşakça geçer; ekrana dokununca atlanır; hareket azaltma
 * açıksa hiç oynamaz. Sadece opacity ve transform canlandırılır (useNativeDriver).
 */
const M = { bg: '#050505', fg: '#ededed', primary: '#b3212b', muted: '#8f8f8f' };
const expo = Easing.bezier(0.16, 1, 0.3, 1);
const exitEase = Easing.bezier(0.7, 0, 0.3, 1);

const MARK = 104;
const GLOW = 560; // sitede 520px daire + blur (Android'de büyük SVG bitmap'i çökertmesin diye küçük tutuldu)
const LETTERS = 'MEIKAI'.split('');

export function MeikaiIntro({ onFade, onDone }: { onFade: () => void; onDone: () => void }) {
  const [v] = useState(() => ({
    mark: new Animated.Value(0),
    glow: new Animated.Value(0),
    shine: new Animated.Value(0),
    letters: LETTERS.map(() => new Animated.Value(0)),
    line: new Animated.Value(0),
    sub: new Animated.Value(0),
    all: new Animated.Value(1),
  }));
  const [ending, setEnding] = useState(false);

  const skip = () => {
    if (ending) return;
    setEnding(true);
    onFade();
    Animated.timing(v.all, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onDone());
  };

  useEffect(() => {
    let alive = true;
    const at = (delay: number, val: Animated.Value, duration: number, easing: (t: number) => number, toValue = 1) =>
      Animated.sequence([Animated.delay(delay), Animated.timing(val, { toValue, duration, easing, useNativeDriver: true })]);
    const anim = Animated.parallel([
      at(200, v.mark, 1100, expo),
      at(300, v.glow, 2400, Easing.out(Easing.quad)),
      ...v.letters.map((l, i) => at(500 + i * 70, l, 700, expo)),
      at(900, v.shine, 900, Easing.inOut(Easing.quad)),
      at(1100, v.line, 800, expo),
      at(1300, v.sub, 800, Easing.out(Easing.quad)),
      at(2100, v.all, 450, exitEase, 0),
    ]);
    const fade = setTimeout(() => alive && onFade(), 2100);
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then(reduce => {
        if (!alive) return;
        if (reduce) {
          onFade();
          onDone();
        }
        else anim.start(({ finished }) => finished && alive && onDone());
      });
    return () => {
      alive = false;
      clearTimeout(fade);
      anim.stop();
    };
    // Sadece ilk açılışta bir kez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lerp = (val: Animated.Value, from: number, to: number) => val.interpolate({ inputRange: [0, 1], outputRange: [from, to] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, st.root, { backgroundColor: M.bg, opacity: v.all }]}>
      <StatusBar style="light" />
      <Pressable style={st.fill} onPress={skip} accessibilityRole="button" accessibilityLabel="Açılışı geç">
        <View style={st.center} pointerEvents="none">
          <Animated.View
            style={[
              st.glow,
              {
                opacity: v.glow.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 0.7] }),
                transform: [{ scale: lerp(v.glow, 0.6, 1) }],
              },
            ]}>
            <Svg width={GLOW} height={GLOW}>
              <Defs>
                <RadialGradient id="g" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={M.primary} stopOpacity={0.22} />
                  <Stop offset="0.45" stopColor={M.primary} stopOpacity={0.16} />
                  <Stop offset="1" stopColor={M.primary} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={GLOW / 2} cy={GLOW / 2} r={GLOW / 2} fill="url(#g)" />
            </Svg>
          </Animated.View>

          <Animated.View style={[st.mark, { opacity: v.mark, transform: [{ scale: lerp(v.mark, 0.6, 1) }] }]}>
            <Image source={require('../../assets/meikai-mark.png')} style={st.markImg} />
            <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: lerp(v.shine, -1.2 * MARK, 1.2 * MARK) }] }]}>
              <Svg width={MARK} height={MARK}>
                <Defs>
                  {/* CSS: linear-gradient(110deg, transparent 35%, rgb(255 255 255 / .35) 50%, transparent 65%) */}
                  <LinearGradient id="s" x1="0" y1="0.32" x2="1" y2="0.68">
                    <Stop offset="0.35" stopColor="#fff" stopOpacity={0} />
                    <Stop offset="0.5" stopColor="#fff" stopOpacity={0.35} />
                    <Stop offset="0.65" stopColor="#fff" stopOpacity={0} />
                  </LinearGradient>
                </Defs>
                <Rect width={MARK} height={MARK} fill="url(#s)" />
              </Svg>
            </Animated.View>
          </Animated.View>

          <View style={st.name}>
            {LETTERS.map((ch, i) => (
              <Animated.Text key={i} style={[st.letter, { opacity: v.letters[i], transform: [{ translateY: lerp(v.letters[i], 12, 0) }] }]}>
                {ch}
              </Animated.Text>
            ))}
          </View>

          <Animated.View style={[st.line, { transform: [{ scaleX: v.line }] }]}>
            <Svg width={160} height={1}>
              <Defs>
                <LinearGradient id="l" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={M.primary} stopOpacity={0} />
                  <Stop offset="0.5" stopColor={M.primary} stopOpacity={1} />
                  <Stop offset="1" stopColor={M.primary} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect width={160} height={1} fill="url(#l)" />
            </Svg>
          </Animated.View>

          <Animated.Text style={[st.sub, { opacity: v.sub }]}>DIGITAL</Animated.Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });

const st = StyleSheet.create({
  root: { zIndex: 110, elevation: 110 },
  fill: { flex: 1 },
  center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: GLOW, height: GLOW },
  mark: { width: MARK, height: MARK, borderRadius: MARK * 0.22, overflow: 'hidden' },
  markImg: { width: MARK, height: MARK },
  name: { flexDirection: 'row', marginTop: 32, paddingLeft: 14 },
  letter: { color: M.fg, fontFamily: fonts.body, fontSize: 28, marginRight: 14 },
  line: { marginTop: 20, width: 160, height: 1 },
  sub: { marginTop: 16, paddingLeft: 7, color: M.muted, fontFamily: mono, fontSize: 12, letterSpacing: 6.7 },
});
