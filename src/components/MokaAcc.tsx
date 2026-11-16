import { Image, View, type ImageSourcePropType } from 'react-native';

import { MOKA_ACC, NECK_POSES, type AccId } from '@/constants/moka-acc';
import { FUR_ASSETS } from '@/constants/moka-fur-assets';
import { LOOK_POSES } from '@/constants/moka-look';

/** Moka resminin üstüne aksesuar katmanı. `size` Moka resminin kenarı; yerleşim 512 tuvale göre ölçeklenir. */
export function MokaAccLayer({ pose, size, id }: { pose: string; size: number; id?: string | null }) {
  const a = id ? MOKA_ACC[id as AccId] : undefined;
  const o = LOOK_POSES[pose];
  if (!a || !o) return null;
  if (a.kind === 'boyun' && !NECK_POSES.includes(pose)) return null;
  const k = size / 512;
  const s = a.kind === 'boyun' ? 1 : o.s;
  const w = a.w * s * k;
  const h = (a.w / a.ratio) * s * k;
  const cx = (a.cx + (a.kind === 'boyun' ? 0 : o.dx)) * k;
  const cy = (a.cy + (a.kind === 'yuz' ? o.fy : a.kind === 'bas' ? o.dy : 0)) * k;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, overflow: 'visible' }}>
      <Image
        source={a.src}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
        style={{ position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h, transform: [{ rotate: `${a.rot}deg` }] }}
      />
    </View>
  );
}

/** Kürk rengi: kişiselleştirilmiş resim varsa onu, yoksa verilen özgün resmi döndürür. */
export function furSource(fur: string | null | undefined, pose: string, fallback: ImageSourcePropType): ImageSourcePropType {
  return (fur && FUR_ASSETS[fur]?.[pose]) || fallback;
}

/** Tek Moka: poz + kürk rengi + aksesuar. Kişiselleştirme yalnızca LOOK_POSES pozlarında görünür. */
export function MokaAvatar({ pose, size, fur, acc, base }: { pose: string; size: number; fur?: string | null; acc?: string | null; base: ImageSourcePropType }) {
  return (
    <View style={{ width: size, height: size }}>
      <Image source={furSource(fur, pose, base)} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors />
      <MokaAccLayer pose={pose} size={size} id={acc} />
    </View>
  );
}
