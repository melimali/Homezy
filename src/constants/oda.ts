import type { ImageSourcePropType } from 'react-native';

/** Otomatik üretildi: scripts/make-oda-layers.py (+ geometri). Koordinatlar 852×1846 oda resmine göredir. */
export const ODA_W = 852;
export const ODA_H = 1846;
export type OdaVariant = 'gece' | 'gunduz';
export type Box = { x: number; y: number; w: number; h: number };
export type OdaLayers = { taban: ImageSourcePropType; cam: ImageSourcePropType; camBox: Box; bitki: Record<'a' | 'b' | 'c', { src: ImageSourcePropType; box: Box }> };

export const ODA: Record<OdaVariant, OdaLayers> = {
  gece: {
    taban: require('../../assets/oda/gece_taban.webp'),
    cam: require('../../assets/oda/gece_cam.webp'),
    camBox: {"x": 0, "y": 309, "w": 190, "h": 673},
    bitki: {
      a: { src: require('../../assets/oda/gece_bitki_a.webp'), box: {"x": 0, "y": 235, "w": 321, "h": 478} },
      b: { src: require('../../assets/oda/gece_bitki_b.webp'), box: {"x": 624, "y": 295, "w": 228, "h": 282} },
      c: { src: require('../../assets/oda/gece_bitki_c.webp'), box: {"x": 92, "y": 891, "w": 193, "h": 211} },
    },
  },
  gunduz: {
    taban: require('../../assets/oda/gunduz_taban.webp'),
    cam: require('../../assets/oda/gunduz_cam.webp'),
    camBox: {"x": 0, "y": 309, "w": 190, "h": 673},
    bitki: {
      a: { src: require('../../assets/oda/gunduz_bitki_a.webp'), box: {"x": 0, "y": 235, "w": 321, "h": 478} },
      b: { src: require('../../assets/oda/gunduz_bitki_b.webp'), box: {"x": 624, "y": 295, "w": 228, "h": 282} },
      c: { src: require('../../assets/oda/gunduz_bitki_c.webp'), box: {"x": 92, "y": 891, "w": 193, "h": 211} },
    },
  },
};

export const ISIK = require('../../assets/oda/isik.webp') as ImageSourcePropType;

/** Bitki sallanma eksenleri (asma noktası / saksı tabanı) ve sallanma ayarı. */
export const PIVOT = { a: { x: 140, y: 262, deg: 1.4, ms: 5200 }, b: { x: 840, y: 330, deg: 1.2, ms: 6400 }, c: { x: 150, y: 1030, deg: 1.8, ms: 4600 } } as const;
export const MOON = { x: 100, y: 659 };
export const LAMP = { x: 765, y: 860 };
export const STARS: { x: number; y: number }[] = [{ x: 75, y: 470 }, { x: 140, y: 500 }, { x: 150, y: 625 }, { x: 70, y: 730 }, { x: 140, y: 745 }, { x: 70, y: 830 }, { x: 145, y: 855 }];
