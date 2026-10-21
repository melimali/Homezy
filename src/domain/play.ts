import { DAY } from './constants';
import type { AppState, DayKey, Play, PlayKind, Settings } from './types';

/**
 * Puan, seri ve seriyle inşa olan ev. Amaç: her gün uygulamaya biraz vakit ayırmak.
 * - Her iş (rutin ya da bitki) günde bir kez "Tamamladım" ile puan verir. Spor ve günlük de günde birer kez.
 * - Bir şey yapılan her gün evin inşaatı bir adım ilerler; 7. günde ev biter, sonraki ay güzelleşir.
 * - Gün kaçırılınca ev önce tozlanır, sonra çatlar, 3. günden itibaren her gün bir parçası çöker.
 *   Bir iş yapınca toz ve çatlaklar hemen gider, çöken parçalar her gün biri olmak üzere yeniden yapılır.
 * Hesap varsa puanı sunucu sayar (supabase/migrations/…_puan.sql); telefonun saatiyle oynamak işe yaramaz.
 */

export const POINTS: Record<PlayKind, number> = { gorev: 10, spor: 15, gunluk: 10 };
/** Günün ilk işinde seri bonusu: önceki seri gün sayısı × 2, en fazla 20. */
export const streakBonus = (prevStreak: number) => Math.min(20, prevStreak * 2);
/** Bir günde puan veren en fazla iş sayısı (yeni iş ekleyip puan toplamayı sınırlar). */
export const DAILY_TASK_CAP = 20;

const pad = (n: number) => String(n).padStart(2, '0');
export const dayKey = (ts = Date.now()): DayKey => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
/** Gün anahtarını o günün öğlesine çevirir (yaz saati kaymalarından etkilenmesin). */
export const dayTs = (k: DayKey) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d, 12).getTime();
};
export const addDays = (k: DayKey, n: number) => dayKey(dayTs(k) + n * DAY);

export const emptyPlay = (): Play => ({
  points: 0, days: [], owned: [], placed: {}, awarded: {}, log: {}, sport: [], journal: {}, pending: [], celebrated: 0,
});

export const defaultSettings = (): Settings => ({
  time: '09:00', routine: true, stock: true, laundry: true,
  streak: true, sport: true, sportTime: '18:00', sportDays: [1, 3, 5],
});

/** Eski sürümlerden ya da buluttan gelen veride eksik alanları tamamlar. */
export function normalize(S: AppState): AppState {
  S.settings = { ...defaultSettings(), ...(S.settings || {}) };
  S.play = { ...emptyPlay(), ...(S.play || {}) };
  return S;
}

/* ---------- seri ve ev ---------- */

/** Evin inşaatı ve süslenmesi. `level` bu kadar gün yapılınca açılır. */
export const STAGES: { level: number; name: string; emoji: string }[] = [
  { level: 1, name: 'Zemin kalasları döşendi', emoji: '🪵' },
  { level: 2, name: 'İskelet kuruldu', emoji: '🏗️' },
  { level: 3, name: 'Duvarlar yükseliyor', emoji: '🧱' },
  { level: 4, name: 'Duvarlar boyandı, zemin döşendi', emoji: '🎨' },
  { level: 5, name: 'Pencereler takıldı', emoji: '🪟' },
  { level: 6, name: 'Eşyalar yerleşti', emoji: '🛋️' },
  { level: 7, name: 'Evin inşa edildi', emoji: '🎉' },
  { level: 9, name: 'Bahçeye çim ekildi', emoji: '🌱' },
  { level: 12, name: 'Çiçekler açtı', emoji: '🌷' },
  { level: 15, name: 'Çalılar büyüdü', emoji: '🌳' },
  { level: 18, name: 'Bahçeye ağaç dikildi', emoji: '🌲' },
  { level: 22, name: 'Çit çekildi', emoji: '🪵' },
  { level: 26, name: 'Işık zinciri asıldı', emoji: '✨' },
  { level: 30, name: 'Taş yol döşendi', emoji: '🪨' },
  { level: 34, name: 'Kelebekler geldi', emoji: '🦋' },
  { level: 37, name: 'Altın yıldız! Rüya ev', emoji: '⭐' },
];
export const BUILT = 7;
export const MAX_LEVEL = 37;

export type HouseProgress = {
  /** Evin şu anki seviyesi (0: boş arsa). */
  level: number;
  /** Üst üste bir şey yapılan gün sayısı (bugün ya da dün biten). */
  streak: number;
  /** Bugün bir şey yapıldı mı. */
  today: boolean;
  /** Dünden geriye kaç gün kaçırıldı: 1 toz, 2 çatlak, 3+ çöküyor. */
  idle: number;
};

/**
 * Seri ve ev seviyesi, yapılan günlerin listesinden her seferinde baştan hesaplanır.
 * Bugün henüz bir şey yapılmadıysa bugün ceza sayılmaz; gün bitince sayılır.
 */
