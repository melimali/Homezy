import type { DayKey, Habits, RoomType, Task } from './types';

/**
 * Alışkanlık kütüphanesi, su ve uyku takibi. Veri `Play.habits` içinde (telefonda, yedeğe dahil, SQL gerekmez).
 * - Paketler: tek dokunuşla plana eklenen hazır rutinler. Eklenen paket `packs` içinde işaretlenir,
 *   işler `tag: 'h:<paket>'` ile eklenir ki paket kaldırılınca birlikte silinebilsin.
 * - Su: bardak sayısı, günlük hedef. Hedef tutunca günde bir kez puan (`gorev:alisk:su`).
 * - Uyku: yatış / kalkış saati. Hedef süreye yakınsa günde bir kez puan (`gorev:alisk:uyku`).
 * - Gün anahtarı play.ts ile döngü olmasın diye burada ayrıca hesaplanır.
 */

const pad = (n: number) => String(n).padStart(2, '0');
export const hKey = (ts = Date.now()): DayKey => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const hShift = (k: DayKey, n: number): DayKey => {
  const [y, m, d] = k.split('-').map(Number);
  return hKey(new Date(y, m - 1, d + n, 12).getTime());
};

export const emptyHabits = (): Habits => ({
  water: {}, waterGoal: 8, sleep: {}, sleepGoal: 8, bedtime: '23:00', wake: '07:00', packs: [],
});

/* ---------- paketler ---------- */

export type PackTask = { name: string; every: number; min: number };
export type Pack = { id: string; emoji: string; name: string; sub: string; room: RoomType[]; tasks: PackTask[] };

export const PACKS: Pack[] = [
  {
    id: 'spor', emoji: '🏃', name: 'Spor paketi', sub: 'Hareketli bir hafta', room: ['salon', 'balkon'],
    tasks: [
      { name: '20 dk yürüyüş', every: 2, min: 20 },
      { name: '10 dk esneme', every: 1, min: 10 },
      { name: 'Evde kuvvet antrenmanı', every: 3, min: 25 },
    ],
  },
  {
    id: 'uyku', emoji: '🌙', name: 'Uyku paketi', sub: 'Daha rahat bir gece', room: ['yatak'],
    tasks: [
      { name: 'Yatmadan 1 saat önce ekranı bırak', every: 1, min: 5 },
      { name: 'Odayı havalandır', every: 1, min: 5 },
      { name: 'Yarının işlerine göz at', every: 1, min: 5 },
    ],
  },
  {
    id: 'odak', emoji: '🎯', name: 'Odak paketi', sub: 'Dağınık zihne sakin bir masa', room: ['calisma'],
    tasks: [
      { name: 'Masayı topla', every: 1, min: 5 },
      { name: 'Günün 3 önemli işini yaz', every: 1, min: 5 },
      { name: '25 dk kesintisiz çalış', every: 1, min: 25 },
    ],
  },
  {
    id: 'sabah', emoji: '🌅', name: 'Sabah paketi', sub: 'Güne yumuşak başla', room: ['yatak', 'mutfak'],
    tasks: [
      { name: 'Yatağı topla', every: 1, min: 3 },
      { name: 'Bir bardak su iç', every: 1, min: 1 },
      { name: 'Pencereyi aç, derin nefes al', every: 1, min: 3 },
      { name: 'Sağlıklı bir kahvaltı', every: 1, min: 15 },
    ],
  },
  {
    id: 'aksam', emoji: '🌇', name: 'Akşam paketi', sub: 'Günü toparlayıp kapat', room: ['mutfak', 'salon'],
    tasks: [
      { name: 'Bulaşıkları toparla', every: 1, min: 10 },
      { name: 'Salonu 5 dk topla', every: 1, min: 5 },
      { name: 'Yarın için kıyafet hazırla', every: 1, min: 5 },
      { name: 'Günlüğe birkaç satır yaz', every: 1, min: 5 },
    ],
  },
];

export const packById = (id: string) => PACKS.find(p => p.id === id);

/** Paketin işlerinin gideceği oda: türü uyan ilk oda, yoksa ilk oda, hiç oda yoksa null (ev bakımı). */
export function packRoom(S: { order: string[]; rooms: Record<string, { type: RoomType }> }, p: Pack): string | null {
  for (const t of p.room) {
    const id = S.order.find(r => S.rooms[r]?.type === t);
    if (id) return id;
  }
  return S.order[0] ?? null;
}

/** Paketi ekler (zaten ekliyse bir şey yapmaz). `mk`: kimlik üreticisi. İşler hiç yapılmamış sayılır ("bugün" çıkar). */
export function addPack(
  H: Habits, tasks: Task[], p: Pack, mk: () => string,
): Task[] {
  if (H.packs.includes(p.id)) return tasks;
  H.packs = [...H.packs, p.id];
  return [...tasks, ...p.tasks.map(t => ({ id: mk(), name: t.name, every: t.every, last: null, min: t.min, tag: `h:${p.id}` }))];
}
/** Paketin işlerini siler. */
export function dropPack(H: Habits, tasks: Task[], id: string): Task[] {
  H.packs = H.packs.filter(x => x !== id);
  return tasks.filter(t => t.tag !== `h:${id}`);
}

