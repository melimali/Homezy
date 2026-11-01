import { useState, type ReactNode } from 'react';
import { Image, View, type DimensionValue, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Moka sahnesi (arka plan + Moka). Kutunun genişliği ölçülür, yüksekliği oranla ya da `height` ile
 * sabitlenir; resim kutuyu kaplar (cover) ve taşmaz. `width: 100%` + `aspectRatio` bazı Android
 * sürümlerinde resmi kendi boyutunda çizdiği için ölçerek çiziliyor.
 */
export function SceneImage({
  source, ratio = 4 / 3, height, radius = 0, style, children,
}: { source: ImageSourcePropType; ratio?: number; height?: number; radius?: number; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const [w, setW] = useState(0);
  const h = height ?? (w ? Math.round(w / ratio) : 0);
  return (
    <View
      onLayout={e => setW(Math.round(e.nativeEvent.layout.width))}
      style={[{ alignSelf: 'stretch', height: h || undefined, aspectRatio: h ? undefined : ratio, borderRadius: radius, overflow: 'hidden' }, style]}
    >
      {w > 0 && h > 0 && (
        <Image source={source} style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }} resizeMode="cover" accessibilityIgnoresInvertColors />
      )}
      {children}
    </View>
  );
}

/**
 * Sahnenin üstünü ya da altını zemin rengine yumuşakça karıştırır (ince şeritler, artan opaklık).
 * SVG gradyanı web önizlemesinde kutuyu tam kaplamadığı için düz View şeritleriyle çiziliyor.
 */
export function Fade({ edge, color, size, from = 0, to = 1 }: { edge: 'top' | 'bottom'; color: string; size: DimensionValue; from?: number; to?: number }) {
  const N = 14;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, height: size, [edge]: 0, flexDirection: edge === 'top' ? 'column-reverse' : 'column' }}>
      {Array.from({ length: N }, (_, i) => {
        const t = (i + 1) / N;
        return <View key={i} style={{ flex: 1, backgroundColor: color, opacity: from + (to - from) * t * t }} />;
      })}
    </View>
  );
}
