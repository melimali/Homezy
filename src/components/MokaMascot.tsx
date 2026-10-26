import { useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Float, useReduceMotion } from '@/components/motion';
import { MOKA_ASSETS, type MokaPose } from '@/constants/moka';
import { sfx } from '@/lib/sfx';
import { fonts, radius, useColors } from '@/theme';

const SIZE = { sm: 64, md: 104, lg: 156 } as const;

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
        <View style={[styles.bubble, size === 'lg' && styles.bubbleLg, { backgroundColor: c.surface, borderColor: c.line, boxShadow: `0 3px 0 ${c.line}` }]}>
          <View
            style={[
              styles.tail,
              size === 'lg' ? styles.tailTop : styles.tailLeft,
              { backgroundColor: c.surface, borderColor: c.line },
            ]}
          />
          {!!title && <Text style={[styles.title, size === 'sm' && styles.titleSm, { color: c.ink }]}>{title}</Text>}
          {!!message && <Text style={[styles.msg, size === 'sm' && styles.msgSm, { color: c.muted }]}>{message}</Text>}
          {!!tip && (
            <View style={[styles.tip, !!(title || message) && { borderTopWidth: 1.5, borderTopColor: c.line, marginTop: 6, paddingTop: 8 }]}>
              <Text style={[styles.tipHead, { color: c.today }]}>💬 Günün cümlesi</Text>
              <Text style={[styles.tipText, size === 'sm' && styles.msgSm, { color: c.ink }]}>{tip}</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  col: { flexDirection: 'column', gap: 14 },
  bubble: { flex: 1, borderWidth: 1.5, borderRadius: radius.tile, paddingHorizontal: 14, paddingVertical: 11, gap: 3 },
  bubbleLg: { flex: 0, alignSelf: 'stretch' },
  tail: { position: 'absolute', width: 14, height: 14, borderWidth: 1.5, transform: [{ rotate: '45deg' }] },
  tailLeft: { left: -8, top: '50%', marginTop: -7, borderTopWidth: 0, borderRightWidth: 0 },
  tailTop: { top: -8, alignSelf: 'center', left: '50%', marginLeft: -7, borderBottomWidth: 0, borderRightWidth: 0 },
  title: { fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 22 },
  titleSm: { fontSize: 15, lineHeight: 19 },
  msg: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  msgSm: { fontSize: 13, lineHeight: 18 },
  tip: { gap: 2 },
  tipHead: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase' },
  tipText: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 20 },
});
