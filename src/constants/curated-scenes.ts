import type { ImageSourcePropType } from 'react-native';
import type { RoomType } from '@/domain/types';

/** Moka koltuğun minderinde oturur; ana ekranda ve salon kartında kullanılır. */
export const HOME_MOKA_SCENE: ImageSourcePropType = require('../../assets/scenes/home_moka_sofa.webp');
export const HOME_MOKA_KITCHEN_SCENE: ImageSourcePropType = require('../../assets/scenes/room_moka_kitchen.webp');
export const HOME_MOKA_BAKING_SCENE: ImageSourcePropType = require('../../assets/scenes/moka_cookie.webp');
export const HOME_MOKA_STUDY_SCENE: ImageSourcePropType = require('../../assets/scenes/room_moka_study.webp');
export const HOME_SOFA_BACKGROUND: ImageSourcePropType = require('../../assets/arkaplan/salon_kanepe2.webp');
export const HOME_MOKA_KITCHEN_BACKGROUND: ImageSourcePropType = require('../../assets/arkaplan/mutfak_ocak.webp');
export const HOME_MOKA_STUDY_BACKGROUND: ImageSourcePropType = require('../../assets/arkaplan/calisma_masasi.webp');
export const HOME_MOKA_SEATED: ImageSourcePropType = require('../../assets/moka/moka_home_seated.webp');

const ROOM_MOKA_SCENES: Partial<Record<RoomType, ImageSourcePropType>> = {
  salon: HOME_MOKA_SCENE,
  mutfak: require('../../assets/scenes/room_moka_kitchen.webp'),
  yatak: require('../../assets/scenes/room_moka_bedroom.webp'),
  banyo: require('../../assets/scenes/room_moka_bathroom.webp'),
  calisma: require('../../assets/scenes/room_moka_study.webp'),
  antre: require('../../assets/scenes/room_moka_entry.webp'),
  balkon: require('../../assets/scenes/room_moka_balcony.webp'),
  camasir: require('../../assets/scenes/room_moka_laundry.webp'),
};

export function roomMokaScene(type: RoomType, fallback?: ImageSourcePropType) {
  return ROOM_MOKA_SCENES[type] ?? fallback;
}
