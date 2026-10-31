import { answered, type Feel } from './mood';
import { roomClean } from './logic';
import { addDays, dayKey } from './play';
import type { AppState, DayKey, Play } from './types';

/**
 * Gelişim sekmesinin grafik verileri. Hepsi mevcut kayıtlardan hesaplanır (Play.log, days, frozen,
 * checkins, journal); yeni bir şey saklanmaz.
 */

const WD = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];

export type DayBar = { key: DayKey; label: string; n: number; today: boolean };

/** Son `days` günün tamamlanan iş sayısı (eskiden yeniye). */
export function dayBars(P: Play, now = Date.now(), days = 7): DayBar[] {
  const today = dayKey(now);
  return Array.from({ length: days }, (_, i) => {
    const key = addDays(today, i - (days - 1));
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1 - i));
    return { key, label: WD[d.getDay()], n: P.log[key]?.length ?? 0, today: key === today };
  });
}

export type DotMark = 'done' | 'ice' | 'miss' | 'today' | 'future';

/** Son 4 hafta, pazartesiden başlayan satırlar: yapıldı / donduruldu / kaçtı. */
export function monthDots(P: Play, now = Date.now()): { key: DayKey; mark: DotMark }[] {
  const today = dayKey(now);
  const wd = (new Date(now).getDay() + 6) % 7; // pazartesi 0
  const start = addDays(today, -wd - 21);
  const done = new Set(P.days);
  const ice = new Set(P.frozen);
  return Array.from({ length: 28 }, (_, i) => {
    const key = addDays(start, i);
    const mark: DotMark = key > today ? 'future' : done.has(key) ? 'done' : ice.has(key) ? 'ice' : key === today ? 'today' : 'miss';
    return { key, mark };
  });
}

const FEEL_SCORE: Record<Feel, number> = { enerjik: 5, iyi: 4, yorgun: 2, keyifsiz: 2, bunalmis: 1 };
const FEEL_EMOJI: Record<Feel, string> = { enerjik: '🤩', iyi: '🙂', yorgun: '😴', keyifsiz: '😔', bunalmis: '😵‍💫' };
const JOURNAL_SCORE: Record<string, number> = { '😄': 5, '🙂': 4, '😐': 3, '😴': 2, '😔': 1 };

export type MoodPoint = { key: DayKey; label: string; score: number | null; emoji: string | null };

/** Son `days` günün ruh hali: önce sabah check-in'i, yoksa günlükteki emoji. */
export function moodSeries(P: Play, now = Date.now(), days = 14): MoodPoint[] {
  return dayBars(P, now, days).map(({ key, label }) => {
    const ci = P.checkins?.[key] ?? null;
    if (answered(ci)) return { key, label, score: FEEL_SCORE[ci.feel], emoji: FEEL_EMOJI[ci.feel] };
    const m = P.journal[key]?.mood;
    if (m && JOURNAL_SCORE[m]) return { key, label, score: JOURNAL_SCORE[m], emoji: m };
    return { key, label, score: null, emoji: null };
  });
}

/** Odaların temizlik yüzdesi, en çok ilgi bekleyen önce. */
export function roomScores(S: AppState, now = Date.now()) {
  return S.order
    .filter(id => S.rooms[id])
    .map(id => ({ id, name: S.rooms[id].name, type: S.rooms[id].type, pct: roomClean(S, id, now) }))
    .sort((a, b) => a.pct - b.pct);
}

/** Moka'nın grafik altı yorumları: yapılanı öne çıkarır, eksikle suçlamaz. */
export function weekLine(bars: DayBar[]) {
  const total = bars.reduce((a, b) => a + b.n, 0);
  const active = bars.filter(b => b.n > 0).length;
  if (!total) return 'Bu hafta yeni başlıyoruz. Tek bir küçük iş yeter ☕';
  const best = bars.reduce((a, b) => (b.n > a.n ? b : a));
  return `Bu hafta evine ${total} iyilik yaptın, ${active} gün. En güzel gün: ${best.label} 🌷`;
}

export function moodLineOf(points: MoodPoint[]) {
  const known = points.filter(p => p.score != null) as (MoodPoint & { score: number })[];
  if (known.length < 2) return 'Sabah sorusuna cevap verdikçe ruh hali grafiğin oluşur.';
  const half = Math.floor(known.length / 2);
  const avg = (a: { score: number }[]) => a.reduce((s, p) => s + p.score, 0) / Math.max(1, a.length);
  const diff = avg(known.slice(half)) - avg(known.slice(0, half));
  if (diff > 0.4) return 'Son günlerde daha iyi hissediyorsun. Ne güzel 💛';
  if (diff < -0.4) return 'Biraz yorgun günler. Hafif işler seçelim, kendine de vakit ayır 🫖';
  return 'Ruh halin dengeli görünüyor. Böyle devam 🌿';
}
