import { DAY } from './constants';
import { allTasks, placeOf, sod } from './logic';
import type { AppState } from './types';

/** Takvimde bir günün kalemi. */
export type CalItem = { id: string; kind: 'task' | 'bill' | 'warranty' | 'pet'; emoji: string; title: string; sub: string; late?: boolean; url?: string };

/** `YYYY-MM-DD` (yerel saat). */
export const ymd = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Ay ızgarası: pazartesiden başlar, boş hücreler null. */
export function monthGrid(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const out: (number | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) out.push(d);
  while (out.length % 7) out.push(null);
  return out;
}

/**
 * Ay boyunca günlere dağıtılmış kalemler: işlerin vadesi (geciken işler bugüne yazılır),
 * faturalar (ayın günü), garanti bitişleri ve evcil bakım işleri. Anahtar: `YYYY-MM-DD`.
 */
export function monthItems(S: AppState, year: number, month: number, now = Date.now()): Record<string, CalItem[]> {
  const out: Record<string, CalItem[]> = {};
  const add = (k: string, it: CalItem) => void (out[k] ??= []).push(it);
  const today = sod(now);
  const lo = new Date(year, month, 1).getTime();
  const hi = new Date(year, month + 1, 1).getTime();

  for (const { t, rid, list, s } of allTasks(S, now)) {
    if (s.k === 'ok' && s.label.includes('dondu')) continue;
    const due = today + s.diff * DAY;
    const late = s.diff < 0 || (s.k === 'late');
    const at = late ? today : due;
    if (at < lo || at >= hi) continue;
    const p = placeOf(S, rid);
    add(ymd(at), { id: `${list}:${t.id}`, kind: 'task', emoji: p.emoji, title: t.name, sub: p.name, late: late || undefined, url: rid === '_ev' ? '/bakim' : `/oda/${rid}` });
  }

  for (const b of S.bills ?? []) {
    const last = new Date(year, month + 1, 0).getDate();
    const d = new Date(year, month, Math.min(Math.max(1, b.day), last));
    add(ymd(d.getTime()), { id: `bill:${b.id}`, kind: 'bill', emoji: '🧾', title: b.name, sub: 'Fatura', url: '/bakim' });
  }
  for (const w of S.warranties ?? []) {
    if (w.end >= lo && w.end < hi) add(ymd(w.end), { id: `war:${w.id}`, kind: 'warranty', emoji: '📜', title: w.name, sub: 'Garanti bitiyor', url: '/bakim' });
  }
  for (const p of S.pets ?? [])
    for (const it of p.items) {
      const due = (it.last ?? it.start) + it.everyH * 36e5;
      const at = Math.max(sod(due), today);
      if (at >= lo && at < hi) add(ymd(at), { id: `pet:${it.id}`, kind: 'pet', emoji: it.emoji, title: `${it.name} (${p.name})`, sub: 'Evcil hayvan', url: '/evcil' });
    }
  return out;
}
