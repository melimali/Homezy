import type { ImageSourcePropType } from 'react-native';

import type { RoomType } from '@/domain/types';

/** İzometrik oda resimleri (assets/rooms, 740×640). Oda kartlarında Moka sahnesinin yerine geçer. */
export const ROOM_ART: Record<RoomType, ImageSourcePropType> = {
  yatak: require('../../assets/rooms/yatak.jpg'),
  mutfak: require('../../assets/rooms/mutfak.jpg'),
  banyo: require('../../assets/rooms/banyo.jpg'),
  salon: require('../../assets/rooms/salon.jpg'),
  calisma: require('../../assets/rooms/calisma.jpg'),
  cocuk: require('../../assets/rooms/cocuk.jpg'),
  balkon: require('../../assets/rooms/balkon.jpg'),
  antre: require('../../assets/rooms/antre.jpg'),
  camasir: require('../../assets/rooms/camasir.jpg'),
};
