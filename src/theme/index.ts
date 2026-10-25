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
  bg: '#EBF5EE', surface: '#FBFDFB', surface2: '#E1ECE6', ink: '#283044', muted: '#5F6878', line: '#CFDCD5',
  wall: '#283044', hatch: 'rgba(40,48,68,0.12)', shadow: 'rgba(40,48,68,0.14)', lift: 'rgba(40,48,68,0.10)',
  accent: '#283044', onAccent: '#EBF5EE', accentSoft: '#D6E4EC', hi: '#78A1BB', warm: '#8B786D',
  onBadge: '#FFFFFF',
  late: '#B8584C', lateSoft: '#F3DCD6', today: '#7E6658', todaySoft: '#EADFD8', ok: '#4E7D98', okSoft: '#D6E4EC',
  room: {
    yatak: '#CBDCE8', mutfak: '#E9DAD2', banyo: '#D3EADD', salon: '#DDD3CD', calisma: '#BCD0DD',
    cocuk: '#EED6CC', balkon: '#CDE4D3', antre: '#E0E3DE', camasir: '#C9D5E2',
  } as Record<RoomType, string>,
};

export type Colors = typeof light;

const dark: Colors = {
  bg: '#283044', surface: '#313A51', surface2: '#3A4460', ink: '#EBF5EE', muted: '#A9B4C2', line: '#46506A',
  wall: '#EBF5EE', hatch: 'rgba(235,245,238,0.14)', shadow: 'rgba(10,14,24,0.45)', lift: 'rgba(10,14,24,0.35)',
  accent: '#78A1BB', onAccent: '#1C2232', accentSoft: '#3A5068', hi: '#78A1BB', warm: '#BFA89E',
  onBadge: '#1C2232',
  late: '#E58C7E', lateSoft: '#583A3C', today: '#D2BBAF', todaySoft: '#54484A', ok: '#9CC0D6', okSoft: '#36506A',
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

export const radius = { card: 22, plan: 9, pill: 999 };
