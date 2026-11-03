import type { ImageSourcePropType } from 'react-native';

import { MOKA_ASSETS, type MokaPose } from '@/constants/moka';
import { HOME_MOKA_SEATED } from '@/constants/curated-scenes';

export type HeroMotion = 'breath' | 'bob' | 'sway' | 'zoom' | 'beat';
export type HeroFx = 'zzz' | 'hearts' | 'notes' | 'sparkle' | 'steam' | 'stars' | 'bubbles' | 'leaves' | 'rain' | 'snow' | 'none';

/**
 * Ana ekranın 10 sabit sahnesi. Her biri: tek sabit arka plan + o arka plana en uygun yere konmuş
 * animasyonlu Moka. Konumlar ekran (hero) ölçüsüne göre: x = Moka'nın yatay merkezi (genişlik oranı),
 * bottom = alt kenarın yerden yüksekliği (yükseklik oranı), size = genişlik oranı.
 * Uygulama her açıldığında rastgele biri seçilir ve oturum boyunca değişmez.
 */
export type HeroScene = {
  id: string;
  background: ImageSourcePropType;
  sticker: ImageSourcePropType;
  x: number;
  bottom: number;
  size: number;
  motion: HeroMotion;
  fx: HeroFx;
};

const pose = (p: MokaPose) => MOKA_ASSETS[p];

export const HERO_SCENES: readonly HeroScene[] = [
  { id: 'salon-kanepe', background: require('../../assets/arkaplan/salon_kanepe2.jpg'), sticker: HOME_MOKA_SEATED, x: 0.58, bottom: 0.27, size: 0.56, motion: 'breath', fx: 'steam' },
  { id: 'salon-gece', background: require('../../assets/arkaplan/salon_gece.jpg'), sticker: pose('blanket_coffee'), x: 0.56, bottom: 0.25, size: 0.48, motion: 'breath', fx: 'steam' },
  { id: 'pencere-sedir', background: require('../../assets/arkaplan/pencere_sedir.jpg'), sticker: pose('reading'), x: 0.55, bottom: 0.30, size: 0.46, motion: 'breath', fx: 'none' },
  { id: 'yatak-gece', background: require('../../assets/arkaplan/yatak_gece.jpg'), sticker: pose('sleepy'), x: 0.52, bottom: 0.22, size: 0.50, motion: 'breath', fx: 'zzz' },
  { id: 'balkon-aksam', background: require('../../assets/arkaplan/balkon_aksam.jpg'), sticker: pose('cheers'), x: 0.58, bottom: 0.19, size: 0.50, motion: 'bob', fx: 'sparkle' },
  { id: 'mutfak-ada', background: require('../../assets/arkaplan/mutfak_ada.jpg'), sticker: pose('chef'), x: 0.54, bottom: 0.26, size: 0.48, motion: 'sway', fx: 'steam' },
  { id: 'calisma-gece', background: require('../../assets/arkaplan/calisma_gece.jpg'), sticker: pose('laptop'), x: 0.42, bottom: 0.22, size: 0.50, motion: 'bob', fx: 'none' },
  { id: 'yagmurlu-pencere', background: require('../../assets/arkaplan/yagmurlu_pencere.jpg'), sticker: pose('plaid_coffee'), x: 0.52, bottom: 0.26, size: 0.50, motion: 'breath', fx: 'steam' },
  { id: 'bitki-kosesi', background: require('../../assets/arkaplan/bitki_kosesi.jpg'), sticker: pose('watering'), x: 0.54, bottom: 0.22, size: 0.50, motion: 'sway', fx: 'leaves' },
  { id: 'battaniye-cadiri', background: require('../../assets/arkaplan/battaniye_cadiri.jpg'), sticker: pose('blanket'), x: 0.52, bottom: 0.24, size: 0.56, motion: 'breath', fx: 'zzz' },
];

let session: HeroScene | null = null;
/** Uygulama açılışında rastgele biri seçilir; sekme değişse de oturum boyunca aynı kalır. */
export function sessionHeroScene(rnd: () => number = Math.random): HeroScene {
  if (!session) session = HERO_SCENES[Math.floor(rnd() * HERO_SCENES.length)];
  return session;
}