/* ---------- su ---------- */

export const WATER_GOALS = [6, 8, 10, 12];
export const waterOf = (H: Habits, day: DayKey) => H.water[day] ?? 0;
export const waterPct = (H: Habits, day: DayKey) => Math.min(100, Math.round((100 * waterOf(H, day)) / Math.max(1, H.waterGoal)));
export const waterMet = (H: Habits, day: DayKey) => waterOf(H, day) >= H.waterGoal;
/** Bardak ekler / çıkarır (0-30 arası). */
export function addWater(H: Habits, day: DayKey, n: number) {
  const v = Math.max(0, Math.min(30, waterOf(H, day) + n));
  H.water = { ...H.water, [day]: v };
  // Eski günler şişmesin: son 60 gün.
  const keys = Object.keys(H.water).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - 60))) delete H.water[k];
}
/** Moka'nın su yorumu. */
export function waterLine(H: Habits, day: DayKey): string {
  const n = waterOf(H, day);
  const left = H.waterGoal - n;
  if (!n) return 'İlk bardak için güzel bir an 💧';
  if (left <= 0) return 'Hedef tamam, bugün çok iyisin 🌷';
  if (left === 1) return 'Son bir bardak kaldı!';
  return `${left} bardak daha, acelesi yok 💧`;
}

/* ---------- uyku ---------- */

const mins = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(n => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
};
/** Yatış saatinden kalkış saatine dakika; gece yarısını geçer (23:00 → 07:00 = 480). */
export function sleepMinutes(bed: string, wake: string): number {
  const d = mins(wake) - mins(bed);
  return d > 0 ? d : d + 1440;
}
export const fmtSleep = (m: number) => `${Math.floor(m / 60)} sa${m % 60 ? ` ${m % 60} dk` : ''}`;
export const sleepOf = (H: Habits, day: DayKey) => H.sleep[day] ?? null;
/** Hedefin en az %90'ı uyunduysa "yeterli" sayılır. */
export const sleepOk = (min: number, goalH: number) => min >= goalH * 60 * 0.9;
/** Uyku kaydı: `day` uyanılan gün. */
export function logSleep(H: Habits, day: DayKey, bed: string, wake: string) {
  H.sleep = { ...H.sleep, [day]: { bed, wake, min: sleepMinutes(bed, wake) } };
  const keys = Object.keys(H.sleep).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - 60))) delete H.sleep[k];
  H.bedtime = bed;
  H.wake = wake;
}
/** "HH:MM" saatini adım kadar (dk) kaydırır. */
export function shiftTime(t: string, step: number): string {
  const v = (((mins(t) + step) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(v / 60))}:${pad(v % 60)}`;
}

export type HBar = { key: DayKey; label: string; v: number; today: boolean };
const DAYS = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];
const label = (k: DayKey) => {
  const [y, m, d] = k.split('-').map(Number);
  return DAYS[new Date(y, m - 1, d, 12).getDay()];
};
/** Son 7 gün (eskiden yeniye). */
export function weekWater(H: Habits, now = Date.now()): HBar[] {
  const t = hKey(now);
  return Array.from({ length: 7 }, (_, i) => {
    const k = hShift(t, i - 6);
    return { key: k, label: label(k), v: waterOf(H, k), today: k === t };
  });
}
/** Son 7 gün uyku süresi, saat (bir ondalık). */
export function weekSleep(H: Habits, now = Date.now()): HBar[] {
  const t = hKey(now);
  return Array.from({ length: 7 }, (_, i) => {
    const k = hShift(t, i - 6);
    const s = H.sleep[k];
    return { key: k, label: label(k), v: s ? Math.round(s.min / 6) / 10 : 0, today: k === t };
  });
}
/** Haftalık ortalama uyku (dk), kayıt yoksa null. */
export function avgSleep(H: Habits, now = Date.now()): number | null {
  const xs = weekSleep(H, now).filter(b => b.v > 0);
  return xs.length ? Math.round((xs.reduce((a, b) => a + b.v, 0) / xs.length) * 60) : null;
}
export function sleepLine(H: Habits, now = Date.now()): string {
  const avg = avgSleep(H, now);
  if (avg == null) return 'Dün gece nasıl uyudun? Bir kayıt yeter ☕';
  if (sleepOk(avg, H.sleepGoal)) return 'Bu hafta uykun dengeli, Moka gurur duyuyor 🌙';
  return 'Biraz daha erken yatmayı dene, yarın bir tık daha iyi olur 🌙';
}
