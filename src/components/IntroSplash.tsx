import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { MOKA_ASSETS } from '@/constants/moka';
import { fonts, useColors } from '@/theme';

/**
 * Açılış animasyonu, iki bölüm:
 * 1. Meikai Digital introsu: themeikai.com'daki CSS introsunun aynısı (süreler ve eğriler oradan).
 * 2. Moka'nın evi: pastel gökyüzünde tepe, küçük ev zıplayarak belirir, kapı açılır, Moka kahvesiyle
 *    zıplayarak çıkar (buhar, kalpler), "Homezy" harfleri tek tek zıplar (docs/skeleton-v3.md).
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
      spring(2350, v.house, 5, 80),
      at(2850, v.door, 320, Easing.inOut(Easing.quad)),
      spring(3050, v.moka, 4, 60),
      at(3350, v.hearts, 1300, Easing.out(Easing.quad)),
      // Döngü (Animated.loop) paralelin bitişini bekletiyordu; buhar tek uzun yükselişle iki kez tüter.
      at(3300, v.steam, 2200, Easing.linear),
      ...v.word.map((l, i) => spring(3400 + i * 70, l, 4, 120)),
      at(3950, v.tag, 500, Easing.out(Easing.quad)),
      at(4800, v.all, 300, Easing.in(Easing.quad), 0),
    ]);
    function spring(delay: number, val: Animated.Value, friction: number, tension: number) {
      return Animated.sequence([Animated.delay(delay), Animated.spring(val, { toValue: 1, friction, tension, useNativeDriver: true })]);
    }
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
        <MokaHome v={v} lerp={lerp} c={c} />

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
const MOKA = 150;
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
  moka: { position: 'absolute', bottom: STAGE * 0.06, right: -STAGE * 0.02, width: MOKA, height: MOKA },
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

/** İkinci bölüm: pastel gökyüzü, tepe, ev, kapıdan çıkan Moka ve zıplayan "Homezy". */
function MokaHome({ v, lerp, c }: { v: V; lerp: (val: Animated.Value, from: number, to: number) => Animated.AnimatedInterpolation<number>; c: ReturnType<typeof useColors> }) {
  const pop = (val: Animated.Value, from = 0.3) => ({
    opacity: val.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
    transform: [{ scale: lerp(val, from, 1) }],
  });
  return (
    <View style={st.center} pointerEvents="none">
      {/* Gökyüzü: kremden şeftaliye, köşede yumuşak güneş */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: v.sky }]}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c.lavenderSoft} />
              <Stop offset="0.55" stopColor={c.peachSoft} />
              <Stop offset="1" stopColor={c.bg} />
            </LinearGradient>
            <RadialGradient id="sun" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={c.glow} stopOpacity={1} />
              <Stop offset="1" stopColor={c.glow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#sky)" />
          <Circle cx="78%" cy="18%" r="90" fill="url(#sun)" />
        </Svg>
      </Animated.View>

      <View style={st.scene}>
        {/* Tepe: yuvarlak, kenarsız bir ada */}
        <Animated.View style={[st.hill, { opacity: v.sky, transform: [{ translateY: lerp(v.sky, 40, 0) }] }]}>
          <Svg width={STAGE + 160} height={STAGE * 0.5}>
            <Ellipse cx={(STAGE + 160) / 2} cy={STAGE * 0.3} rx={STAGE * 0.64} ry={STAGE * 0.19} fill={c.sage} />
            <Ellipse cx={(STAGE + 160) / 2 - 20} cy={STAGE * 0.2} rx={STAGE * 0.4} ry={STAGE * 0.06} fill={c.sageSoft} opacity={0.55} />
            <Circle cx={84} cy={STAGE * 0.27} r={8} fill={c.rose} />
            <Circle cx={STAGE + 50} cy={STAGE * 0.3} r={7} fill={c.peach} />
            <Circle cx={102} cy={STAGE * 0.33} r={5.5} fill={c.lavender} />
          </Svg>
        </Animated.View>

        {/* Ev: zıplayarak belirir */}
        <Animated.View style={[st.house, { transformOrigin: 'bottom' }, pop(v.house, 0.2)]}>
          <Svg width={HOUSE} height={HOUSE} viewBox="0 0 150 150">
            <Path d="M104 30 h14 a4 4 0 0 1 4 4 v28 h-22 v-28 a4 4 0 0 1 4-4z" fill={c.rose} />
            <Rect x={22} y={66} width={106} height={80} rx={22} fill={c.cream} />
            <Path d="M10 74 Q75 6 140 74 Q143 80 136 82 L14 82 Q7 80 10 74z" fill={c.peach} />
            <Rect x={36} y={92} width={26} height={24} rx={10} fill={c.glow} />
            <Rect x={94} y={92} width={22} height={22} rx={11} fill={c.glow} />
            <Rect x={60} y={86} width={32} height={46} rx={16} fill={c.glowInk} opacity={0.75} />
            <Circle cx={76} cy={104} r={9} fill={c.glow} opacity={0.8} />
            <Circle cx={75} cy={52} r={9} fill={c.cream} />
            <Path d="M70 52 a5 5 0 0 1 10 0 l-5 6z" fill={c.rose} />
          </Svg>
          {/* Kapı: açılınca sola katlanır */}
          <Animated.View style={[st.door, { backgroundColor: c.warm, transformOrigin: 'left', transform: [{ scaleX: lerp(v.door, 1, 0.08) }] }]} />
        </Animated.View>

        {/* Kalpler */}
        {[0, 1, 2].map(i => (
          <Animated.Text
            key={i}
            style={[st.heart, {
              left: STAGE * 0.72 + (i - 1) * 40 - 11, bottom: STAGE * 0.5,
              opacity: v.hearts.interpolate({ inputRange: [0, 0.2, 0.75, 1], outputRange: [0, 1, 1, 0] }),
              transform: [{ translateY: lerp(v.hearts, 0, -70 - i * 14) }, { scale: lerp(v.hearts, 0.4, 1.1) }],
            }]}>
            {['💛', '🤍', '🧡'][i]}
          </Animated.Text>
        ))}

        {/* Moka: kapıdan çıkıp öne zıplar */}
        <Animated.View style={[st.moka, {
          opacity: v.moka.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
          transform: [{ translateX: lerp(v.moka, -STAGE * 0.3, 0) }, { translateY: lerp(v.moka, -STAGE * 0.2, 0) }, { scale: lerp(v.moka, 0.25, 1) }],
        }]}>
          <Image source={MOKA_ASSETS.sipping} style={{ width: MOKA, height: MOKA }} resizeMode="contain" />
          {/* Kahve buharı */}
          {[0, 1, 2].map(i => (
            <Animated.View
              key={i}
              style={[st.steam, {
                backgroundColor: c.surface, right: MOKA * 0.16 + i * 9, top: MOKA * 0.2,
                opacity: v.steam.interpolate({ inputRange: [0, 0.15, 0.5, 0.65, 1], outputRange: [0, 0.8, 0, 0.8, 0] }),
                transform: [
                  { translateY: v.steam.interpolate({ inputRange: [0, 0.5, 0.5001, 1], outputRange: [0, -34 - i * 8, 0, -34 - i * 8] }) },
                  { scale: v.steam.interpolate({ inputRange: [0, 0.5, 0.5001, 1], outputRange: [0.5, 1.3, 0.5, 1.3] }) },
                ],
              }]}
            />
          ))}
        </Animated.View>
      </View>

      <View style={st.word}>
        {WORD.map((ch, i) => (
          <Animated.Text
            key={i}
            style={[st.wordCh, { color: i < 4 ? c.ink : c.warm }, {
              opacity: v.word[i].interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
              transform: [{ translateY: lerp(v.word[i], 26, 0) }, { scale: lerp(v.word[i], 0.5, 1) }],
            }]}>
            {ch}
          </Animated.Text>
        ))}
      </View>
      <Animated.Text style={[st.tag, { color: c.muted, opacity: v.tag, transform: [{ translateY: lerp(v.tag, 8, 0) }] }]}>
        Moka ile sıcacık bir ev ☕
      </Animated.Text>
    </View>
  );
}
