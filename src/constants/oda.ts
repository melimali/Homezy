import type { ImageSourcePropType } from 'react-native';

/**
 * Moka'nın odası (v6): sabah, akşam ve gece için ayrı çizilmiş üç resim (852×1846).
 * Otomatik üretildi: scripts/oda-v6 (kaynak: moka-oda/v6/teslim). Koordinatlar her saatin kendi resmine göredir;
 * üç resim birebir üst üste oturmadığı için her saatin noktaları ayrı.
 * Hareketli parçalar resimden kesildi, tabandaki yerleri dolduruldu (sallanınca hayalet çıkmaz).
 */
export const ODA_W = 852;
export const ODA_H = 1846;
export type OdaPhase = 'sabah' | 'aksam' | 'gece';
export type Box = { x: number; y: number; w: number; h: number };
export type Pt = { x: number; y: number };
export type OdaPart = 'asma' | 'rafbitki' | 'pencerebitki' | 'sehpabitki' | 'kupa1' | 'kupa2' | 'kitapust';
export type OdaTouch = 'lamba' | 'kupa' | 'surahi' | 'bitki' | 'pencere';
export type OdaLayers = {
  taban: ImageSourcePropType;
  /** Pencere camları (beyaz maske): hava rengi bununla boyanır. */
  cam: { src: ImageSourcePropType; box: Box };
  /** Pencerenin önündeki her şey (çerçeve, yapraklar): hava parçacıklarının üstüne çizilir, yağmur yaprağın önüne geçmez. */
  onCam: { src: ImageSourcePropType; box: Box };
  sillLeaves: ImageSourcePropType;
  /** Cam gözleri: yağmur, kar, bulut bunların içinde kalır. */
  cells: Box[];
  parts: Record<OdaPart, { src: ImageSourcePropType; box: Box; pivot: Pt }>;
  /** Asma saksıdan arada bir düşen yaprak. */
  yaprak: { src: ImageSourcePropType; w: number; h: number };
  seat: Pt; lamp: Pt; chemex: Pt; mug: Pt; moon?: Pt;
  chain: [Pt, Pt];
  hit: Record<OdaTouch, Box>;
};

