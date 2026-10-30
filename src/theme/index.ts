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
  // Pastel sıcak: krem zemin, şeftali / adaçayı / lavanta / gül vurguları (docs/tasarim-finch.md).
  bg: '#FBF4EA', surface: '#FFFBF5', surface2: '#F6E6DA', ink: '#3B3345', muted: '#7A6F80', line: '#EEDFD0',
  wall: '#3B3345', hatch: 'rgba(59,51,69,0.10)', shadow: 'rgba(150,100,90,0.16)', lift: 'rgba(150,100,90,0.10)',
  accent: '#7F9C86', onAccent: '#FFFBF5', accentSoft: '#E3EEE4', hi: '#9BB5C9', warm: '#A8806C', clay: brand.clay,
  onBadge: '#FFFFFF',
  fashion: '#F8E9E2', fashionSurface: '#FFF7F2', fashionInk: '#5A4650', fashionAccent: '#C57F8D', fashionLine: '#F0D8D4',
  late: '#C97B72', lateSoft: '#F8E0DB', today: '#B9805F', todaySoft: '#FBE6D6', ok: '#6F9A86', okSoft: '#DDEBE0',
  /** Yumuşak, parlayan vurgu (kutlama, seçili sekme). */
  glow: '#FBDDBF', glowInk: '#8B5E3C',
  /** Kutlama ekranının koyu zemini, üstündeki kart ve yazı. */
  night: '#3B3345', nightCard: '#4C4459', onNight: '#FBF4EA', cream: '#FFF8EE',
  /** Pastel vurgu seti. */
  peach: '#F7C9B0', peachSoft: '#FCE8DC', sage: '#BFD8C4', sageSoft: '#E6F0E8',
  lavender: '#D9CDEB', lavenderSoft: '#EEE8F6', rose: '#F2C6CF', roseSoft: '#FAE4E8',
  room: {
    yatak: '#D9CDEB', mutfak: '#F7C9B0', banyo: '#C9E2E4', salon: '#F2D9C4', calisma: '#C7D6E8',
    cocuk: '#F2C6CF', balkon: '#BFD8C4', antre: '#EADFD0', camasir: '#D4D9EE',
  } as Record<RoomType, string>,
};

export type Colors = typeof light;

const dark: Colors = {
  bg: '#2B2A35', surface: '#37364A', surface2: '#44425A', ink: '#FBF4EA', muted: '#BDB6C6', line: '#4E4B64',
  wall: '#FBF4EA', hatch: 'rgba(251,244,234,0.14)', shadow: 'rgba(10,8,18,0.45)', lift: 'rgba(10,8,18,0.35)',
  accent: '#BFD8C4', onAccent: '#232230', accentSoft: '#44584C', hi: '#9BB5C9', warm: '#E3B9A0', clay: brand.clay,
  onBadge: '#232230',
  fashion: '#4A3C43', fashionSurface: '#40353D', fashionInk: '#F6E4DC', fashionAccent: '#E3A3B0', fashionLine: '#5E4A53',
  late: '#E8A199', lateSoft: '#5A3B40', today: '#E3B9A0', todaySoft: '#54433F', ok: '#A9CBB6', okSoft: '#3A5048',
  glow: '#5E4A3E', glowInk: '#F6D9B0',
  night: '#211F2B', nightCard: '#37364A', onNight: '#FBF4EA', cream: '#F3EAE0',
  peach: '#B98672', peachSoft: '#4F3E3E', sage: '#6E8F78', sageSoft: '#34463D',
  lavender: '#8F82B5', lavenderSoft: '#403B58', rose: '#B5798A', roseSoft: '#4E3A46',
  room: {
    yatak: '#5A5078', mutfak: '#7A5A4E', banyo: '#3E5C60', salon: '#6B5646', calisma: '#40536E',
    cocuk: '#7A4F5E', balkon: '#46624C', antre: '#4E4A5C', camasir: '#464E72',
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

export const radius = { card: 28, tile: 24, plan: 14, pill: 999 };

/** Boşluklar: ekran kenarı, bölümler arası, kart içi. */
export const space = { screen: 22, section: 24, card: 20 };
