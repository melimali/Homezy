import { Image, View, type ImageSourcePropType } from 'react-native';

import { FUR_ASSETS } from '@/constants/moka-fur-assets';

/** Kürk rengi: kişiselleştirilmiş resim varsa onu, yoksa verilen özgün resmi döndürür. */
export function furSource(fur: string | null | undefined, pose: string, fallback: ImageSourcePropType): ImageSourcePropType {
  return (fur && FUR_ASSETS[fur]?.[pose]) || fallback;
}

/** Tek Moka: poz + kürk rengi. Kürk rengi `FUR_ASSETS`'te üretilmiş pozlarda görünür, diğerlerinde özgün resim. */
export function MokaAvatar({ pose, size, fur, base }: { pose: string; size: number; fur?: string | null; base: ImageSourcePropType }) {
  return (
    <View style={{ width: size, height: size }}>
      <Image source={furSource(fur, pose, base)} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  );
}