export const ODA: Record<OdaPhase, OdaLayers> = {
  sabah: {
    sillLeaves: require('../assets/oda/sabah_sill.png'),
    taban: require('../../assets/oda/sabah_taban.webp'),
    onCam: { src: require('../../assets/oda/sabah_oncam.webp'), box: { x: 0, y: 304, w: 163, h: 682 } },
    cam: { src: require('../../assets/oda/sabah_cam.webp'), box: { x: 0, y: 308, w: 159, h: 674 } },
    cells: [{ x: 0, y: 407, w: 23, h: 165 }, { x: 52, y: 416, w: 107, h: 193 }, { x: 0, y: 602, w: 23, h: 159 }, { x: 52, y: 614, w: 107, h: 159 }, { x: 0, y: 792, w: 23, h: 190 }, { x: 52, y: 796, w: 107, h: 182 }],
    parts: {
      asma: { src: require('../assets/oda/sabah_planter.png'), box: { x: -22, y: 110, w: 374, h: 665 }, pivot: { x: 118, y: 149 } },
      rafbitki: { src: require('../../assets/oda/sabah_rafbitki.webp'), box: { x: 610, y: 305, w: 242, h: 466 }, pivot: { x: 755, y: 389 } },
      pencerebitki: { src: require('../../assets/oda/sabah_pencerebitki.webp'), box: { x: 201, y: 1006, w: 80, h: 146 }, pivot: { x: 234, y: 1008 } },
      sehpabitki: { src: require('../../assets/oda/sabah_sehpabitki.webp'), box: { x: 565, y: 892, w: 113, h: 93 }, pivot: { x: 622, y: 985 } },
      kupa1: { src: require('../../assets/oda/sabah_kupa1.webp'), box: { x: 466, y: 625, w: 81, h: 114 }, pivot: { x: 513, y: 627 } },
      kupa2: { src: require('../../assets/oda/sabah_kupa2.webp'), box: { x: 554, y: 625, w: 96, h: 114 }, pivot: { x: 592, y: 627 } },
      kitapust: { src: require('../../assets/oda/sabah_kitapust.webp'), box: { x: 546, y: 423, w: 156, h: 153 }, pivot: { x: 554, y: 576 } },
    },
    yaprak: { src: require('../../assets/oda/sabah_yaprak.webp'), w: 44, h: 48 },
    seat: { x: 400, y: 1330 }, lamp: { x: 785, y: 850 }, chemex: { x: 466, y: 452 }, mug: { x: 553, y: 503 },
    chain: [{ x: 330, y: 392 }, { x: 655, y: 392 }],
    hit: { lamba: { x: 690, y: 770, w: 162, h: 170 }, kupa: { x: 462, y: 610, w: 190, h: 135 }, surahi: { x: 405, y: 430, w: 115, h: 145 }, bitki: { x: 560, y: 880, w: 180, h: 170 }, pencere: { x: 0, y: 300, w: 215, h: 710 } },
  },
  aksam: {
    sillLeaves: require('../assets/oda/aksam_sill.png'),
    taban: require('../../assets/oda/aksam_taban.webp'),
    onCam: { src: require('../../assets/oda/aksam_oncam.webp'), box: { x: 0, y: 306, w: 168, h: 678 } },
    cam: { src: require('../../assets/oda/aksam_cam.webp'), box: { x: 0, y: 310, w: 164, h: 670 } },
    cells: [{ x: 30, y: 377, w: 132, h: 216 }, { x: 0, y: 378, w: 18, h: 174 }, { x: 0, y: 590, w: 19, h: 158 }, { x: 55, y: 604, w: 107, h: 162 }, { x: 0, y: 784, w: 19, h: 196 }, { x: 55, y: 790, w: 108, h: 185 }],
    parts: {
      asma: { src: require('../assets/oda/aksam_planter.png'), box: { x: -22, y: 65, w: 382, h: 712 }, pivot: { x: 139, y: 104 } },
      rafbitki: { src: require('../../assets/oda/aksam_rafbitki.webp'), box: { x: 630, y: 270, w: 220, h: 472 }, pivot: { x: 762, y: 355 } },
      pencerebitki: { src: require('../../assets/oda/aksam_pencerebitki.webp'), box: { x: 197, y: 1000, w: 104, h: 159 }, pivot: { x: 241, y: 1002 } },
      sehpabitki: { src: require('../../assets/oda/aksam_sehpabitki.webp'), box: { x: 552, y: 894, w: 125, h: 95 }, pivot: { x: 614, y: 989 } },
      kupa1: { src: require('../../assets/oda/aksam_kupa1.webp'), box: { x: 455, y: 615, w: 105, h: 113 }, pivot: { x: 504, y: 617 } },
      kupa2: { src: require('../../assets/oda/aksam_kupa2.webp'), box: { x: 549, y: 614, w: 105, h: 114 }, pivot: { x: 597, y: 616 } },
      kitapust: { src: require('../../assets/oda/aksam_kitapust.webp'), box: { x: 554, y: 404, w: 137, h: 155 }, pivot: { x: 562, y: 559 } },
    },
    yaprak: { src: require('../../assets/oda/aksam_yaprak.webp'), w: 45, h: 48 },
    seat: { x: 395, y: 1329 }, lamp: { x: 778, y: 839 }, chemex: { x: 466, y: 435 }, mug: { x: 551, y: 486 },
    chain: [{ x: 332, y: 374 }, { x: 652, y: 373 }],
    hit: { lamba: { x: 685, y: 758, w: 159, h: 173 }, kupa: { x: 461, y: 596, w: 186, h: 137 }, surahi: { x: 406, y: 412, w: 112, h: 148 }, bitki: { x: 556, y: 870, w: 176, h: 173 }, pencere: { x: 7, y: 281, w: 207, h: 723 } },
  },
  gece: {
    sillLeaves: require('../assets/oda/gece_sill.png'),
    taban: require('../../assets/oda/gece_taban.webp'),
    onCam: { src: require('../../assets/oda/gece_oncam.webp'), box: { x: 0, y: 292, w: 184, h: 695 } },
    cam: { src: require('../../assets/oda/gece_cam.webp'), box: { x: 0, y: 296, w: 180, h: 687 } },
    cells: [{ x: 25, y: 367, w: 144, h: 229 }, { x: 0, y: 379, w: 19, h: 174 }, { x: 0, y: 590, w: 36, h: 165 }, { x: 55, y: 605, w: 125, h: 164 }, { x: 0, y: 781, w: 35, h: 202 }, { x: 56, y: 790, w: 124, h: 186 }],
    parts: {
      asma: { src: require('../assets/oda/gece_planter.png'), box: { x: -22, y: 65, w: 382, h: 712 }, pivot: { x: 137, y: 105 } },
      rafbitki: { src: require('../../assets/oda/gece_rafbitki.webp'), box: { x: 629, y: 268, w: 218, h: 476 }, pivot: { x: 760, y: 354 } },
      pencerebitki: { src: require('../../assets/oda/gece_pencerebitki.webp'), box: { x: 68, y: 1000, w: 233, h: 159 }, pivot: { x: 199, y: 1002 } },
      sehpabitki: { src: require('../../assets/oda/gece_sehpabitki.webp'), box: { x: 551, y: 894, w: 124, h: 95 }, pivot: { x: 613, y: 989 } },
      kupa1: { src: require('../../assets/oda/gece_kupa1.webp'), box: { x: 455, y: 614, w: 104, h: 114 }, pivot: { x: 503, y: 616 } },
      kupa2: { src: require('../../assets/oda/gece_kupa2.webp'), box: { x: 548, y: 613, w: 104, h: 115 }, pivot: { x: 596, y: 615 } },
      kitapust: { src: require('../../assets/oda/gece_kitapust.webp'), box: { x: 552, y: 407, w: 137, h: 153 }, pivot: { x: 560, y: 560 } },
    },
    yaprak: { src: require('../../assets/oda/gece_yaprak.webp'), w: 47, h: 48 },
    seat: { x: 394, y: 1329 }, lamp: { x: 776, y: 840 }, chemex: { x: 465, y: 435 }, mug: { x: 550, y: 487 }, moon: { x: 99, y: 660 },
    chain: [{ x: 331, y: 374 }, { x: 650, y: 374 }],
    hit: { lamba: { x: 683, y: 759, w: 158, h: 172 }, kupa: { x: 460, y: 596, w: 186, h: 137 }, surahi: { x: 405, y: 413, w: 112, h: 147 }, bitki: { x: 554, y: 871, w: 176, h: 173 }, pencere: { x: 7, y: 281, w: 207, h: 723 } },
  },
};

