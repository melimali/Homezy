import type { ImageSourcePropType } from 'react-native';

import type { RoomType } from '@/domain/types';

/** İzometrik oda resimleri (assets/rooms, 740×640). Oda kartlarında Moka sahnesinin yerine geçer. */
export const ROOM_ART: Record<RoomType, ImageSourcePropType> = {
  yatak: require('../../assets/rooms/yatak.webp'),
  mutfak: require('../../assets/rooms/mutfak.webp'),
  banyo: require('../../assets/rooms/banyo.webp'),
  salon: require('../../assets/rooms/salon.webp'),
  calisma: require('../../assets/rooms/calisma.webp'),
  cocuk: require('../../assets/rooms/cocuk.webp'),
  balkon: require('../../assets/rooms/balkon.webp'),
  antre: require('../../assets/rooms/antre.webp'),
  camasir: require('../../assets/rooms/camasir.webp'),
};
