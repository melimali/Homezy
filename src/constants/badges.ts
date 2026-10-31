import type { ImageSourcePropType } from 'react-native';

export type BadgeArt = 'seri' | 'ilk' | 'takvim' | 'filiz' | 'ev' | 'kus' | 'el' | 'yildiz';

/** Başarım rozetleri (assets/badges, 256×256, şeffaf). */
export const BADGE_ART: Record<BadgeArt, ImageSourcePropType> = {
  seri: require('../../assets/badges/seri.png'),
  ilk: require('../../assets/badges/ilk.png'),
  takvim: require('../../assets/badges/takvim.png'),
  filiz: require('../../assets/badges/filiz.png'),
  ev: require('../../assets/badges/ev.png'),
  kus: require('../../assets/badges/kus.png'),
  el: require('../../assets/badges/el.png'),
  yildiz: require('../../assets/badges/yildiz.png'),
};
