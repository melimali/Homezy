import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

import { useReduceMotion } from '@/components/motion';

/**
 * Moka'nın çerçeve animasyonu (assets/moka/anim): 4 karelik yürüyüş döngüsü ve dört duygu hali.
 * Saf Image + Animated; yeni native modül yok. "Hareketi azalt" açıksa kare değişmez, zıplama durur.
 */
const WALK = [
  require('../../assets/moka/anim/walk_0.webp'),
  require('../../assets/moka/anim/walk_1.webp'),
  require('../../assets/moka/anim/walk_2.webp'),
  require('../../assets/moka/anim/walk_3.webp'),
];
const MOODS = {
  happy: require('../../assets/moka/anim/mood_happy.webp'),
  yawn: require('../../assets/moka/anim/mood_yawn.webp'),
  sleepy: require('../../assets/moka/anim/mood_sleepy.webp'),
  party: require('../../assets/moka/anim/mood_party.webp'),
};

export type SpriteMood = keyof typeof MOODS;
/** `walk`: yürüyüş döngüsü; diğerleri duygu hali (geçişte hafif "pop"). */
export type SpriteAnim = 'walk' | SpriteMood;

export function MokaSprite({ anim = 'happy', size = 120, flip = false, bounce = true }: { anim?: SpriteAnim; size?: number; flip?: boolean; bounce?: boolean }) {
  const reduce = useReduceMotion();
  const [frame, setFrame] = useState(0);
  const pop = useRef(new Animated.Value(1)).current;
  const bob = useRef(new Animated.Value(0)).current;

  // Yürüyüş: ~7 kare/sn.
  useEffect(() => {
    if (anim !== 'walk' || reduce) { setFrame(0); return; }
    const t = setInterval(() => setFrame(f => (f + 1) % WALK.length), 140);
    return () => clearInterval(t);
  }, [anim, reduce]);

  // Duygu geçişi: küçülüp yaylanarak büyür.
  useEffect(() => {
    if (reduce) return;
    pop.setValue(0.88);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }).start();
  }, [anim, pop, reduce]);

  // Hafif zıplama (idle): yürürken adımla birlikte, durağanken yavaş nefes.
  useEffect(() => {
    if (reduce || !bounce) { bob.setValue(0); return; }
    const walking = anim === 'walk';
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: -size * (walking ? 0.03 : 0.04), duration: walking ? 280 : 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: walking ? 280 : 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [anim, bounce, bob, reduce, size]);

  const src = anim === 'walk' ? WALK[frame] : MOODS[anim];
  return (
    <View style={{ width: size, height: size, overflow: 'hidden' }} accessibilityIgnoresInvertColors>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: bob }, { scale: pop }, { scaleX: flip ? -1 : 1 }] }]}>
        <Image source={src} style={{ width: size, height: size }} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}
