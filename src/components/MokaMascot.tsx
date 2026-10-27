import { useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Float, useReduceMotion } from '@/components/motion';
import { MOKA_ASSETS, type MokaPose } from '@/constants/moka';
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
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Maskot Moka ve yanında konuşma balonu. Dokununca zıplayıp sallanır. */
export function MokaMascot({ pose, title, message, tip, size = 'md', showBubble = true, onPress, style }: Props) {
  const c = useColors();
  const reduce = useReduceMotion();
  const [hop] = useState(() => new Animated.Value(0));
  const px = SIZE[size];
  const bubble = showBubble && !!(title || message || tip);

  const bounce = () => {
    sfx('tap');
    onPress?.();
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
      accessibilityRole="button"
      accessibilityLabel={['Moka', title, message, tip && `Günün cümlesi: ${tip}`].filter(Boolean).join('. ')}
      style={[styles.row, size === 'lg' && styles.col, style]}
    >
      <Float amp={size === 'sm' ? 2 : 4} dur={2200}>
        <Animated.View style={{ transform }}>
          <Image source={MOKA_ASSETS[pose]} style={{ width: px, height: px }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </Animated.View>
      </Float>
      {bubble && (
        <View style={[styles.bubble, size === 'lg' && styles.bubbleLg, { backgroundColor: c.surface }]}>
          <View
            style={[
              styles.tail,
              size === 'lg' ? styles.tailTop : styles.tailLeft,
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
  bubble: { flex: 1, borderRadius: radius.card, paddingHorizontal: 20, paddingVertical: 16, gap: 4 },
  bubbleLg: { flex: 0, alignSelf: 'stretch' },
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
