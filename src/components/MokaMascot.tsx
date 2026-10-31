import { useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Float, useReduceMotion } from '@/components/motion';
import { MokaLive, timePose, type MokaLiveHandle } from '@/components/MokaLive';
import { SceneImage } from '@/components/SceneImage';
import { MOKA_ASSETS, type MokaPose } from '@/constants/moka';
import { POSE_SCENES } from '@/constants/scenes';
import { checkinOf, feelOf } from '@/domain/mood';
import { useStore } from '@/store/AppStore';
import { sfx } from '@/lib/sfx';
import { fonts, radius, useColors } from '@/theme';

const SIZE = { sm: 72, md: 120, lg: 176 } as const;

type Props = {
  pose: MokaPose;
  title?: string;
  message?: string;
  /** Günün cümlesi: balonun altında ayrı satır. */
  tip?: string;
  size?: keyof typeof SIZE;
  /** Konuşma balonu (başlık ya da mesaj varsa). Varsayılan açık. */
  showBubble?: boolean;
  /** Pozun sahnesi varsa (arka plan + Moka) sticker yerine büyük sahne kartı. */
  scene?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Maskot Moka ve yanında konuşma balonu. Dokununca zıplayıp sallanır. */
export function MokaMascot({ pose, title, message, tip, size = 'md', showBubble = true, scene, onPress, style }: Props) {
  const c = useColors();
  const reduce = useReduceMotion();
  const [hop] = useState(() => new Animated.Value(0));
  const { state } = useStore();
  const ci = checkinOf(state.play);
  // Sakin pozlarda bugünkü ruh hali yüzü belirler.
  const shown = ci && 'feel' in ci && (pose === 'happy' || pose === 'wink') ? feelOf(ci.feel).pose : pose;
  const live = useRef<MokaLiveHandle | null>(null);
  const px = SIZE[size];
  const bubble = showBubble && !!(title || message || tip);
  const sceneSrc = scene ? POSE_SCENES[pose] : undefined;
  const wide = !!sceneSrc;

  const bounce = () => {
    sfx('tap');
    onPress?.();
    live.current?.tickle();
    if (reduce) return;
    hop.setValue(0);
    Animated.sequence([
      Animated.timing(hop, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(hop, { toValue: 0, friction: 3, tension: 160, useNativeDriver: true }),
    ]).start();
  };

  const transform = [
    { translateY: hop.interpolate({ inputRange: [0, 1], outputRange: [0, -px * 0.12] }) },
    { scale: hop.interpolate({ inputRange: [-0.3, 0, 1], outputRange: [0.94, 1, 1.12] }) },
    { rotate: hop.interpolate({ inputRange: [-0.3, 0, 1], outputRange: ['3deg', '0deg', '-6deg'] }) },
  ];

  return (
    <Pressable
      onPress={bounce}
      onLongPress={() => live.current?.cuddle()}
      accessibilityRole="button"
      accessibilityLabel={['Moka', title, message, tip && `Günün cümlesi: ${tip}`].filter(Boolean).join('. ')}
      style={[styles.row, (size === 'lg' || wide) && styles.col, wide && { gap: 0 }, style]}
    >
      {sceneSrc ? (
        <Animated.View style={[styles.scene, { backgroundColor: c.surface, transform: [{ scale: hop.interpolate({ inputRange: [-0.3, 0, 1], outputRange: [0.98, 1, 1.03] }) }] }]}>
          <SceneImage source={sceneSrc} />
        </Animated.View>
      ) : (
        <Float amp={size === 'sm' ? 2 : 4} dur={2200}>
          <Animated.View style={{ transform }}>
            <MokaLive size={px} handleRef={live} weather={size !== 'sm'}>
              <Image source={MOKA_ASSETS[timePose(shown)]} style={{ width: px, height: px }} resizeMode="contain" accessibilityIgnoresInvertColors />
            </MokaLive>
          </Animated.View>
        </Float>
      )}
      {bubble && (
        <View style={[styles.bubble, (size === 'lg' || wide) && styles.bubbleLg, wide && styles.bubbleScene, { backgroundColor: c.surface }]}>
          <View
            style={[
              styles.tail,
              size === 'lg' || wide ? styles.tailTop : styles.tailLeft,
              { backgroundColor: c.surface },
            ]}
          />
          {!!title && <Text style={[styles.title, size === 'sm' && styles.titleSm, { color: c.ink }]}>{title}</Text>}
          {!!message && <Text style={[styles.msg, size === 'sm' && styles.msgSm, { color: c.muted }]}>{message}</Text>}
          {!!tip && (
            <View style={[styles.tip, !!(title || message) && { marginTop: 10 }]}>
              <Text style={[styles.tipHead, { color: c.hi }]}>Günün cümlesi</Text>
              <Text style={[styles.tipText, size === 'sm' && styles.msgSm, { color: c.ink }]}>{tip}</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  col: { flexDirection: 'column', alignItems: 'center', gap: 18 },
  scene: { alignSelf: 'stretch', borderRadius: radius.card, overflow: 'hidden' },
  bubble: { flex: 1, borderRadius: radius.card, paddingHorizontal: 20, paddingVertical: 16, gap: 4 },
  bubbleLg: { flex: 0, alignSelf: 'stretch' },
  bubbleScene: { marginTop: -28, marginHorizontal: 12 },
  tail: { position: 'absolute', width: 16, height: 16, borderRadius: 3, transform: [{ rotate: '45deg' }] },
  tailLeft: { left: -6, top: '50%', marginTop: -8 },
  tailTop: { top: -6, left: '50%', marginLeft: -8 },
  title: { fontFamily: fonts.displayBold, fontSize: 19, lineHeight: 24, letterSpacing: -0.2 },
  titleSm: { fontSize: 16, lineHeight: 20 },
  msg: { fontFamily: fonts.bodyBold, fontSize: 14.5, lineHeight: 21 },
  msgSm: { fontSize: 13, lineHeight: 18 },
  tip: { gap: 3 },
  tipHead: { fontFamily: fonts.bodyBlack, fontSize: 11.5, letterSpacing: 1.4, textTransform: 'uppercase' },
  tipText: { fontFamily: fonts.bodyBlack, fontSize: 14.5, lineHeight: 21 },
});
