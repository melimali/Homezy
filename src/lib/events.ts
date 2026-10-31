import { prefs } from '@/lib/supabase';

/**
 * Hafif, telefonda kalan olay sayacı (docs/premium-retention-plan.md §4). Hiçbir yere gönderilmez;
 * paywall görüntüleme → deneme → ücretli oranı RevenueCat'ten, hangi anın işlediği buradan okunur.
 * Anahtar: `ad` ya da `ad:ayrıntı` (ör. `paywall_view:streak`).
 */
export type EventName = 'paywall_view' | 'paywall_buy' | 'paywall_close' | 'streak_mark' | 'levelup_peek' | 'season_peek';

const KEY = 'events';

export function track(name: EventName, detail?: string) {
  try {
    const all = JSON.parse(prefs.get(KEY) ?? '{}') as Record<string, number>;
    const k = detail ? `${name}:${detail}` : name;
    all[k] = (all[k] ?? 0) + 1;
    prefs.set(KEY, JSON.stringify(all));
  } catch {
    // Sayaç bozulduysa sessizce atlanır.
  }
}

export const eventCounts = (): Record<string, number> => {
  try {
    return JSON.parse(prefs.get(KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
};