export const ISIK = require('../../assets/oda/isik.webp') as ImageSourcePropType;
/** v6 parçacıkları (tek kare): buhar, kar, cam damlası, yıldız ışıltısı, bulut. */
export const PARCA = {
  buhar: require('../../assets/oda/p_buhar.webp') as ImageSourcePropType,
  kar: require('../../assets/oda/p_kar.webp') as ImageSourcePropType,
  damla: require('../../assets/oda/p_damla.webp') as ImageSourcePropType,
  yildiz: require('../../assets/oda/p_yildiz.webp') as ImageSourcePropType,
  bulut: require('../../assets/oda/p_bulut.webp') as ImageSourcePropType,
};

/**
 * Parçaların hareketi. sway: bitki gibi gidip gelir (her tur biraz farklı). swing: asılı kupa sarkaç gibi.
 * rock: kitaplar arada bir hafifçe sallanıp yerine oturur. deg: en fazla açı, ms: yarım tur.
 */
export const MOTION: Record<OdaPart, { kind: 'sway' | 'swing' | 'rock'; deg: number; ms: number; delay: number; tilt: number }> = {
  asma: { kind: 'sway', deg: 1.35, ms: 4700, delay: 0, tilt: 0 },
  rafbitki: { kind: 'sway', deg: 0.32, ms: 5900, delay: 900, tilt: 0 },
  pencerebitki: { kind: 'sway', deg: 0.58, ms: 3700, delay: 400, tilt: 0 },
  sehpabitki: { kind: 'sway', deg: 0.42, ms: 5400, delay: 1200, tilt: 0 },
  kupa1: { kind: 'swing', deg: 3.2, ms: 2300, delay: 300, tilt: 2 },
  kupa2: { kind: 'swing', deg: 3.2, ms: 2500, delay: 1400, tilt: 2 },
  kitapust: { kind: 'rock', deg: 1.4, ms: 9000, delay: 4000, tilt: 2 },
};
