import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { ART, Piece, Sparkle, roofPath } from '@/components/introArt';
import { isEn } from '@/i18n/runtime';
import { brand, fonts } from '@/theme';

/**
 * Homezy açılışı (~2,9 sn, bir kez, döngü yok): krem zemin üstünde sıcak bir ışık yanar, zemin çizilir,
 * duvarlar yükselir, çatı yerine oturur, pencerelerde ışık yanar, bacadan duman çıkar; Moka yaylanarak
 * evin önüne gelir, parıltılar ve Homezy logosu belirir, sonra hepsi yumuşakça açılarak kaybolur.
 * Sadece opacity ve transform (native driver). Dokununca ya da "Geç" ile atlanır; "hareketi azalt" açıksa oynamaz.
 */

const SW = 300; // sahne
const SH = 240;
const GROUND = 214;
const BODY = { x: 44, y: 110, w: 152, h: GROUND - 110 };
const ROOF = { x: 28, y: 42, w: 184, h: 78 };
const MOKA = 132;
const CREAM = '#F7F2EA';

export function IntroSplash({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const [v] = useState(() => {
    const n = () => new Animated.Value(0);
    return { glow: n(), ground: n(), body: n(), roof: n(), chimney: n(), lights: n(), moka: n(), logo: n(), smoke: [n(), n(), n()], spark: [n(), n(), n(), n()], out: n() };
  });
  const [ending, setEnding] = useState(false);

  const skip = () => {
    if (ending) return;
    setEnding(true);
    Animated.timing(v.out, { toValue: 1, duration: 200, useNativeDriver: true }).start(() => onDone());
  };

  useEffect(() => {
    let alive = true;
    const ease = Easing.bezier(0.22, 1, 0.36, 1);
    const go = (delay: number, val: Animated.Value, duration: number, easing: (x: number) => number = ease) =>
      Animated.sequence([Animated.delay(delay), Animated.timing(val, { toValue: 1, duration, easing, useNativeDriver: true })]);
    const anim = Animated.parallel([
      go(0, v.glow, 1100, Easing.out(Easing.quad)),
      go(120, v.ground, 520),
      go(320, v.body, 560, Easing.bezier(0.34, 1.4, 0.64, 1)),
      go(720, v.roof, 520, Easing.bezier(0.34, 1.5, 0.64, 1)),
      go(940, v.chimney, 300),
      go(1080, v.lights, 420, Easing.out(Easing.quad)),
      Animated.sequence([Animated.delay(1180), Animated.spring(v.moka, { toValue: 1, friction: 5.5, tension: 70, useNativeDriver: true })]),
      ...v.smoke.map((s, i) => go(1250 + i * 260, s, 1100, Easing.out(Easing.quad))),
      ...v.spark.map((s, i) => go(1450 + i * 110, s, 520, Easing.linear)),
      go(1420, v.logo, 640),
      go(2560, v.out, 380, Easing.bezier(0.7, 0, 0.84, 0)),
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
    // Sadece ilk açılışta bir kez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lerp = (val: Animated.Value, a: number, b: number) => val.interpolate({ inputRange: [0, 1], outputRange: [a, b] });
  // Geniş ekranda biraz büyür, küçük ekranda sığar.
  const k = Math.max(0.78, Math.min(1.25, (width - 40) / SW, (height * 0.48) / SH));
  const glowSize = Math.max(width, height) * 0.95;
  const logoW = Math.min(250, width * 0.62);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, st.root, { backgroundColor: CREAM, opacity: lerp(v.out, 1, 0) }]}>
      <StatusBar style="dark" />
      <Pressable style={st.fill} onPress={skip} accessibilityRole="button" accessibilityLabel={isEn() ? 'Skip intro' : 'Açılışı geç'}>
        {/* Sıcak ışık */}
        <Animated.View
          pointerEvents="none"
          style={[st.center, { opacity: v.glow, transform: [{ scale: lerp(v.glow, 0.7, 1) }] }]}
        >
          <Svg width={glowSize} height={glowSize}>
            <Defs>
              <RadialGradient id="sg" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#FFE3BD" stopOpacity={0.95} />
                <Stop offset="0.45" stopColor="#FCE8DC" stopOpacity={0.6} />
                <Stop offset="1" stopColor={CREAM} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={glowSize / 2} cy={glowSize / 2} r={glowSize / 2} fill="url(#sg)" />
          </Svg>
        </Animated.View>

        <Animated.View pointerEvents="none" style={[st.center, { transform: [{ scale: lerp(v.out, 1, 1.06) }] }]}>
          <View style={{ width: SW, height: SH, transform: [{ scale: k }], marginBottom: (k - 1) * SH * 0.5 + 18 }}>
            {/* Zemin */}
            <Piece x={10} y={GROUND - 6} w={280} h={16} style={{ transform: [{ scaleX: v.ground }], opacity: v.ground }}>
              <Ellipse cx={140} cy={9} rx={136} ry={7} fill={ART.sage} opacity={0.6} />
              <Ellipse cx={120} cy={8} rx={90} ry={4} fill={ART.shadow} />
            </Piece>

            {/* Baca (çatının arkasında) */}
            <Piece x={150} y={46} w={20} h={40} style={{ opacity: v.chimney, transform: [{ scaleY: v.chimney }], transformOrigin: 'bottom' }}>
              <Rect x={2} y={4} width={16} height={36} rx={3} fill={ART.roofLo} />
              <Rect x={0} y={0} width={20} height={8} rx={4} fill={ART.roof} />
            </Piece>

            {/* Duman */}
            {v.smoke.map((s, i) => (
              <Piece
                key={i}
                x={150 + (i % 2) * 6}
                y={18}
                w={22}
                h={22}
                style={{
                  opacity: s.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.75, 0] }),
                  transform: [{ translateY: lerp(s, 18, -26) }, { translateX: lerp(s, 0, 10 + i * 4) }, { scale: lerp(s, 0.5, 1.4) }],
                }}
              >
                <Circle cx={11} cy={11} r={9} fill="#E7DCD2" />
              </Piece>
            ))}

            {/* Pencere ışığının hâlesi */}
            <Piece
              x={BODY.x - 20}
              y={BODY.y - 20}
              w={BODY.w + 40}
              h={BODY.h + 40}
              style={{ opacity: v.lights, transform: [{ scale: lerp(v.lights, 0.8, 1) }] }}
            >
              <Defs>
                <RadialGradient id="wg" cx="50%" cy="45%" r="55%">
                  <Stop offset="0" stopColor={ART.glow} stopOpacity={0.55} />
                  <Stop offset="1" stopColor={ART.glow} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect x={0} y={0} width={BODY.w + 40} height={BODY.h + 40} rx={60} fill="url(#wg)" />
            </Piece>

            {/* Duvarlar */}
            <Piece
              x={BODY.x}
              y={BODY.y}
              w={BODY.w}
              h={BODY.h}
              style={{ opacity: v.body.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1] }), transform: [{ scaleY: v.body }], transformOrigin: 'bottom' }}
            >
              <Rect x={0} y={0} width={BODY.w} height={BODY.h} rx={10} fill={ART.wall} />
              <Rect x={0} y={BODY.h - 12} width={BODY.w} height={12} rx={6} fill={ART.wallShade} />
              <Rect x={58} y={36} width={36} height={BODY.h - 36} rx={16} fill={ART.door} />
              <Rect x={62} y={40} width={28} height={10} rx={5} fill="#9C8A7F" />
              <Circle cx={85} cy={74} r={2.4} fill={ART.glowSoft} />
              <Rect x={14} y={26} width={32} height={30} rx={8} fill={ART.pane} />
              <Rect x={106} y={26} width={32} height={30} rx={8} fill={ART.pane} />
            </Piece>
            {/* Yanan pencereler */}
            <Piece x={BODY.x} y={BODY.y} w={BODY.w} h={60} style={{ opacity: v.lights }}>
              {[14, 106].map(x => (
                <Path key={x} d={`M${x + 8} 26 H${x + 24} Q${x + 32} 26 ${x + 32} 34 V48 Q${x + 32} 56 ${x + 24} 56 H${x + 8} Q${x} 56 ${x} 48 V34 Q${x} 26 ${x + 8} 26 Z`} fill={ART.glow} />
              ))}
              {[14, 106].map(x => (
                <Rect key={`m${x}`} x={x + 15} y={26} width={2.5} height={30} fill={ART.wall} />
              ))}
              {[14, 106].map(x => (
                <Rect key={`h${x}`} x={x} y={39.5} width={32} height={2.5} fill={ART.wall} />
              ))}
            </Piece>

            {/* Kapı önü taşları ve çalılar */}
            <Piece x={BODY.x - 18} y={GROUND - 26} w={BODY.w + 36} h={34} style={{ opacity: v.lights, transform: [{ scale: lerp(v.lights, 0.6, 1) }], transformOrigin: 'bottom' }}>
              <Circle cx={18} cy={20} r={14} fill={ART.sageDeep} />
              <Circle cx={30} cy={24} r={10} fill={ART.sage} />
              <Circle cx={14} cy={14} r={4} fill="#fff" opacity={0.25} />
              <Circle cx={BODY.w + 20} cy={22} r={12} fill={ART.sage} />
              <Circle cx={BODY.w + 10} cy={25} r={9} fill={ART.sageDeep} />
              <Circle cx={22} cy={10} r={3} fill={ART.roseDeep} />
              <Circle cx={30} cy={16} r={2.6} fill={ART.peachDeep} />
              <Circle cx={BODY.w + 22} cy={14} r={2.8} fill={ART.roseDeep} />
            </Piece>

            {/* Çatı */}
            <Piece
              x={ROOF.x}
              y={ROOF.y}
              w={ROOF.w}
              h={ROOF.h}
              style={{ opacity: v.roof.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }), transform: [{ translateY: lerp(v.roof, -46, 0) }] }}
            >
              <Path d={roofPath(ROOF.w, ROOF.h)} fill={ART.roof} />
              <Path d={`M${ROOF.w / 2} 12 L${ROOF.w * 0.2} ${ROOF.h - 18}`} stroke={ART.roofHi} strokeWidth={6} strokeLinecap="round" opacity={0.7} />
              <Rect x={6} y={ROOF.h - 10} width={ROOF.w - 12} height={10} rx={5} fill={ART.roofLo} />
              <Circle cx={ROOF.w / 2} cy={ROOF.h * 0.52} r={11} fill={ART.wall} />
              <Circle cx={ROOF.w / 2} cy={ROOF.h * 0.52} r={7.5} fill={ART.glow} opacity={0.9} />
            </Piece>

            {/* Moka */}
            <Animated.View
              style={{
                position: 'absolute',
                left: SW - MOKA - 4,
                top: GROUND - MOKA + 12,
                width: MOKA,
                height: MOKA,
                opacity: v.moka.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1] }),
                transform: [{ translateY: lerp(v.moka, 34, 0) }, { scale: lerp(v.moka, 0.4, 1) }],
                transformOrigin: 'bottom',
              }}
            >
              <Image source={require('../../assets/splash-moka.png')} style={{ width: MOKA, height: MOKA }} resizeMode="contain" />
            </Animated.View>

            {/* Parıltılar */}
            {([[24, 70, 22, ART.sun], [222, 40, 18, ART.peachDeep], [270, 98, 14, ART.sun], [36, 168, 12, ART.peachDeep]] as const).map(([x, y, s, c], i) => {
              const p = v.spark[i]!;
              return (
                <Sparkle
                  key={i}
                  x={x}
                  y={y}
                  s={s}
                  color={c}
                  style={{
                    opacity: p.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0, 1, 1, 0.85] }),
                    transform: [{ scale: p.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0.1, 1.3, 1] }) }, { rotate: p.interpolate({ inputRange: [0, 1], outputRange: ['-45deg', '0deg'] }) }],
                  }}
                />
              );
            })}
          </View>

          {/* Logo */}
          <Animated.View style={{ opacity: v.logo, transform: [{ translateY: lerp(v.logo, 18, 0) }, { scale: lerp(v.logo, 0.94, 1) }] }}>
            <Image source={require('../../assets/logo-yatay.png')} style={{ width: logoW, height: logoW / 3 }} resizeMode="contain" accessibilityLabel="Homezy" />
          </Animated.View>
        </Animated.View>

        <Text style={[st.skip, { color: brand.cocoa }]}>{isEn() ? 'Skip' : 'Geç'}</Text>
      </Pressable>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  root: { zIndex: 100, elevation: 100 },
  fill: { flex: 1 },
  center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  skip: { position: 'absolute', right: 24, bottom: 40, fontFamily: fonts.bodyBold, fontSize: 14, opacity: 0.7 },
});
