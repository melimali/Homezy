import { Animated, Image, StyleSheet, View } from 'react-native';
import { MOKA_ASSETS } from '@/constants/moka';

const SIZE = 150;
const MAX = 260;
const STEP = 20;

// Aşağı çekince açılan boşlukta Moka: kenara tutunup ekranı yukarı çekmeye çalışır.
// Hepsi kaydırma değerinden (y < 0) hesaplanır; yerel sürücü, JS'e uğramaz.
export function PullMoka({ y, hop }: { y: Animated.Value; hop: Animated.Value }) {
  const pts: number[] = [];
  const shake: number[] = [];
  const rot: number[] = [];
  for (let v = -MAX; v <= 0; v += STEP) {
    const k = Math.min(1, -v / 120);
    const i = (v + MAX) / STEP;
    pts.push(v);
    shake.push((i % 2 ? 1 : -1) * 5 * k);
    rot.push((i % 2 ? 1 : -1) * 4 * k);
  }
  // Moka içeriğin üst kenarında durur: boşluk büyüdükçe birlikte iner.
  const ride = y.interpolate({ inputRange: [-600, 0, 600], outputRange: [600 - SIZE + 6, -SIZE + 6, -600 - SIZE + 6] });
  const ty = Animated.add(ride, hop);
  const scale = y.interpolate({ inputRange: [-MAX, -40, 0], outputRange: [1.18, 1, 0.9], extrapolate: 'clamp' });
  const tx = y.interpolate({ inputRange: pts, outputRange: shake, extrapolate: 'clamp' });
  const rotate = y.interpolate({ inputRange: pts, outputRange: rot.map(r => `${r}deg`), extrapolate: 'clamp' });
  const strain = y.interpolate({ inputRange: [-150, -70], outputRange: [1, 0], extrapolate: 'clamp' });
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View style={{ width: SIZE, height: SIZE, transform: [{ translateY: ty }, { translateX: tx }, { rotate }, { scale }] }}>
        <Image source={MOKA_ASSETS.sassy} style={styles.img} resizeMode="contain" accessibilityIgnoresInvertColors />
        <Animated.Image source={MOKA_ASSETS.panicked} style={[styles.img, { opacity: strain }]} resizeMode="contain" accessibilityIgnoresInvertColors />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  img: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
});
