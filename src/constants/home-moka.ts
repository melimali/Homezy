import type { ImageSourcePropType } from 'react-native';

/** Ana ekranda beyaz çıkartma halesi bulunmayan, temizlenmiş Moka pozları. */
export type HomeMokaPose = 'panicked' | 'laptop' | 'baking' | 'dishes' | 'thumbs_up' | 'happy';

export const HOME_MOKA_ASSETS: Record<HomeMokaPose, ImageSourcePropType> = {
  panicked: require('../../assets/moka/moka_panicked_clean.webp'),
  laptop: require('../../assets/moka/moka_laptop_clean.webp'),
  baking: require('../../assets/moka/moka_baking_clean.webp'),
  dishes: require('../../assets/moka/moka_dishes_clean.webp'),
  thumbs_up: require('../../assets/moka/moka_thumbs_up_clean.webp'),
  happy: require('../../assets/moka/moka_happy_clean.webp'),
};
