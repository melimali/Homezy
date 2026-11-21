import type { ImageSourcePropType } from 'react-native';

import type { MokaPose } from '@/constants/moka';
import type { RoomType } from '@/domain/types';

/**
 * Moka sahneleri: arka plan + Moka stickerı tek görselde (1280×960). Bu dosya
 * `python3 scripts/make-scenes.py build` ile üretilir, elle değiştirme; eşleştirme scripts/scenes.json.
 * Sahnesi olmayan poz ya da oda için ekranlar eski görünüme (sticker / emoji) döner.
 */
export const POSE_SCENES: Partial<Record<MokaPose, ImageSourcePropType>> = {
  happy: require('../../assets/scenes/moka_happy.webp'),
  sleepy: require('../../assets/scenes/moka_sleepy.webp'),
  shocked: require('../../assets/scenes/moka_shocked.webp'),
  analyzing: require('../../assets/scenes/moka_analyzing.webp'),
  sassy: require('../../assets/scenes/moka_sassy.webp'),
  party: require('../../assets/scenes/moka_party.webp'),
  cozy_plant: require('../../assets/scenes/moka_cozy_plant.webp'),
  chef: require('../../assets/scenes/moka_chef.webp'),
  wink: require('../../assets/scenes/moka_wink.webp'),
  panicked: require('../../assets/scenes/moka_panicked.webp'),
  begging: require('../../assets/scenes/moka_begging.webp'),
  blanket: require('../../assets/scenes/moka_blanket.webp'),
  sweeping: require('../../assets/scenes/moka_sweeping.webp'),
  dusting: require('../../assets/scenes/moka_dusting.webp'),
  laundry: require('../../assets/scenes/moka_laundry.webp'),
  mirror: require('../../assets/scenes/moka_mirror.webp'),
  dishes: require('../../assets/scenes/moka_dishes.webp'),
  maintenance: require('../../assets/scenes/moka_maintenance.webp'),
  plants: require('../../assets/scenes/moka_plants.webp'),
  trash: require('../../assets/scenes/moka_trash.webp'),
  rest: require('../../assets/scenes/moka_rest.webp'),
  checklist: require('../../assets/scenes/moka_checklist.webp'),
  vacuuming: require('../../assets/scenes/moka_vacuuming.webp'),
  sparkling_complete: require('../../assets/scenes/moka_sparkling_complete.webp'),
  cheers: require('../../assets/scenes/moka_cheers.webp'),
  thumbs_up: require('../../assets/scenes/moka_thumbs_up.webp'),
  love: require('../../assets/scenes/moka_love.webp'),
  nap: require('../../assets/scenes/moka_nap.webp'),
  amazed: require('../../assets/scenes/moka_amazed.webp'),
  cookie: require('../../assets/scenes/moka_cookie.webp'),
  music: require('../../assets/scenes/moka_music.webp'),
  laptop: require('../../assets/scenes/moka_laptop.webp'),
  reading: require('../../assets/scenes/moka_reading.webp'),
  sipping: require('../../assets/scenes/moka_sipping.webp'),
  scarf: require('../../assets/scenes/moka_scarf.webp'),
  unimpressed: require('../../assets/scenes/moka_unimpressed.webp'),
  plaid_coffee: require('../../assets/scenes/moka_plaid_coffee.webp'),
  pizza: require('../../assets/scenes/moka_pizza.webp'),
  bubble_bath: require('../../assets/scenes/moka_bubble_bath.webp'),
  blanket_coffee: require('../../assets/scenes/moka_blanket_coffee.webp'),
  shower: require('../../assets/scenes/moka_shower.webp'),
  birthday: require('../../assets/scenes/moka_birthday.webp'),
  sunny_plant: require('../../assets/scenes/moka_sunny_plant.webp'),
  lazy_coffee: require('../../assets/scenes/moka_lazy_coffee.webp'),
  baking: require('../../assets/scenes/moka_baking.webp'),
  scrubbing: require('../../assets/scenes/moka_scrubbing.webp'),
  handyman: require('../../assets/scenes/moka_handyman.webp'),
  watering: require('../../assets/scenes/moka_watering.webp'),
  laundry_basket: require('../../assets/scenes/moka_laundry_basket.webp'),
  dustpan: require('../../assets/scenes/moka_dustpan.webp'),
  spray_clean: require('../../assets/scenes/moka_spray_clean.webp'),
  trash_bag: require('../../assets/scenes/moka_trash_bag.webp'),
  todo: require('../../assets/scenes/moka_todo.webp'),
  iced_vacuum: require('../../assets/scenes/moka_iced_vacuum.webp'),
};

export const ROOM_SCENES: Partial<Record<RoomType, ImageSourcePropType>> = {
  salon: require('../../assets/scenes/oda_salon.webp'),
  mutfak: require('../../assets/scenes/oda_mutfak.webp'),
  yatak: require('../../assets/scenes/oda_yatak.webp'),
  banyo: require('../../assets/scenes/oda_banyo.webp'),
  calisma: require('../../assets/scenes/oda_calisma.webp'),
  antre: require('../../assets/scenes/oda_antre.webp'),
  balkon: require('../../assets/scenes/oda_balkon.webp'),
  camasir: require('../../assets/scenes/oda_camasir.webp'),
};
