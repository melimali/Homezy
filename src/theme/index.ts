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
  bg: brand.mint, surface: '#FFFFFF', surface2: '#DCE9E1', ink: brand.navy, muted: '#4A5468', line: '#D3E0D8',
  wall: brand.navy, hatch: 'rgba(40,48,68,0.10)', shadow: 'rgba(40,48,68,0.14)', lift: 'rgba(40,48,68,0.08)',
  accent: '#4F7A5E', onAccent: '#FFFBF5', accentSoft: '#DCE9E1', hi: brand.blue, warm: '#7A5A3E', clay: brand.clay,
  onBadge: '#FFFFFF',
  fashion: '#F8E9E2', fashionSurface: '#FFF7F2', fashionInk: '#5A4650', fashionAccent: '#9A4A5E', fashionLine: '#F0D8D4',
  late: '#A5473D', lateSoft: '#F8E0DB', today: '#8A5530', todaySoft: '#FBE6D6', ok: '#3C6F5A', okSoft: '#DDEBE0',
  /** Yumuşak, parlayan vurgu (kutlama, seçili sekme). */
  glow: '#FBDDBF', glowInk: '#6F4426',
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
  bg: '#1C2230', surface: '#262E41', surface2: '#313A50', ink: '#EEF3EF', muted: '#A9B3C3', line: '#364058',
  wall: '#FBF4EA', hatch: 'rgba(251,244,234,0.14)', shadow: 'rgba(10,8,18,0.45)', lift: 'rgba(10,8,18,0.35)',
  accent: '#BFD8C4', onAccent: '#232230', accentSoft: '#3C5045', hi: '#9BB5C9', warm: '#E3B9A0', clay: brand.clay,
  onBadge: '#232230',
  fashion: '#4A3C43', fashionSurface: '#40353D', fashionInk: '#F6E4DC', fashionAccent: '#E3A3B0', fashionLine: '#5E4A53',
  late: '#E8A199', lateSoft: '#5A3B40', today: '#E3B9A0', todaySoft: '#54433F', ok: '#A9CBB6', okSoft: '#3A5048',
  glow: '#5E4A3E', glowInk: '#F6D9B0',
  night: '#161B27', nightCard: '#262E41', onNight: '#FBF4EA', cream: '#F3EAE0',
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

/**
 * Yazı ölçeği (tek yer): başlık 36 / 23 / 18, gövde 15–16, yardımcı 13.5 / 12. En küçük yazı 12.
 * Yazı rengi olan muted / warm / late / today / ok renkleri WCAG AA (4.5:1) için denendi.
 * Büyük yazı tipi ayarında taşmasın diye `T` yazıyı en çok 1.3 kat büyütür.
 */
export const type = { h1: 28, h2: 20, h3: 17, lead: 15.5, bold: 16, body: 15, small: 13.5, tiny: 12, maxScale: 1.3 };

/** Kartların altındaki sıcak gölge rengi (gölge her temada aynı tondan). */
export const warmShadow = '#B9805F';

export const radius = { card: 20, tile: 16, plan: 14, btn: 14, pill: 999 };

/** Boşluklar: ekran kenarı, bölümler arası, kart içi. */
export const space = { screen: 18, section: 18, card: 16 };
