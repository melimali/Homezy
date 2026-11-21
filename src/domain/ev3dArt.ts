/**
 * 3D ev görselleri (ChatGPT çizimleri, WebP). `scripts/make-ev3d.py` üretir.
 * Görsel yoksa ya da EV3D_ART kapalıysa House3D eski SVG çizimine döner.
 */
import type { ImageSourcePropType } from 'react-native';

/** false yapılırsa 3D ev tamamen eski SVG çizimiyle çalışır. */
export const EV3D_ART = true;

export type ArtName =
  | 'agac_cam'
  | 'agac_meyve'
  | 'agac_yuvarlak'
  | 'bank'
  | 'cali_1'
  | 'cali_2'
  | 'cesme'
  | 'cicek_tarlasi'
  | 'cim_dokusu'
  | 'cit'
  | 'ev_golge'
  | 'havuz'
  | 'kar_cim'
  | 'kemer'
  | 'kus_evi'
  | 'sonbahar_cim'
  | 'cati_gri'
  | 'cati_kiremit'
  | 'cati_yosun'
  | 'duvar_siva'
  | 'zemin_fayans'
  | 'zemin_parke'
  | 'ay'
  | 'bulut_1'
  | 'bulut_2'
  | 'bulut_3'
  | 'bulut_4'
  | 'bulut_firtina'
  | 'bulut_yagmur'
  | 'duman_1'
  | 'duman_2'
  | 'duman_3'
  | 'gunes'
  | 'kar_tanesi'
  | 'kus_1'
  | 'kus_2'
  | 'kus_3'
  | 'yagmur_damla'
  | 'mobilya_banyo'
  | 'mobilya_bitki'
  | 'mobilya_buzdolabi'
  | 'mobilya_kedi'
  | 'mobilya_kitaplik'
  | 'mobilya_koltuk'
  | 'mobilya_kopek'
  | 'mobilya_masa'
  | 'mobilya_yatak'
  | 'ev_baca'
  | 'ev_kapi'
  | 'ev_pencere'
  | 'ev_pencere_gece';

/** Boyutlar: [genişlik, yükseklik] (kırpılmış, saydam kenarsız). */
export const ART_SIZE: Record<ArtName, [number, number]> = {
  agac_cam: [139, 192],
  agac_meyve: [166, 192],
  agac_yuvarlak: [169, 192],
  bank: [192, 158],
  cali_1: [192, 161],
  cali_2: [192, 91],
  cesme: [156, 192],
  cicek_tarlasi: [172, 192],
  cim_dokusu: [256, 256],
  cit: [192, 111],
  ev_golge: [192, 38],
  havuz: [192, 123],
  kar_cim: [256, 256],
  kemer: [159, 192],
  kus_evi: [163, 192],
  sonbahar_cim: [256, 256],
  cati_gri: [256, 256],
  cati_kiremit: [256, 256],
  cati_yosun: [256, 256],
  duvar_siva: [256, 256],
  zemin_fayans: [256, 256],
  zemin_parke: [256, 256],
  ay: [120, 128],
  bulut_1: [256, 114],
  bulut_2: [256, 130],
  bulut_3: [256, 110],
  bulut_4: [256, 114],
  bulut_firtina: [256, 162],
  bulut_yagmur: [256, 163],
  duman_1: [128, 104],
  duman_2: [128, 103],
  duman_3: [127, 128],
  gunes: [126, 128],
  kar_tanesi: [45, 48],
  kus_1: [65, 80],
  kus_2: [77, 80],
  kus_3: [80, 80],
  yagmur_damla: [33, 40],
  mobilya_banyo: [160, 142],
  mobilya_bitki: [134, 160],
  mobilya_buzdolabi: [120, 160],
  mobilya_kedi: [160, 126],
  mobilya_kitaplik: [108, 160],
  mobilya_koltuk: [160, 125],
  mobilya_kopek: [121, 160],
  mobilya_masa: [152, 160],
  mobilya_yatak: [147, 160],
  ev_baca: [182, 192],
  ev_kapi: [145, 192],
  ev_pencere: [160, 192],
  ev_pencere_gece: [153, 192],
};

