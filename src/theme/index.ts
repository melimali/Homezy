import { useColorScheme } from 'react-native';

import type { RoomType } from '@/domain/types';

/** Safehouse: Daily Ops paleti (sığınak / karantina teması). */
export const safehouse = {
  gray: '#1E2022', // koyu gri: zemin, alt menü
  quarantine: '#F3B553', // Karantina Sarısı: vurgu, rozet, ana buton
  rust: '#D9534F', // Pas / Uyarı Kırmızısı: gecikmiş görevler
  radio: '#5CB85C', // Telsiz Yeşili: yolunda giden görevler
  bone: '#ECE7DC', // kemik beyazı: koyu zeminde yazı
};

/** Eski anahtarlar korunuyor; değerler Safehouse paletine çekildi. */
export const brand = {
  navy: safehouse.gray,
  mint: safehouse.bone,
  blue: safehouse.radio,
  clay: safehouse.quarantine,
  cocoa: '#A8875A',
};

const light = {
  bg: '#E7E3D8', surface: '#F4F1EA', surface2: '#DCD7CA', ink: '#1E2022', muted: '#5C5F63', line: '#C9C3B4',
  wall: '#1E2022', hatch: 'rgba(30,32,34,0.12)', shadow: 'rgba(30,32,34,0.18)', lift: 'rgba(30,32,34,0.12)',
  accent: '#1E2022', onAccent: '#F3B553', accentSoft: '#E9DCC0', hi: '#F3B553', warm: '#A8875A',
  onBadge: '#1E2022',
  late: '#D9534F', lateSoft: '#F2D4D2', today: '#B7862F', todaySoft: '#F1E2C4', ok: '#3F8F3F', okSoft: '#D5EBD3',
  /** Parlayan vurgu (kutlama, seçili sekme): karantina sarısı. */
  glow: '#F7DDA8', glowInk: '#7A5410',
  room: {
    yatak: '#CFD3CC', mutfak: '#E2D3B4', banyo: '#C8D6CF', salon: '#D6CFC4', calisma: '#C4C9CF',
    cocuk: '#E0CDBE', balkon: '#C9D8C2', antre: '#D9D6CE', camasir: '#C7CED6',
  } as Record<RoomType, string>,
};

export type Colors = typeof light;

const dark: Colors = {
  bg: '#1E2022', surface: '#2A2D30', surface2: '#34383C', ink: '#ECE7DC', muted: '#9EA2A6', line: '#3E4246',
  wall: '#ECE7DC', hatch: 'rgba(236,231,220,0.12)', shadow: 'rgba(0,0,0,0.5)', lift: 'rgba(0,0,0,0.4)',
  accent: '#F3B553', onAccent: '#1E2022', accentSoft: '#4A3F2A', hi: '#F3B553', warm: '#F3B553',
  onBadge: '#1E2022',
  late: '#D9534F', lateSoft: '#4A2C2B', today: '#F3B553', todaySoft: '#4A3F2A', ok: '#5CB85C', okSoft: '#2C4A2C',
  glow: '#4A3F2A', glowInk: '#F3B553',
  room: {
    yatak: '#3A4046', mutfak: '#4A4232', banyo: '#33433D', salon: '#463F3A', calisma: '#363E47',
    cocuk: '#4A3C36', balkon: '#34453A', antre: '#3B3D40', camasir: '#363C46',
  },
};

/** İki tema birden; React dışında (ör. ana ekran widget'ı) tema seçmek için. */
export const palettes = { light, dark };

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export const useIsDark = () => useColorScheme() === 'dark';

export const fonts = {
  display: 'Baloo2_600SemiBold',
  displayBold: 'Baloo2_700Bold',
  body: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyBlack: 'Nunito_800ExtraBold',
};

export const radius = { card: 24, tile: 20, plan: 9, pill: 999 };
