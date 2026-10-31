import type { ImageSourcePropType } from 'react-native';

/** Ana ekranda beyaz çıkartma halesi bulunmayan, temizlenmiş Moka pozları. */
export type HomeMokaPose = 'panicked' | 'laptop' | 'baking' | 'dishes' | 'thumbs_up' | 'happy';

export const HOME_MOKA_ASSETS: Record<HomeMokaPose, ImageSourcePropType> = {
  panicked: require('../../assets/moka/moka_panicked_clean.png'),
  laptop: require('../../assets/moka/moka_laptop_clean.png'),
  baking: require('../../assets/moka/moka_baking_clean.png'),
  dishes: require('../../assets/moka/moka_dishes_clean.png'),
  thumbs_up: require('../../assets/moka/moka_thumbs_up_clean.png'),
  happy: require('../../assets/moka/moka_happy_clean.png'),
};
