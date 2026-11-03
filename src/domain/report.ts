import { answered, FEELS, type Feel } from './mood';
import { readMin } from './growth';
import { addDays, dayKey, progressOf } from './play';
import type { AppState, DayKey } from './types';

const SCORE: Record<Feel, number> = { enerjik: 5, iyi: 4, yorgun: 2, bunalmis: 1, keyifsiz: 1 };
const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export type WeekReport = {
  /** Son 7 gün, eskiden yeniye: o gün tamamlanan iş sayısı. */
  days: { key: DayKey; label: string; n: number }[];
  total: number;
  /** En çok iş yapılan gün (hiç iş yoksa null). */
  bestDay: string | null;
  /** Ortalama ruh hali emojisi (check-in yoksa null). */
  mood: { emoji: string; label: string } | null;
};

/** Premium ayrıntılı haftalık rapor: gün gün iş sayısı, en verimli gün, ruh hali ortalaması. */
export function weekReport(S: AppState, now = Date.now()): WeekReport {
  const today = dayKey(now);
  const days = Array.from({ length: 7 }, (_, i) => {
    const key = addDays(today, i - 6);
    const [y, m, d] = key.split('-').map(Number);
    return { key, label: GUN[new Date(y, m - 1, d).getDay()].slice(0, 3), n: S.play.log[key]?.length ?? 0 };
  });
  const total = days.reduce((a, d) => a + d.n, 0);
  const top = days.reduce((a, d) => (d.n > a.n ? d : a), days[0]);
  const feels = days.map(d => S.play.checkins?.[d.key]).filter(answered).map(c => SCORE[c.feel]);
  let mood: WeekReport['mood'] = null;
  if (feels.length) {
    const avg = feels.reduce((a, b) => a + b, 0) / feels.length;
    const f = FEELS.reduce((a, b) => (Math.abs(SCORE[b.id] - avg) < Math.abs(SCORE[a.id] - avg) ? b : a));
    mood = { emoji: f.emoji, label: f.label };
  }
  return { days, total, bestDay: top.n ? top.label : null, mood };
}

export type MokaWeek = {
  chores: number;
  activeDays: number;
  streak: number;
  mood: { emoji: string; label: string; n: number } | null;
  readMin: number;
  pages: number;
  /** Moka'nın cümlesi: yapılanı öne çıkarır, suçlamaz. */
  line: string;
};

/** Moka'nın haftalık raporu: iş, seri, ruh hali, okuma. Son 7 gün. */
export function mokaWeek(S: AppState, now = Date.now()): MokaWeek {
  const r = weekReport(S, now);
  const today = dayKey(now);
  const keys = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const activeDays = r.days.filter(d => d.n > 0).length;
  const G = S.play.growth;
  const mins = keys.reduce((a, k) => a + readMin(G, k), 0);
  const pages = G.reads.filter(x => keys.includes(x.day)).reduce((a, x) => a + x.pages, 0);
  const n = keys.filter(k => answered(S.play.checkins?.[k] ?? null)).length;
  const mood = r.mood ? { ...r.mood, n } : null;
  const streak = progressOf(S.play, now).streak;
  let line: string;
  if (!r.total && !mins) line = 'Bu hafta sakin geçti. Yeni haftaya minik bir işle başlayalım, ben yanındayım ☕';
  else if (mood && ['😴', '😔', '😵‍💫'].includes(mood.emoji)) line = `Biraz yorucu bir hafta olmuş ama ${r.total} iş yaptın. Kendine nazik ol 💛`;
  else line = `${activeDays} gün evine vakit ayırdın, ${r.total} iş yaptın${streak >= 3 ? `, seri ${streak} gün` : ''}. Gurur duyuyorum 🌷`;
  return { chores: r.total, activeDays, streak, mood, readMin: mins, pages, line };
}

/** Bildirim metni: kısa, tek satır. */
export function mokaWeekBody(w: MokaWeek): string {
  const bits = [`${w.chores} iş`, `${w.activeDays} gün`];
  if (w.streak) bits.push(`🔥 ${w.streak}`);
  if (w.mood) bits.push(w.mood.emoji);
  if (w.readMin) bits.push(`📖 ${w.readMin} dk`);
  return `${bits.join(' · ')}. ${w.line}`;
}
