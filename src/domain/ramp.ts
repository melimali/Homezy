import { answered } from './mood';
import { addDays, dayKey, forgivenGaps, progressOf } from './play';
import type { AppState, DayKey, Play } from './types';

/**
 * Kademeli başlangıç: disiplin bir günde kazanılmaz. İlk gün tek bir minik iş, sonra "çalışılan gün" sayısı
 * arttıkça günlük yük küçük adımlarla büyür. Aşama, hiç sıfırlanmayan toplam gün sayısına bağlıdır
 * (bir gün kaçırmak aşamayı düşürmez). İstenirse "Hepsini aç" ile atlanır (`Settings.rampOff`).
 */
export type Stage = { n: 1 | 2 | 3 | 4 | 5; from: number; name: string; emoji: string; cap: number; goal: number; line: string; moka: string };

export const STAGES: Stage[] = [
  { n: 1, from: 0, name: 'Tohum', emoji: '🌱', cap: 1, goal: 3, line: 'Bugün sadece 1 iş. Küçük başla, sayılır.', moka: 'İlk adımı attın! Küçük işler büyük alışkanlık olur ☕' },
  { n: 2, from: 3, name: 'Filiz', emoji: '🌿', cap: 2, goal: 3, line: 'Günde 2 küçük iş. Yavaş ve sağlam.', moka: '3 gün oldu! Artık günde 2 küçük iş var 🌿' },
  { n: 3, from: 7, name: 'Fidan', emoji: '🪴', cap: 3, goal: 4, line: 'Bir hafta oldu! Günde 3 iş.', moka: 'Bir hafta! Hedefin haftada 4 gün. Hâlâ yumuşak, hâlâ senin hızında 🪴' },
  { n: 4, from: 14, name: 'Çiçek', emoji: '🌸', cap: 5, goal: 5, line: 'İki hafta! Günde 5 iş.', moka: 'İki hafta boyunca geldin, çok güzel! Günde 5 işe çıkıyoruz 🌸' },
  { n: 5, from: 28, name: 'Düzen', emoji: '🏡', cap: 99, goal: 5, line: 'Düzen oturdu. Bütün işler açık.', moka: 'Bir ay! Bütün işler açıldı, düzen sende 🏡' },
];

/** Toplam çalışılan gün sayısına göre aşama. */
export const stageFor = (activeDays: number): Stage => [...STAGES].reverse().find(s => activeDays >= s.from) ?? STAGES[0];

export const nextStageOf = (st: Stage): Stage | null => STAGES[st.n] ?? null;

/**
 * Hafif gün: kişi "Hafif gün" dediyse ya da sabah sorusunda yorgun / bunalmış / keyifsiz ya da çok yoğun dediyse.
 * Bugün sadece 1-2 iş görünür; gün yine de sayılır (seri ve toplam gün).
 */
export function isLightDay(S: AppState, now = Date.now()): boolean {
  const k = dayKey(now);
  if (S.settings.lightDay === k) return true;
  const c = S.play.checkins?.[k] ?? null;
  return answered(c) && (c.feel === 'yorgun' || c.feel === 'bunalmis' || c.feel === 'keyifsiz' || c.busy === 'yogun');
}

/**
 * Zorluk uyarlaması: son 7 günün (bugün hariç) çalışılan gün sayısına göre günlük yük ±1 kayar.
 * 6-7 gün çalışıldıysa +1 ("biraz daha zorlayalım"), 0-2 gün çalışıldıysa -1 ("yükü hafiflettim").
 * En az 7 toplam gün gerekir; aşama sınırı değişmez, sadece onun etrafında kayar.
 */
export function loadAdjust(S: AppState, now = Date.now()): -1 | 0 | 1 {
  if (S.settings.rampOff || S.play.days.length < 7) return 0;
  if (stageFor(S.play.days.length).cap >= 99) return 0;
  const set = new Set(S.play.days);
  const today = dayKey(now);
  let a = 0;
  for (let i = 1; i <= 7; i++) if (set.has(addDays(today, -i))) a++;
  return a >= 6 ? 1 : a <= 2 ? -1 : 0;
}

/** Bugün gösterilecek en çok iş sayısı. Atlayanlar ve tatil dışında bütün işler için `Infinity`. */
export function dailyCap(S: AppState, now = Date.now()): number {
  if (S.settings.rampOff) return Infinity;
  const cap = Math.max(1, stageFor(S.play.days.length).cap + loadAdjust(S, now));
  let c = isLightDay(S, now) ? Math.min(cap, 2) : cap;
  // Geri dönüş: 2+ gün ara verildiyse bugün tek küçük işle başlanır; ilk iş bitince (gün sayılınca) normale döner.
  const p = S.play.days.length ? progressOf(S.play, now) : null;
  if (p && !p.today && p.resting >= 2) c = Math.min(c, 1);
  return c >= 99 ? Infinity : c;
}

/** En uzun seri (dondurulan günler zinciri bozmaz). Hiç sıfırlanmaz, sadece büyür. */
export function bestStreak(P: Play): number {
  const done = new Set(P.days);
  const all = [...done].sort();
  const ice = new Set([...P.frozen, ...forgivenGaps(P.days, P.frozen, all[all.length - 1] ?? '')]);
  if (!all.length) return 0;
  let best = 0;
  let run = 0;
  for (let d = all[0]; d <= all[all.length - 1]; d = addDays(d, 1)) {
    if (done.has(d)) best = Math.max(best, ++run);
    else if (!ice.has(d)) run = 0;
  }
  return best;
}

/** Bu hafta (pazartesiden) çalışılan gün sayısı ve hafta hedefi. */
export function weekGoal(S: AppState, now = Date.now()): { done: number; goal: number } {
  const today = dayKey(now);
  const wd = (new Date(now).getDay() + 6) % 7;
  const start: DayKey = addDays(today, -wd);
  const set = new Set(S.play.days);
  let done = 0;
  for (let i = 0; i <= wd; i++) if (set.has(addDays(start, i))) done++;
  const goal = S.settings.rampOff ? 5 : stageFor(S.play.days.length).goal;
  return { done, goal };
}

/** Yeni bir aşamaya geçildi ve Moka henüz kutlamadı mı. */
export const pendingStage = (S: AppState): Stage | null => {
  const st = stageFor(S.play.days.length);
  return st.n > (S.settings.rampSeen ?? 1) && S.play.days.length > 0 ? st : null;
};
