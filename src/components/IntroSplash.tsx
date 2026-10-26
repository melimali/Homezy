import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Circle, Rect, Stop } from 'react-native-svg';

import { fonts, useColors } from '@/theme';

/**
 * Açılış animasyonu, iki bölüm:
 * 1. Meikai Digital introsu: themeikai.com'daki CSS introsunun aynısı (süreler ve eğriler oradan).
 * 2. Zıplayan Homezy logosu.
 * Her soğuk açılışta bir kez oynar (~3,3 sn), ekrana dokununca atlanır. Hareket azaltma açıksa
 * sitede olduğu gibi hiç oynamaz. Android'de takılmasın diye sadece opacity ve transform
 * canlandırılıyor (useNativeDriver); sitedeki blur efektleri bu yüzden yok.
 */

// Sitedeki renkler
const M = { bg: '#050505', fg: '#ededed', primary: '#b3212b', muted: '#8f8f8f' };

const expo = Easing.bezier(0.16, 1, 0.3, 1); // sitede çoğu adımın eğrisi
const exitEase = Easing.bezier(0.7, 0, 0.3, 1);

const MARK = 104;
const LETTERS = 'MEIKAI'.split('');

export function IntroSplash({ onDone }: { onDone: () => void }) {
  const c = useColors();
  const [v] = useState(() => ({
    mark: new Animated.Value(0),
    glow: new Animated.Value(0),
    shine: new Animated.Value(0),
    letters: LETTERS.map(() => new Animated.Value(0)),
    line: new Animated.Value(0),
    sub: new Animated.Value(0),
    meikai: new Animated.Value(1), // Meikai katmanı (1 → 0 çıkış)
    logo: new Animated.Value(0),
    all: new Animated.Value(1),
  }));
  const [dark, setDark] = useState(true); // durum çubuğu Meikai'nin siyah zemininde açık renk olsun

  const [ending, setEnding] = useState(false);
  const skip = () => {
    if (ending) return;
    setEnding(true);
    Animated.timing(v.all, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => onDone());
  };

  useEffect(() => {
    let alive = true;
    const at = (delay: number, val: Animated.Value, duration: number, easing: (t: number) => number, toValue = 1) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(val, { toValue, duration, easing, useNativeDriver: true }),
      ]);

    const anim = Animated.parallel([
      // 1. Meikai (themeikai.com .intro, saniyeler aynı)
      at(200, v.mark, 1100, expo),
      at(300, v.glow, 2400, Easing.out(Easing.quad)),
      ...v.letters.map((l, i) => at(500 + i * 70, l, 700, expo)),
      at(900, v.shine, 900, Easing.inOut(Easing.quad)),
      at(1100, v.line, 800, expo),
      at(1300, v.sub, 800, Easing.out(Easing.quad)),
      // Sitede 0,9 sn süren çıkış burada Homezy'ye geçiş olarak kısaldı.
      at(2100, v.meikai, 500, exitEase, 0),
      // 2. Homezy logosu
      Animated.sequence([
        Animated.delay(2300),
        Animated.spring(v.logo, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }),
      ]),
      at(3000, v.all, 280, Easing.in(Easing.quad), 0),
    ]);
    const t = setTimeout(() => alive && setDark(false), 2300);

    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (!alive) return;
        if (reduce) onDone();
        else anim.start(({ finished }) => finished && alive && onDone());
      });
    return () => {
      alive = false;
      clearTimeout(t);
      anim.stop();
    };
    // Sadece ilk açılışta bir kez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lerp = (val: Animated.Value, from: number, to: number) =>
    val.interpolate({ inputRange: [0, 1], outputRange: [from, to] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, st.root, { backgroundColor: c.bg, opacity: v.all }]}>
      <StatusBar style={dark ? 'light' : 'auto'} />
      <Pressable style={st.fill} onPress={skip} accessibilityRole="button" accessibilityLabel="Açılışı geç">
        {/* 2. Homezy logosu (altta, Meikai katmanı kaybolunca görünür) */}
        <View style={st.center} pointerEvents="none">
          <Animated.View
            style={{
              opacity: v.logo.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
              transform: [{ scale: lerp(v.logo, 0.4, 1) }, { rotate: v.logo.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '0deg'] }) }],
            }}>
            <Image source={require('../../assets/logo-kare.png')} style={st.logo} resizeMode="contain" />
          </Animated.View>
        </View>

        {/* 1. Meikai Digital introsu */}
        <Animated.View style={[st.center, { backgroundColor: M.bg, opacity: v.meikai }]} pointerEvents="none">
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
              <Animated.Text
                key={i}
                style={[st.letter, { opacity: v.letters[i], transform: [{ translateY: lerp(v.letters[i], 12, 0) }] }]}>
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
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const GLOW = 760; // sitede 520px daire + 120px blur
const LOGO = 168;
const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });

const st = StyleSheet.create({
  root: { zIndex: 100, elevation: 100 },
  fill: { flex: 1 },
  center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: GLOW, height: GLOW },
  mark: { width: MARK, height: MARK, borderRadius: MARK * 0.22, overflow: 'hidden' },
  markImg: { width: MARK, height: MARK },
  // Sitede Inter 500; uygulamada yüklü olan en yakın yazı tipi Nunito.
  name: { flexDirection: 'row', marginTop: 32, paddingLeft: 14 },
  letter: { color: M.fg, fontFamily: fonts.body, fontSize: 28, marginRight: 14 },
  line: { marginTop: 20, width: 160, height: 1 },
  sub: { marginTop: 16, paddingLeft: 7, color: M.muted, fontFamily: mono, fontSize: 11, letterSpacing: 6.7 },
  logo: { width: LOGO, height: LOGO },
});
