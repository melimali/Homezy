import type { SkyKind } from '@/lib/weather';

/** Moka'nın üstündeki küçük aksesuarlar (emoji). Hava > mevsim sırası; seri 7+ ise ayrıca taç. */
export type MokaOutfit = { gear: string | null; crown: string | null };

export function mokaOutfit(sky: SkyKind | null, month: number, streak: number, hour = 12): MokaOutfit {
  let gear: string | null = null;
  if (sky === 'rain' || sky === 'storm') gear = '☂️';
  else if (sky === 'snow') gear = '🧣';
  else if (month === 11 || month <= 1) gear = '🧣';
  else if (month >= 5 && month <= 7 && hour >= 8 && hour < 19) gear = '🕶️';
  else if (month >= 2 && month <= 4) gear = '🌸';
  else if (month >= 9 && month <= 10) gear = '🍂';
  const crown = streak >= 30 ? '👑' : streak >= 7 ? '🎀' : null;
  return { gear, crown };
}
