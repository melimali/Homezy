import { addDays, dayKey, progressOf, type HouseProgress } from './play';
import type { Play } from './types';

/**
 * Seri = Moka'nın kahve sürahisi (docs/moka-oda-usta-plan.md §4). Sürahi hep dolu; fark buhar ve hale.
 * Sayı tek kaynaktan gelir (`progressOf`); yeni hesap ya da veri alanı yok.
 */
export type PotState = 'fresh' | 'wait' | 'warm' | 'cold' | 'first';

export function potState(P: Play, now = Date.now(), hp: HouseProgress = progressOf(P, now)): PotState {
  if (hp.streak > 0 && hp.today) return 'fresh';
  if (hp.streak > 0) return P.frozen.includes(addDays(dayKey(now), -1)) ? 'warm' : 'wait';
  return P.days.length ? 'cold' : 'first';
}

/** Buhar çizgisi sayısı: taze 3, bekliyor / ılık 1, soğuk 0. */
export const potSteam = (s: PotState) => (s === 'fresh' ? 3 : s === 'wait' || s === 'warm' ? 1 : 0);

/** Kahve rozetleri: seri rozetlerinin kahve adları (kimlik ve koşul aynı, src/domain/achievements.ts). */
export const COFFEE_STEPS = [
  { id: 'seri-3', n: 3, name: 'İlk Demleme' },
  { id: 'seri-7', n: 7, name: 'Her Gün Taze Filtre' },
  { id: 'seri-14', n: 14, name: 'French Press Ustası' },
  { id: 'seri-30', n: 30, name: 'Barista' },
  { id: 'seri-60', n: 60, name: 'Cold Brew Sabrı' },
  { id: 'seri-100', n: 100, name: 'Altın Çekirdek' },
  { id: 'seri-365', n: 365, name: 'Kahve Efsanesi' },
] as const;

/** Bir sonraki kahve rozeti ve ona ilerleme (en uzun seriye göre); hepsi alındıysa null. */
export function nextCoffee(best: number) {
  const step = COFFEE_STEPS.find(s => best < s.n);
  return step ? { ...step, have: best } : null;
}
