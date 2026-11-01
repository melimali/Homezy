import { prefs } from '@/lib/supabase';

/**
 * Hafif, telefonda kalan olay sayacı (docs/premium-retention-plan.md §4). Hiçbir yere gönderilmez;
 * paywall görüntüleme → deneme → ücretli oranı RevenueCat'ten, hangi anın işlediği buradan okunur.
 * Anahtar: `ad` ya da `ad:ayrıntı` (ör. `paywall_view:streak`).
 */
export type EventName = 
  | 'paywall_view' | 'paywall_buy' | 'paywall_close' | 'streak_mark' | 'levelup_peek' | 'season_peek'
  | 'app_open' | 'day_return' | 'first_task_done' | 'onboarding_done';

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

const FIRST_KEY = 'firstOpen';
const RETURN_DAYS = [1, 3, 7, 14, 30];

/** Telefondaki ilk açılış günü (YYYY-MM-DD, yerel); hoş geldin haftası bildirimleri de buradan sayılır. */
export const firstOpenDay = (): string | null => prefs.get(FIRST_KEY);

const dayStr = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Her açılışta çağrılır: ilk açılışı kaydeder, 1/3/7/14/30. günlerde `day_return` sayar (D1/D7 kohortu). */
export function trackOpen(now = Date.now()) {
  try {
    const today = dayStr(now);
    let first = prefs.get(FIRST_KEY);
    if (!first) {
      first = today;
      prefs.set(FIRST_KEY, first);
    }
    track('app_open');
    const age = Math.round((new Date(`${today}T12:00:00`).getTime() - new Date(`${first}T12:00:00`).getTime()) / 86400000);
    if (RETURN_DAYS.includes(age) && prefs.get(`ret${age}`) == null) {
      prefs.set(`ret${age}`, today);
      track('day_return', `d${age}`);
    }
  } catch {
    // Ölçüm uygulamayı bozmasın.
  }
}

/** Odak, Spor ve Evimin hikâyesi ilk iki gün sade kalır; 3. günden sonra (ya da 3 aktif gün olunca) açılır. */
export function extrasUnlocked(activeDays: number, now = Date.now()): boolean {
  if (activeDays >= 3) return true;
  const first = firstOpenDay();
  if (!first) return true;
  const age = Math.round((new Date(`${dayStr(now)}T12:00:00`).getTime() - new Date(`${first}T12:00:00`).getTime()) / 86400000);
  return age >= 2;
}
