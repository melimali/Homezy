import type { ImageSourcePropType } from 'react-native';
import type { RoomType } from '@/domain/types';

/** Moka koltuğun minderinde oturur; ana ekranda ve salon kartında kullanılır. */
export const HOME_MOKA_SCENE: ImageSourcePropType = require('../../assets/scenes/home_moka_sofa.jpg');
export const HOME_SOFA_BACKGROUND: ImageSourcePropType = require('../../assets/arkaplan/salon_kanepe2.jpg');
export const HOME_MOKA_KITCHEN_BACKGROUND: ImageSourcePropType = require('../../assets/arkaplan/mutfak_ocak.jpg');
export const HOME_MOKA_STUDY_BACKGROUND: ImageSourcePropType = require('../../assets/arkaplan/calisma_masasi.jpg');
export const HOME_MOKA_SEATED: ImageSourcePropType = require('../../assets/moka/moka_home_seated.png');

const ROOM_MOKA_SCENES: Partial<Record<RoomType, ImageSourcePropType>> = {
  salon: HOME_MOKA_SCENE,
  mutfak: require('../../assets/scenes/room_moka_kitchen.jpg'),
  yatak: require('../../assets/scenes/room_moka_bedroom.jpg'),
  banyo: require('../../assets/scenes/room_moka_bathroom.jpg'),
  calisma: require('../../assets/scenes/room_moka_study.jpg'),
  antre: require('../../assets/scenes/room_moka_entry.jpg'),
  balkon: require('../../assets/scenes/room_moka_balcony.jpg'),
  camasir: require('../../assets/scenes/room_moka_laundry.jpg'),
};

export function roomMokaScene(type: RoomType, fallback?: ImageSourcePropType) {
  return ROOM_MOKA_SCENES[type] ?? fallback;
}
