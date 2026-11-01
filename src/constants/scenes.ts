import type { ImageSourcePropType } from 'react-native';

import type { MokaPose } from '@/constants/moka';
import type { RoomType } from '@/domain/types';

/**
 * Moka sahneleri: arka plan + Moka stickerı tek görselde (1280×960). Bu dosya
 * `python3 scripts/make-scenes.py build` ile üretilir, elle değiştirme; eşleştirme scripts/scenes.json.
 * Sahnesi olmayan poz ya da oda için ekranlar eski görünüme (sticker / emoji) döner.
 */
export const POSE_SCENES: Partial<Record<MokaPose, ImageSourcePropType>> = {
  happy: require('../../assets/scenes/moka_happy.jpg'),
  sleepy: require('../../assets/scenes/moka_sleepy.jpg'),
  shocked: require('../../assets/scenes/moka_shocked.jpg'),
  analyzing: require('../../assets/scenes/moka_analyzing.jpg'),
  sassy: require('../../assets/scenes/moka_sassy.jpg'),
  party: require('../../assets/scenes/moka_party.jpg'),
  cozy_plant: require('../../assets/scenes/moka_cozy_plant.jpg'),
  chef: require('../../assets/scenes/moka_chef.jpg'),
  wink: require('../../assets/scenes/moka_wink.jpg'),
  panicked: require('../../assets/scenes/moka_panicked.jpg'),
  begging: require('../../assets/scenes/moka_begging.jpg'),
  blanket: require('../../assets/scenes/moka_blanket.jpg'),
  sweeping: require('../../assets/scenes/moka_sweeping.jpg'),
  dusting: require('../../assets/scenes/moka_dusting.jpg'),
  laundry: require('../../assets/scenes/moka_laundry.jpg'),
  mirror: require('../../assets/scenes/moka_mirror.jpg'),
  dishes: require('../../assets/scenes/moka_dishes.jpg'),
  maintenance: require('../../assets/scenes/moka_maintenance.jpg'),
  plants: require('../../assets/scenes/moka_plants.jpg'),
  trash: require('../../assets/scenes/moka_trash.jpg'),
  rest: require('../../assets/scenes/moka_rest.jpg'),
  checklist: require('../../assets/scenes/moka_checklist.jpg'),
  vacuuming: require('../../assets/scenes/moka_vacuuming.jpg'),
  sparkling_complete: require('../../assets/scenes/moka_sparkling_complete.jpg'),
  cheers: require('../../assets/scenes/moka_cheers.jpg'),
  thumbs_up: require('../../assets/scenes/moka_thumbs_up.jpg'),
  love: require('../../assets/scenes/moka_love.jpg'),
  nap: require('../../assets/scenes/moka_nap.jpg'),
  amazed: require('../../assets/scenes/moka_amazed.jpg'),
  cookie: require('../../assets/scenes/moka_cookie.jpg'),
  music: require('../../assets/scenes/moka_music.jpg'),
  laptop: require('../../assets/scenes/moka_laptop.jpg'),
  reading: require('../../assets/scenes/moka_reading.jpg'),
  sipping: require('../../assets/scenes/moka_sipping.jpg'),
  scarf: require('../../assets/scenes/moka_scarf.jpg'),
  unimpressed: require('../../assets/scenes/moka_unimpressed.jpg'),
  plaid_coffee: require('../../assets/scenes/moka_plaid_coffee.jpg'),
  pizza: require('../../assets/scenes/moka_pizza.jpg'),
  bubble_bath: require('../../assets/scenes/moka_bubble_bath.jpg'),
  blanket_coffee: require('../../assets/scenes/moka_blanket_coffee.jpg'),
  shower: require('../../assets/scenes/moka_shower.jpg'),
  birthday: require('../../assets/scenes/moka_birthday.jpg'),
  sunny_plant: require('../../assets/scenes/moka_sunny_plant.jpg'),
  lazy_coffee: require('../../assets/scenes/moka_lazy_coffee.jpg'),
  baking: require('../../assets/scenes/moka_baking.jpg'),
  scrubbing: require('../../assets/scenes/moka_scrubbing.jpg'),
  handyman: require('../../assets/scenes/moka_handyman.jpg'),
  watering: require('../../assets/scenes/moka_watering.jpg'),
  laundry_basket: require('../../assets/scenes/moka_laundry_basket.jpg'),
  dustpan: require('../../assets/scenes/moka_dustpan.jpg'),
  spray_clean: require('../../assets/scenes/moka_spray_clean.jpg'),
  trash_bag: require('../../assets/scenes/moka_trash_bag.jpg'),
  todo: require('../../assets/scenes/moka_todo.jpg'),
  iced_vacuum: require('../../assets/scenes/moka_iced_vacuum.jpg'),
};

export const ROOM_SCENES: Partial<Record<RoomType, ImageSourcePropType>> = {
  salon: require('../../assets/scenes/oda_salon.jpg'),
  mutfak: require('../../assets/scenes/oda_mutfak.jpg'),
  yatak: require('../../assets/scenes/oda_yatak.jpg'),
  banyo: require('../../assets/scenes/oda_banyo.jpg'),
  calisma: require('../../assets/scenes/oda_calisma.jpg'),
  antre: require('../../assets/scenes/oda_antre.jpg'),
  balkon: require('../../assets/scenes/oda_balkon.jpg'),
  camasir: require('../../assets/scenes/oda_camasir.jpg'),
};
