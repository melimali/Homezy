import type { ImageSourcePropType } from 'react-native';

/**
 * Moka aksesuarları: `assets/moka/acc/moka_acc_<ad>.png` (saydam). Yerleşim 512×512 `moka_happy`
 * tuvaline göre: merkez (cx, cy), genişlik w, dönüş rot (derece). Tuval dışına taşabilir.
 * Sadece `ACC_POSES` pozlarında gösterilir (kafa aynı yerde).
 */
export type AccId = 'bere' | 'sef' | 'gozluk' | 'gunes-gozlugu' | 'atki' | 'papyon' | 'kulaklik' | 'cicek-tac' | 'yildiz-toka';

export type AccSpec = { src: ImageSourcePropType; ratio: number; cx: number; cy: number; w: number; rot: number; label: string; layer: 'ust' | 'alt' };

export const MOKA_ACC: Record<AccId, AccSpec> = {
  bere: { src: require('../../assets/moka/acc/moka_acc_bere.png'), ratio: 379 / 382, cx: 240, cy: 62, w: 190, rot: -6, label: 'Bere', layer: 'ust' },
  sef: { src: require('../../assets/moka/acc/moka_acc_sef.png'), ratio: 394 / 307, cx: 240, cy: 48, w: 230, rot: -6, label: 'Şef şapkası', layer: 'ust' },
  gozluk: { src: require('../../assets/moka/acc/moka_acc_gozluk.png'), ratio: 402 / 175, cx: 246, cy: 138, w: 230, rot: -5, label: 'Yuvarlak gözlük', layer: 'ust' },
  'gunes-gozlugu': { src: require('../../assets/moka/acc/moka_acc_gunes-gozlugu.png'), ratio: 390 / 151, cx: 246, cy: 138, w: 225, rot: -5, label: 'Güneş gözlüğü', layer: 'ust' },
  atki: { src: require('../../assets/moka/acc/moka_acc_atki.png'), ratio: 346 / 359, cx: 232, cy: 245, w: 170, rot: 0, label: 'Atkı', layer: 'ust' },
  papyon: { src: require('../../assets/moka/acc/moka_acc_papyon.png'), ratio: 361 / 200, cx: 235, cy: 208, w: 90, rot: 0, label: 'Papyon', layer: 'ust' },
  kulaklik: { src: require('../../assets/moka/acc/moka_acc_kulaklik.png'), ratio: 388 / 360, cx: 250, cy: 120, w: 300, rot: -5, label: 'Kulaklık', layer: 'ust' },
  'cicek-tac': { src: require('../../assets/moka/acc/moka_acc_cicek-tac.png'), ratio: 405 / 224, cx: 238, cy: 52, w: 240, rot: -6, label: 'Çiçek tacı', layer: 'ust' },
  'yildiz-toka': { src: require('../../assets/moka/acc/moka_acc_yildiz-toka.png'), ratio: 360 / 224, cx: 150, cy: 55, w: 80, rot: -15, label: 'Yıldız tokası', layer: 'ust' },
};

/** Kafası `moka_happy` ile aynı yerde duran pozlar. */
export const ACC_POSES: readonly string[] = ['happy'];
