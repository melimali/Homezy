import { addDays, dayKey } from './play';
import type { DayKey, SportEntry, Workout, WorkoutGoal, WorkoutLevel } from './types';

/**
 * Premium: kişisel antrenman planı. İnternetsiz, basit kurallarla: hedefe göre sırayla dönen
 * antrenmanlar, seviyeye göre süre. Plan, kullanıcının seçtiği spor günlerine dağıtılır.
 */
export const GOALS: { id: WorkoutGoal; name: string; emoji: string }[] = [
  { id: 'form', name: 'Formda kal', emoji: '🙂' },
  { id: 'kilo', name: 'Kilo ver', emoji: '🔥' },
  { id: 'guc', name: 'Güçlen', emoji: '💪' },
  { id: 'esneklik', name: 'Esne, rahatla', emoji: '🧘' },
];

export const LEVELS: { id: WorkoutLevel; name: string }[] = [
  { id: 'yeni', name: 'Yeni başlıyorum' },
  { id: 'orta', name: 'Ara sıra yapıyorum' },
  { id: 'ileri', name: 'Düzenli yapıyorum' },
];

type Session = { type: string; what: string; base: number };

/** Hedefe göre sırayla dönen antrenmanlar. `type` spor ekranındaki türlerden biri. */
const ROTATION: Record<WorkoutGoal, Session[]> = {
  form: [
    { type: 'Yürüyüş', what: 'Tempolu yürüyüş', base: 30 },
    { type: 'Fitness', what: 'Tüm vücut: şınav, squat, plank', base: 20 },
    { type: 'Bisiklet', what: 'Rahat tempoda bisiklet', base: 30 },
    { type: 'Yoga', what: 'Esneme ve nefes', base: 20 },
  ],
  kilo: [
    { type: 'Yürüyüş', what: 'Hızlı yürüyüş', base: 40 },
    { type: 'Koşu', what: 'Yürü-koş aralıkları (1 dk koş, 2 dk yürü)', base: 25 },
    { type: 'Fitness', what: 'Devre antrenmanı: squat, lunge, jumping jack', base: 25 },
    { type: 'Bisiklet', what: 'Orta tempoda bisiklet', base: 40 },
  ],
  guc: [
    { type: 'Fitness', what: 'Üst vücut: şınav, dips, sırt', base: 30 },
    { type: 'Fitness', what: 'Bacak: squat, lunge, köprü', base: 30 },
    { type: 'Pilates', what: 'Karın ve core', base: 25 },
    { type: 'Yürüyüş', what: 'Toparlanma yürüyüşü', base: 25 },
  ],
  esneklik: [
    { type: 'Yoga', what: 'Sabah yogası', base: 20 },
    { type: 'Pilates', what: 'Mat pilates', base: 25 },
    { type: 'Yürüyüş', what: 'Doğada sakin yürüyüş', base: 30 },
    { type: 'Yoga', what: 'Akşam esneme ve gevşeme', base: 20 },
  ],
};

const LEVEL_FACTOR: Record<WorkoutLevel, number> = { yeni: 0.7, orta: 1, ileri: 1.4 };
const round5 = (n: number) => Math.max(10, Math.round(n / 5) * 5);

export type PlanDay = { day: DayKey; type: string; what: string; min: number };

/**
 * Bu haftanın (pazartesiden pazara) planı. `sportDays` Date.getDay() değerleri (0 pazar).
 * Hiç spor günü seçilmemişse pazartesi, çarşamba, cuma kullanılır.
 * Hafta numarasına göre sıra kayar, her hafta aynı gün aynı antrenman gelmesin.
 */
export function weekPlan(w: Workout, sportDays: number[], now = Date.now()): PlanDay[] {
  const today = dayKey(now);
  const monday = addDays(today, -((new Date(now).getDay() + 6) % 7));
  const days = sportDays.length ? sportDays : [1, 3, 5];
  const rot = ROTATION[w.goal];
  const week = Math.floor(new Date(now).getTime() / (7 * 864e5));
  const out: PlanDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i);
    const dow = (i + 1) % 7;
    if (!days.includes(dow)) continue;
    const s = rot[(out.length + week) % rot.length];
    out.push({ day: d, type: s.type, what: s.what, min: round5(s.base * LEVEL_FACTOR[w.level]) });
  }
  return out;
}

/** Pazartesiden başlayan son `n` haftanın toplam dakikaları (eskiden yeniye). */
export function weeklyMinutes(sport: SportEntry[], n: number, now = Date.now()) {
  const today = dayKey(now);
  const monday = addDays(today, -((new Date(now).getDay() + 6) % 7));
  return Array.from({ length: n }, (_, i) => {
    const start = addDays(monday, -7 * (n - 1 - i));
    const end = addDays(start, 7);
    const min = sport.filter(x => x.day >= start && x.day < end).reduce((a, x) => a + x.min, 0);
    return { start, min };
  });
}

/** Bu ayın türlere göre dakikaları, çoktan aza. */
export function monthByType(sport: SportEntry[], now = Date.now()) {
  const month = dayKey(now).slice(0, 7);
  const m: Record<string, number> = {};
  for (const x of sport) if (x.day.startsWith(month)) m[x.type] = (m[x.type] ?? 0) + x.min;
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}
