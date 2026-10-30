import { Component, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, useColors, useIsDark } from '@/theme';

// expo-blur yerel modül: Expo Go / eski derlemede yoksa require ya da çizim patlar; o zaman düz yarı saydam yüzey.
let BlurView: React.ComponentType<any> | null = null;
if (Platform.OS !== 'web') {
  try {
    BlurView = require('expo-blur').BlurView; // eslint-disable-line @typescript-eslint/no-require-imports
  } catch {
    BlurView = null;
  }
}

class Safe extends Component<{ children: ReactNode }, { bad: boolean }> {
  state = { bad: false };
  static getDerivedStateFromError() {
    return { bad: true };
  }
  render() {
    return this.state.bad ? null : this.props.children;
  }
}

type Props = {
  children?: React.ReactNode;
  intensity?: number;
  style?: StyleProp<ViewStyle>;
};

/** Buzlu cam kart: arkadaki renkleri bulanıklaştırır, ince açık kenar ve yumuşak gölge. Web'de düz yarı saydam yüzey. */
export function Glass({ children, intensity = 40, style }: Props) {
  const c = useColors();
  const dark = useIsDark();
  const tint = dark ? 'rgba(51,58,79,0.45)' : 'rgba(255,254,250,0.55)';
  const edge = dark ? 'rgba(235,245,238,0.18)' : 'rgba(255,255,255,0.75)';
  return (
    <View style={[styles.wrap, { borderColor: edge, shadowColor: c.shadow }, style]}>
      {BlurView && (
        <Safe>
          <BlurView
            pointerEvents="none"
            intensity={intensity}
            tint={dark ? 'dark' : 'light'}
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
        </Safe>
      )}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 18,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 2,
  },
});