export const ART: Record<ArtName, ImageSourcePropType> = {
  agac_cam: require('../../assets/ev3d/bahce/agac_cam.webp'),
  agac_meyve: require('../../assets/ev3d/bahce/agac_meyve.webp'),
  agac_yuvarlak: require('../../assets/ev3d/bahce/agac_yuvarlak.webp'),
  bank: require('../../assets/ev3d/bahce/bank.webp'),
  cali_1: require('../../assets/ev3d/bahce/cali_1.webp'),
  cali_2: require('../../assets/ev3d/bahce/cali_2.webp'),
  cesme: require('../../assets/ev3d/bahce/cesme.webp'),
  cicek_tarlasi: require('../../assets/ev3d/bahce/cicek_tarlasi.webp'),
  cim_dokusu: require('../../assets/ev3d/bahce/cim_dokusu.webp'),
  cit: require('../../assets/ev3d/bahce/cit.webp'),
  ev_golge: require('../../assets/ev3d/bahce/ev_golge.webp'),
  havuz: require('../../assets/ev3d/bahce/havuz.webp'),
  kar_cim: require('../../assets/ev3d/bahce/kar_cim.webp'),
  kemer: require('../../assets/ev3d/bahce/kemer.webp'),
  kus_evi: require('../../assets/ev3d/bahce/kus_evi.webp'),
  sonbahar_cim: require('../../assets/ev3d/bahce/sonbahar_cim.webp'),
  cati_gri: require('../../assets/ev3d/doku/cati_gri.webp'),
  cati_kiremit: require('../../assets/ev3d/doku/cati_kiremit.webp'),
  cati_yosun: require('../../assets/ev3d/doku/cati_yosun.webp'),
  duvar_siva: require('../../assets/ev3d/doku/duvar_siva.webp'),
  zemin_fayans: require('../../assets/ev3d/doku/zemin_fayans.webp'),
  zemin_parke: require('../../assets/ev3d/doku/zemin_parke.webp'),
  ay: require('../../assets/ev3d/hava/ay.webp'),
  bulut_1: require('../../assets/ev3d/hava/bulut_1.webp'),
  bulut_2: require('../../assets/ev3d/hava/bulut_2.webp'),
  bulut_3: require('../../assets/ev3d/hava/bulut_3.webp'),
  bulut_4: require('../../assets/ev3d/hava/bulut_4.webp'),
  bulut_firtina: require('../../assets/ev3d/hava/bulut_firtina.webp'),
  bulut_yagmur: require('../../assets/ev3d/hava/bulut_yagmur.webp'),
  duman_1: require('../../assets/ev3d/hava/duman_1.webp'),
  duman_2: require('../../assets/ev3d/hava/duman_2.webp'),
  duman_3: require('../../assets/ev3d/hava/duman_3.webp'),
  gunes: require('../../assets/ev3d/hava/gunes.webp'),
  kar_tanesi: require('../../assets/ev3d/hava/kar_tanesi.webp'),
  kus_1: require('../../assets/ev3d/hava/kus_1.webp'),
  kus_2: require('../../assets/ev3d/hava/kus_2.webp'),
  kus_3: require('../../assets/ev3d/hava/kus_3.webp'),
  yagmur_damla: require('../../assets/ev3d/hava/yagmur_damla.webp'),
  mobilya_banyo: require('../../assets/ev3d/mobilya/mobilya_banyo.webp'),
  mobilya_bitki: require('../../assets/ev3d/mobilya/mobilya_bitki.webp'),
  mobilya_buzdolabi: require('../../assets/ev3d/mobilya/mobilya_buzdolabi.webp'),
  mobilya_kedi: require('../../assets/ev3d/mobilya/mobilya_kedi.webp'),
  mobilya_kitaplik: require('../../assets/ev3d/mobilya/mobilya_kitaplik.webp'),
  mobilya_koltuk: require('../../assets/ev3d/mobilya/mobilya_koltuk.webp'),
  mobilya_kopek: require('../../assets/ev3d/mobilya/mobilya_kopek.webp'),
  mobilya_masa: require('../../assets/ev3d/mobilya/mobilya_masa.webp'),
  mobilya_yatak: require('../../assets/ev3d/mobilya/mobilya_yatak.webp'),
  ev_baca: require('../../assets/ev3d/parca/ev_baca.webp'),
  ev_kapi: require('../../assets/ev3d/parca/ev_kapi.webp'),
  ev_pencere: require('../../assets/ev3d/parca/ev_pencere.webp'),
  ev_pencere_gece: require('../../assets/ev3d/parca/ev_pencere_gece.webp'),
};
