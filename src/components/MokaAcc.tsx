import { Image, View } from 'react-native';

import { ACC_POSES, MOKA_ACC, type AccId } from '@/constants/moka-acc';

/** Moka resminin üstüne aksesuar katmanı. `size` Moka resminin kenarı; yerleşim 512 tuvale göre ölçeklenir. */
export function MokaAccLayer({ pose, size, id }: { pose: string; size: number; id?: string | null }) {
  const a = id ? MOKA_ACC[id as AccId] : undefined;
  if (!a || !ACC_POSES.includes(pose)) return null;
  const k = size / 512;
  const w = a.w * k;
  const h = (a.w / a.ratio) * k;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, overflow: 'visible' }}>
      <Image
        source={a.src}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
        style={{ position: 'absolute', left: a.cx * k - w / 2, top: a.cy * k - h / 2, width: w, height: h, transform: [{ rotate: `${a.rot}deg` }] }}
      />
    </View>
  );
}
