import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { MOKA_ASSETS } from '@/constants/moka';
import { fonts, useColors } from '@/theme';

/**
 * Açılış animasyonu, iki bölüm:
 * 1. Meikai Digital introsu: themeikai.com'daki CSS introsunun aynısı (süreler ve eğriler oradan).
 * 2. Moka yumuşakça belirir, "Homezy" yazısı yavaşça açılır (docs/skeleton-v3.md).
 * Her soğuk açılışta bir kez oynar (~5 sn), ekrana dokununca atlanır. Hareket azaltma açıksa
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
    sky: new Animated.Value(0),
    house: new Animated.Value(0),
    door: new Animated.Value(0),
    moka: new Animated.Value(0),
    steam: new Animated.Value(0),
    hearts: new Animated.Value(0),
    word: WORD.map(() => new Animated.Value(0)),
    tag: new Animated.Value(0),
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
      // 2. Moka'nın evi
      at(2100, v.sky, 700, Easing.out(Easing.quad)),
      at(2400, v.hearts, 2000, Easing.out(Easing.quad)),
      at(2100, v.house, 900, Easing.out(Easing.quad)), // ışık hâlesi
      at(2250, v.moka, 800, expo),
      at(2400, v.steam, 1900, Easing.inOut(Easing.sin)), // Moka'nın nefesi (tek yumuşak süzülme)
      // Döngü (Animated.loop) paralelin bitişini bekletiyordu; buhar tek uzun yükselişle iki kez tüter.
      ...v.word.map((l, i) => at(2750 + i * 60, l, 650, expo)),
      at(3350, v.tag, 500, Easing.out(Easing.quad)),
      at(4400, v.all, 300, Easing.in(Easing.quad), 0),
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
        {/* 2. Moka'nın evi (altta, Meikai katmanı kaybolunca görünür) */}
        <MokaHome v={v} lerp={lerp} />

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
const STAGE = 300;
const HOUSE = 150;
const MOKA = 190;
const HALO = 380;
const GREEN = '#A8CBB0'; // düz pastel adaçayı yeşili (temadan bağımsız)
const INK = '#2E4B3A';
const SPARKS = [
  { e: '🍃', x: 10, y: 55, s: 26, dx: 30, rot: 40 }, { e: '✨', x: 82, y: 40, s: 22, dx: -18, rot: 20 },
  { e: '🌿', x: 20, y: 28, s: 24, dx: 20, rot: -35 }, { e: '✨', x: 68, y: 62, s: 18, dx: 12, rot: 15 },
  { e: '🍃', x: 85, y: 70, s: 28, dx: -34, rot: -50 }, { e: '✨', x: 38, y: 20, s: 16, dx: 0, rot: 30 },
];
const WORD = 'Homezy'.split('');
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
  scene: { width: STAGE, height: STAGE * 0.92, alignItems: 'center' },
  hill: { position: 'absolute', left: -80, bottom: -STAGE * 0.04 },
  house: { position: 'absolute', bottom: STAGE * 0.2, left: STAGE * 0.08 },
  door: { position: 'absolute', left: HOUSE * 0.41, top: HOUSE * 0.58, width: HOUSE * 0.2, height: HOUSE * 0.3, borderRadius: HOUSE * 0.1, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  moka: { width: MOKA, height: MOKA, marginBottom: 8 },
  halo: { position: 'absolute', width: HALO, height: HALO, marginTop: -150 },
  spark: { position: 'absolute' },
  inkCh: { color: INK },
  warmCh: { color: '#FFF8EE', textShadowColor: INK, textShadowRadius: 6, textShadowOffset: { width: 0, height: 2 } },
  mokaImg: { width: MOKA, height: MOKA },
  steam: { position: 'absolute', width: 12, height: 12, borderRadius: 6 },
  heart: { position: 'absolute', fontSize: 22 },
  word: { flexDirection: 'row', marginTop: 4 },
  wordCh: { fontFamily: fonts.displayBold, fontSize: 52, lineHeight: 64, letterSpacing: -0.5 },
  tag: { fontFamily: fonts.bodyBold, fontSize: 15.5, marginTop: 2 },
});

type V = {
  sky: Animated.Value; house: Animated.Value; door: Animated.Value; moka: Animated.Value;
  steam: Animated.Value; hearts: Animated.Value; word: Animated.Value[]; tag: Animated.Value;
};

/** İkinci bölüm: pastel baloncuklar yükselir, uykulu Moka zıplayıp göz kırpar, "Homezy" harfleri dalgayla belirir. */
function MokaHome({ v, lerp }: { v: V; lerp: (val: Animated.Value, from: number, to: number) => Animated.AnimatedInterpolation<number> }) {
  return (
    <View style={st.center} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: GREEN, opacity: v.sky }]} />

      {/* Süzülen yapraklar ve parıltılar: tek seferlik yükselme */}
      {SPARKS.map((p, i) => (
        <Animated.Text
          key={i}
          style={[st.spark, {
            left: `${p.x}%`, top: `${p.y}%`, fontSize: p.s,
            opacity: v.hearts.interpolate({ inputRange: [0, 0.25, 0.8, 1], outputRange: [0, 0.95, 0.9, 0] }),
            transform: [
              { translateY: lerp(v.hearts, 30, -70 - (i % 3) * 25) },
              { translateX: lerp(v.hearts, 0, p.dx) },
              { rotate: v.hearts.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot}deg`] }) },
              { scale: lerp(v.hearts, 0.5, 1) },
            ],
          }]}>
          {p.e}
        </Animated.Text>
      ))}

      {/* Işık hâlesi: Moka'nın arkasında yumuşakça açılır */}
      <Animated.View style={[st.halo, {
        opacity: v.house,
        transform: [{ scale: v.house.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
      }]}>
        <Svg width={HALO} height={HALO}>
          <Defs>
            <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFF8EE" stopOpacity={0.9} />
              <Stop offset="0.6" stopColor="#FFF8EE" stopOpacity={0.3} />
              <Stop offset="1" stopColor="#FFF8EE" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={HALO / 2} cy={HALO / 2} r={HALO / 2} fill="url(#halo)" />
        </Svg>
      </Animated.View>

      {/* Moka: yumuşakça belirir, sonra hafifçe nefes alır */}
      <Animated.View style={[st.moka, {
        opacity: v.moka.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
        transform: [
          { translateY: Animated.add(lerp(v.moka, 18, 0), v.steam.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -7, 0] })) },
          { scale: Animated.multiply(lerp(v.moka, 0.88, 1), v.steam.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.025, 1] })) },
        ],
      }]}>
        <Image source={MOKA_ASSETS.happy} style={st.mokaImg} resizeMode="contain" />
      </Animated.View>

      <View style={st.word}>
        {WORD.map((ch, i) => (
          <Animated.Text
            key={i}
            style={[st.wordCh, i < 4 ? st.inkCh : st.warmCh, {
              opacity: v.word[i].interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
              transform: [{ translateY: Animated.add(lerp(v.word[i], 14, 0), v.hearts.interpolate({ inputRange: [0, 0.3 + i * 0.08, 0.4 + i * 0.08, 0.5 + i * 0.08, 1], outputRange: [0, 0, -9, 0, 0] })) }],
            }]}>
            {ch}
          </Animated.Text>
        ))}
      </View>
      <Animated.Text style={[st.tag, { color: INK, opacity: v.tag, transform: [{ translateY: lerp(v.tag, 8, 0) }] }]}>
        Moka ile sıcacık bir ev ☕
      </Animated.Text>
    </View>
  );
}
