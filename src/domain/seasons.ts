import type { HouseTheme } from './types';

/**
 * Aylık mevsim paketi: o ay öne çıkan tema. Premium'a her ay yeni bir neden verir;
 * ücretsiz kullanıcı paketin önizlemesini görür, ilerlemesi hiç etkilenmez.
 */
export type SeasonPack = { month: number; name: string; emoji: string; theme: HouseTheme };

export const SEASON_PACKS: SeasonPack[] = [
  { month: 10, name: 'Sonbahar paketi', emoji: '🍂', theme: 'sonbahar' },
  { month: 11, name: 'Kasım paketi', emoji: '🍁', theme: 'sonbahar' },
  { month: 12, name: 'Kış kulübesi paketi', emoji: '❄️', theme: 'kis' },
  { month: 1, name: 'Kış kulübesi paketi', emoji: '⛄', theme: 'kis' },
  { month: 4, name: 'İlkbahar temizliği paketi', emoji: '🌸', theme: 'cottage' },
];

/** `now` ayının paketi (yoksa null). */
export const packFor = (now = Date.now()): SeasonPack | null =>
  SEASON_PACKS.find(p => p.month === new Date(now).getMonth() + 1) ?? null;
