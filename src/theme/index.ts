import { createContext, createElement, useContext, type ReactNode } from 'react';
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
  bg: '#F7F2EA', surface: '#FFFDF9', surface2: '#EFE8DD', ink: brand.navy, muted: '#575064', line: '#E8DFD2',
  wall: brand.navy, hatch: 'rgba(40,48,68,0.10)', shadow: 'rgba(40,48,68,0.14)', lift: 'rgba(40,48,68,0.08)',
  accent: '#4F7A5E', onAccent: '#FFFBF5', accentSoft: '#E4EBDF', hi: brand.blue, warm: '#7A5A3E', clay: brand.clay,
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

/** Bir ekranı sistem temasından bağımsız açık (krem) temada tutar. */
const LockedScheme = createContext<'light' | 'dark' | null>(null);
export function ForceScheme({ scheme, children }: { scheme: 'light' | 'dark'; children: ReactNode }) {
  return createElement(LockedScheme.Provider, { value: scheme }, children);
}
function useScheme() {
  const sys = useColorScheme();
  return useContext(LockedScheme) ?? (sys === 'dark' ? 'dark' : 'light');
}

export function useColors(): Colors {
  return useScheme() === 'dark' ? dark : light;
}

export const useIsDark = () => useScheme() === 'dark';

export const fonts = {
  display: 'Baloo2_600SemiBold',
  displayBold: 'Baloo2_700Bold',
  body: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyBlack: 'Nunito_800ExtraBold',
  /** El yazısı (alışveriş not kağıdı). Yüklenemezse sistem yazı tipine düşer. */
  hand: 'Caveat_700Bold',
};

/**
 * Yazı ölçeği (tek yer): başlık 36 / 23 / 18, gövde 15–16, yardımcı 13.5 / 12. En küçük yazı 12.
 * Yazı rengi olan muted / warm / late / today / ok renkleri WCAG AA (4.5:1) için denendi.
 * Büyük yazı tipi ayarında taşmasın diye `T` yazıyı en çok 1.3 kat büyütür.
 */
export const type = { h1: 28, h2: 20, h3: 17, lead: 15.5, bold: 16, body: 15, small: 13.5, tiny: 12, maxScale: 1.3 };

/** Kartların altındaki sıcak gölge rengi (gölge her temada aynı tondan). */
export const warmShadow = '#B9805F';

/**
 * Tasarım sistemi (tek yer). Yeni ekran ya da bileşen yazarken sayı yazma, buradan al.
 * - `space`: 4'lük ızgara. `screen` / `section` / `card` eski adlar, aynı değerler.
 * - `radius`: kart 22 (CLAUDE.md "yaklaşık 22px"), karo 16, buton hap.
 * - `elevation`: üç gölge seviyesi; hepsi aynı sıcak tondan.
 * - `hit`: en küçük dokunma alanı (WCAG / Apple HIG 44pt).
 * - `motion`: süreler ve yay ayarları; hepsi `useNativeDriver` ile kullanılır.
 */
export const radius = { xs: 8, sm: 12, md: 16, card: 22, tile: 16, plan: 14, btn: 999, pill: 999, sheet: 30 };

export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, screen: 20, section: 20, card: 16 };

export const hit = 44;

export const elevation = {
  none: { shadowOpacity: 0, elevation: 0 },
  sm: { shadowColor: warmShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 1 },
  md: { shadowColor: warmShadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 14, elevation: 3 },
  lg: { shadowColor: warmShadow, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 8 },
} as const;

export const motion = {
  fast: 120,
  base: 220,
  slow: 360,
  /** Basınca esneme, sekme zıplaması. */
  spring: { friction: 6, tension: 180 },
  /** Beliriş. */
  enter: { friction: 8, tension: 70 },
} as const;
