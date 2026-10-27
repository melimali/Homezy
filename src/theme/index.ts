import { useColorScheme } from 'react-native';

import type { RoomType } from '@/domain/types';

/** Marka paleti (CLAUDE.md, "Görsel kimlik"). */
export const brand = {
  navy: '#283044',
  mint: '#EBF5EE',
  blue: '#78A1BB',
  clay: '#BFA89E',
  cocoa: '#8B786D',
};

const light = {
  // Düz 2D: zemin mint, kartlar bir ton açık, gölge yok; ayrım boşlukla ve tek renk çizgiyle.
  bg: brand.mint, surface: '#F8FCF9', surface2: '#DFEBE4', ink: brand.navy, muted: '#5C6B80', line: '#D3E1D8',
  wall: '#283044', hatch: 'rgba(40,48,68,0.12)', shadow: 'rgba(40,48,68,0.14)', lift: 'rgba(40,48,68,0.10)',
  accent: brand.navy, onAccent: brand.mint, accentSoft: '#D6E4EC', hi: brand.blue, warm: brand.cocoa, clay: brand.clay,
  onBadge: '#FFFFFF',
  late: '#B8584C', lateSoft: '#F3DCD6', today: '#7E6658', todaySoft: '#EADFD8', ok: '#4E7D98', okSoft: '#D6E4EC',
  /** Yumuşak, parlayan vurgu (kutlama, seçili sekme). */
  glow: '#F6E3C8', glowInk: '#8B5E3C',
  room: {
    yatak: '#CBDCE8', mutfak: '#E9DAD2', banyo: '#D3EADD', salon: '#DDD3CD', calisma: '#BCD0DD',
    cocuk: '#EED6CC', balkon: '#CDE4D3', antre: '#E0E3DE', camasir: '#C9D5E2',
  } as Record<RoomType, string>,
};

export type Colors = typeof light;

const dark: Colors = {
  bg: brand.navy, surface: '#333A4F', surface2: '#40465C', ink: brand.mint, muted: '#B3B8C4', line: '#4C5167',
  wall: '#EBF5EE', hatch: 'rgba(235,245,238,0.14)', shadow: 'rgba(10,14,24,0.45)', lift: 'rgba(10,14,24,0.35)',
  accent: brand.blue, onAccent: '#1C2232', accentSoft: '#3A5068', hi: brand.blue, warm: brand.clay, clay: brand.clay,
  onBadge: '#1C2232',
  late: '#E58C7E', lateSoft: '#583A3C', today: '#D2BBAF', todaySoft: '#54484A', ok: '#9CC0D6', okSoft: '#36506A',
  glow: '#5A4A3E', glowInk: '#F6D9B0',
  room: {
    yatak: '#3F5672', mutfak: '#5D4F4B', banyo: '#355349', salon: '#4F4655', calisma: '#365169',
    cocuk: '#634E49', balkon: '#38533F', antre: '#434A5E', camasir: '#3C4C66',
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

/** Boşluklar: ekran kenarı, bölümler arası, kart içi. */
export const space = { screen: 20, section: 22, card: 20 };
