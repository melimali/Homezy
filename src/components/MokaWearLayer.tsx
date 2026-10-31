import { StyleSheet, Text, View } from 'react-native';

import { wearOf } from '@/domain/mokaWear';
import { useStore } from '@/store/AppStore';

/** Moka resminin üstüne giydirilen aksesuar. `size`: Moka resminin kenarı (px). Seçili yoksa hiçbir şey çizmez. */
export function MokaWearLayer({ size }: { size: number }) {
  const { state } = useStore();
  const w = wearOf(state.play.wear);
  if (!w) return null;
  const fs = size * (w.at === 'neck' ? 0.3 : 0.26);
  const pos = w.at === 'top' ? { top: size * 0.04, left: size * 0.34 } : w.at === 'neck' ? { top: size * 0.5, left: size * 0.34 } : { top: size * 0.1, left: size * 0.58 };
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={[{ position: 'absolute', fontSize: fs, lineHeight: fs * 1.15 }, pos]}>{w.emoji}</Text>
    </View>
  );
}