export function houseProgress(days: DayKey[], now = Date.now()): HouseProgress {
  const today = dayKey(now);
  const set = new Set(days);
  const sorted = [...set].filter(d => d <= today).sort();
  const active = set.has(today);
  let level = 0;
  let miss = 0;
  if (sorted.length) {
    for (let d = sorted[0]; d <= today; d = addDays(d, 1)) {
      if (set.has(d)) {
        level = Math.min(MAX_LEVEL, level + 1);
        miss = 0;
      } else if (d !== today) {
        miss++;
        if (miss >= 3) level = Math.max(0, level - 1);
      }
    }
  }
  let streak = 0;
  for (let d = active ? today : addDays(today, -1); set.has(d); d = addDays(d, -1)) streak++;
  return { level, streak, today: active, idle: active || !sorted.length ? 0 : miss };
}

export const stageFor = (level: number) => [...STAGES].reverse().find(s => s.level <= level) ?? null;
export const nextStage = (level: number) => STAGES.find(s => s.level > level) ?? null;

/** Evin durumu için tek satırlık, tatlı bir açıklama. */
export function houseLine(p: HouseProgress) {
  if (p.idle >= 3) return 'Ev yıkılmaya başladı 😢 Bugün bir iş yap, tamire başlayalım 🔨';
  if (p.idle === 2) return 'Duvarlarda çatlaklar var 😟 Bir iş yap, ev toparlansın.';
  if (p.idle === 1) return 'Ev biraz tozlandı 🌫️ Bir iş yap, tozu alalım!';
  if (!p.level) return 'Bugün bir iş tamamla, evinin inşaatı başlasın 🏗️';
  if (!p.today) return 'Bugün henüz bir şey yapmadın. Serin bozulmasın 🔥';
  const next = nextStage(p.level);
  return next ? `Sıradaki: ${next.emoji} ${next.name}` : 'Rüya evin tamam! Seriyi sürdür ⭐';
}

/* ---------- puan ---------- */

export const awardKey = (kind: PlayKind, ref: string) => (kind === 'gorev' ? `gorev:${ref}` : kind);
export const awardedToday = (P: Play, kind: PlayKind, ref: string, now = Date.now()) => P.awarded[awardKey(kind, ref)] === dayKey(now);

export type AwardResult = { awarded: boolean; points: number; before: HouseProgress; after: HouseProgress };

/**
 * Taslak state üzerinde puanı telefonda hemen verir ve sunucuya gönderilmek üzere sıraya koyar.
 * Sunucu cevap verince puan, günler ve eşyalar sunucudaki değerle değiştirilir.
 */
export function awardLocal(S: AppState, kind: PlayKind, ref: string, label: string, now = Date.now()): AwardResult {
  const P = S.play;
  const day = dayKey(now);
  const before = houseProgress(P.days, now);
  const key = awardKey(kind, ref);
  if (P.awarded[key] === day) return { awarded: false, points: 0, before, after: before };

  // Sadece bugünün kayıtları tutulur.
  for (const k of Object.keys(P.awarded)) if (P.awarded[k] !== day) delete P.awarded[k];
  P.awarded[key] = day;
  const tasksToday = Object.keys(P.awarded).filter(k => k.startsWith('gorev:')).length;
  let pts = kind === 'gorev' && tasksToday > DAILY_TASK_CAP ? 0 : POINTS[kind];
  if (!before.today) {
    pts += streakBonus(before.streak);
    P.days = [...P.days, day].sort();
  }
  P.points += pts;
  (P.log[day] ||= []).push(label);
  P.pending.push({ kind, ref: kind === 'gorev' ? ref : kind, day });
  return { awarded: true, points: pts, before, after: houseProgress(P.days, now) };
}

/** Puan alındıktan sonraki kısa mesaj; ev bir seviye atladıysa onu söyler. */
export function awardToast(r: AwardResult, what: string) {
  if (!r.awarded) return `${what} bugün zaten tamam ✓`;
  const up = r.after.level > r.before.level ? stageFor(r.after.level) : null;
  const repaired = r.before.idle > 0 ? ' Ev toparlanıyor 🔨' : '';
  if (up && up.level === r.after.level) return `+${r.points} puan ⭐ ${up.emoji} ${up.name}!${repaired}`;
  if (!r.before.today && r.after.streak > 1) return `+${r.points} puan ⭐ 🔥 ${r.after.streak} günlük seri!${repaired}`;
  return `+${r.points} puan ⭐ ${what} tamam.${repaired}`;
}

/** "Bugün neler yaptım" kayıtlarını son 120 günle sınırlar. */
export function pruneLog(P: Play, now = Date.now()) {
  const min = dayKey(now - 120 * DAY);
  for (const k of Object.keys(P.log)) if (k < min) delete P.log[k];
}
