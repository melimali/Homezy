import type { ImageSourcePropType } from 'react-native';

/**
 * Moka aksesuarları: `assets/moka/acc/moka_acc_<ad>.png` (saydam). Yerleşim 512×512 `moka_happy`
 * tuvaline göre: merkez (cx, cy), genişlik w, dönüş rot (derece). Tuval dışına taşabilir.
 * Sadece `ACC_POSES` pozlarında gösterilir (kafa aynı yerde).
 */
export type AccId = 'bere' | 'sef' | 'gozluk' | 'gunes-gozlugu' | 'atki' | 'papyon' | 'kulaklik' | 'cicek-tac' | 'yildiz-toka' | 'kasket' | 'bandana' | 'kedi-kulak' | 'kalp-gozluk' | 'noel-sapka' | 'zil-tasma';

export type AccSpec = { src: ImageSourcePropType; ratio: number; cx: number; cy: number; w: number; rot: number; label: string; kind: 'bas' | 'yuz' | 'boyun' };

export const MOKA_ACC: Record<AccId, AccSpec> = {
  bere: { src: require('../../assets/moka/acc/moka_acc_bere.png'), ratio: 379 / 382, cx: 240, cy: 62, w: 190, rot: -6, label: 'Bere', kind: 'bas' },
  sef: { src: require('../../assets/moka/acc/moka_acc_sef.png'), ratio: 394 / 307, cx: 240, cy: 48, w: 230, rot: -6, label: 'Şef şapkası', kind: 'bas' },
  gozluk: { src: require('../../assets/moka/acc/moka_acc_gozluk.png'), ratio: 402 / 175, cx: 246, cy: 138, w: 230, rot: -5, label: 'Yuvarlak gözlük', kind: 'yuz' },
  'gunes-gozlugu': { src: require('../../assets/moka/acc/moka_acc_gunes-gozlugu.png'), ratio: 390 / 151, cx: 246, cy: 138, w: 225, rot: -5, label: 'Güneş gözlüğü', kind: 'yuz' },
  atki: { src: require('../../assets/moka/acc/moka_acc_atki.png'), ratio: 346 / 359, cx: 232, cy: 245, w: 170, rot: 0, label: 'Atkı', kind: 'boyun' },
  papyon: { src: require('../../assets/moka/acc/moka_acc_papyon.png'), ratio: 361 / 200, cx: 235, cy: 208, w: 90, rot: 0, label: 'Papyon', kind: 'boyun' },
  kulaklik: { src: require('../../assets/moka/acc/moka_acc_kulaklik.png'), ratio: 388 / 360, cx: 250, cy: 120, w: 300, rot: -5, label: 'Kulaklık', kind: 'bas' },
  'cicek-tac': { src: require('../../assets/moka/acc/moka_acc_cicek-tac.png'), ratio: 405 / 224, cx: 238, cy: 52, w: 240, rot: -6, label: 'Çiçek tacı', kind: 'bas' },
  'yildiz-toka': { src: require('../../assets/moka/acc/moka_acc_yildiz-toka.png'), ratio: 360 / 224, cx: 150, cy: 55, w: 80, rot: -15, label: 'Yıldız tokası', kind: 'bas' },
  'kasket': { src: require('../../assets/moka/acc/moka_acc_kasket.png'), ratio: 502 / 346, cx: 240, cy: 62, w: 230, rot: -6, label: 'Barista kasketi', kind: 'bas' },
  'bandana': { src: require('../../assets/moka/acc/moka_acc_bandana.png'), ratio: 572 / 307, cx: 240, cy: 92, w: 280, rot: -6, label: 'Bandana', kind: 'bas' },
  'kedi-kulak': { src: require('../../assets/moka/acc/moka_acc_kedi-kulak.png'), ratio: 515 / 313, cx: 240, cy: 58, w: 270, rot: -6, label: 'Kedi kulağı', kind: 'bas' },
  'kalp-gozluk': { src: require('../../assets/moka/acc/moka_acc_kalp-gozluk.png'), ratio: 554 / 226, cx: 246, cy: 138, w: 240, rot: -5, label: 'Kalpli gözlük', kind: 'yuz' },
  'noel-sapka': { src: require('../../assets/moka/acc/moka_acc_noel-sapka.png'), ratio: 569 / 370, cx: 245, cy: 46, w: 250, rot: -6, label: 'Noel şapkası', kind: 'bas' },
  'zil-tasma': { src: require('../../assets/moka/acc/moka_acc_zil-tasma.png'), ratio: 447 / 292, cx: 235, cy: 222, w: 190, rot: 0, label: 'Zilli yaka', kind: 'boyun' },
};

/** Boyun aksesuarları sadece bu pozda (fincan boynu kapatır). */
export const NECK_POSES: readonly string[] = ['happy'];
