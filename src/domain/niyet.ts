import { addDays, dayKey, progressOf } from './play';
import type { AppState, DayKey } from './types';

/**
 * Disiplin araçları (docs/disiplin.md): if-then niyet, 2 dakika kuralı, akşam gün sonu, geri dönüş.
 * Ceza yok: kaçırılan gün suçlanmaz, dönüşte tek küçük işle başlanır.
 */

/** "Ne zaman" seçenekleri (kisilik.ts CUE_LABEL ile aynı anahtarlar). */
export const WHEN: { k: string; emoji: string; label: string }[] = [
  { k: 'kahve', emoji: '☕', label: 'Sabah kahvesiyle' },
  { k: 'is', emoji: '🏠', label: 'Eve gelince' },
  { k: 'yemek', emoji: '🍽️', label: 'Yemekten sonra' },
  { k: 'yatak', emoji: '🌙', label: 'Yatmadan önce' },
];

export type Intent = { day: DayKey; when: string; task: string; place: string };

/** Bugünün (ya da verilen günün) niyeti, varsa. */
export const intentFor = (S: AppState, day: DayKey): Intent | null => {
  const i = S.settings.intent;
  return i && i.day === day ? i : null;
};

/** Taslak üzerinde niyet koyar; aynı seçim tekrar seçilirse kaldırır. */
export function setIntent(D: AppState, it: Intent) {
  const cur = D.settings.intent;
  D.settings.intent = cur && cur.day === it.day && cur.when === it.when && cur.task === it.task ? null : it;
}

/** Kaç gün ara verildi (bugün henüz iş yoksa). 2 ve üstü "geri dönüş" sayılır. */
export function comeback(S: AppState, now = Date.now()): number {
  if (!S.play.days.length) return 0;
  const p = progressOf(S.play, now);
  return p.today ? 0 : p.resting;
}
export const COMEBACK_AFTER = 2;

/** Akşam gün sonu özeti saati (yerel saat). */
export const EVENING_HOUR = 19;
export const isEvening = (now = Date.now()) => new Date(now).getHours() >= EVENING_HOUR;

/** Yarının günü. */
export const tomorrow = (now = Date.now()) => addDays(dayKey(now), 1);

/** 2 dakika kuralı: sayaç süresi (saniye). */
export const TWO_MIN = 120;
