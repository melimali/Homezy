import { answered, FEELS, type Feel } from './mood';
import { addDays, dayKey } from './play';
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
