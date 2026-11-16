import { Animated, Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

const POSES: ImageSourcePropType[] = [
  require('../../assets/moka/pull/pull_1.webp'),
  require('../../assets/moka/pull/pull_2.webp'),
  require('../../assets/moka/pull/pull_3.webp'),
  require('../../assets/moka/pull/pull_4.webp'),
];
const W = 210;
const H = Math.round((W * 297) / 341);
const MAX = 280;
const STEP = 20;

// Aşağı çekince açılan boşlukta Moka: kenara tutunup ekranı yukarı çekmeye çalışır.
// Poz, titreme, kolların uzaması, kızarma ve öfke işareti çekme miktarından (y < 0) hesaplanır;
// hepsi yerel sürücüyle çalışır, JS'e uğramaz.
export function PullMoka({ y, hop }: { y: Animated.Value; hop: Animated.Value }) {
  const pts: number[] = [];
  const shake: number[] = [];
  const rot: number[] = [];
  const pulse: number[] = [];
  for (let v = -MAX; v <= 0; v += STEP) {
    const k = Math.min(1, -v / 120);
    const i = (v + MAX) / STEP;
    pts.push(v);
    shake.push((i % 2 ? 1 : -1) * 5 * k);
    rot.push((i % 2 ? 1 : -1) * 4 * k);
    pulse.push(i % 2 ? 1.25 : 0.9);
  }
  const ride = y.interpolate({ inputRange: [-600, 0, 600], outputRange: [600 - H + 4, -H + 4, -600 - H + 4] });
  const ty = Animated.add(ride, hop);
  const tx = y.interpolate({ inputRange: pts, outputRange: shake, extrapolate: 'clamp' });
  const rotate = y.interpolate({ inputRange: pts, outputRange: rot.map(r => `${r}deg`), extrapolate: 'clamp' });
  // Kollar uzar: alt kenar sabit kalır, gövde yukarı gerilir.
  const sy = y.interpolate({ inputRange: [-MAX, -30, 0], outputRange: [1.3, 1.04, 1], extrapolate: 'clamp' });
  const anchor = Animated.multiply(Animated.add(sy, -1), -H / 2);
  const op = (inp: number[], out: number[]) => y.interpolate({ inputRange: inp, outputRange: out, extrapolate: 'clamp' });
  const ops = [
    op([-60, -40], [0, 1]),
    op([-130, -110, -60, -40], [0, 1, 1, 0]),
    op([-270, -240, -130, -110], [0, 1, 1, 0]),
    op([-270, -240], [1, 0]),
  ];
  const blush = op([-20, -200], [0, 0.6]);
  const anger = op([-110, -160], [0, 1]);
  const angerScale = y.interpolate({ inputRange: pts, outputRange: pulse, extrapolate: 'clamp' });
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View style={{ width: W, height: H, transform: [{ translateY: ty }, { translateX: tx }, { rotate }] }}>
        <Animated.View style={{ width: W, height: H, transform: [{ translateY: anchor }, { scaleY: sy }] }}>
          {POSES.map((src, i) => (
            <Animated.Image key={i} source={src} style={[styles.img, i === 0 ? null : { opacity: ops[i] }]} resizeMode="contain" accessibilityIgnoresInvertColors />
          ))}
          {/* Yanaklar çekildikçe kızarır */}
          <Animated.View style={[styles.cheek, { left: '17%', opacity: blush }]} />
          <Animated.View style={[styles.cheek, { right: '17%', opacity: blush }]} />
        </Animated.View>
        <Animated.View style={[styles.anger, { opacity: anger, transform: [{ scale: angerScale }] }]}>
          <Text style={styles.angerTxt}>💢</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  img: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  cheek: { position: 'absolute', top: '46%', width: '17%', height: '15%', borderRadius: 40, backgroundColor: '#E5574A' },
  anger: { position: 'absolute', top: -2, right: 6 },
  angerTxt: { fontSize: 26 },
});
