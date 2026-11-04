import { hKey, waterMet, waterOf, waterPct } from '@/domain/habits';
import { dosesOn, doseState } from '@/domain/meds';
import { allTasks, doneToday, placeOf, shopItems } from '@/domain/logic';
import { dayKey, progressOf } from '@/domain/play';
import { tipOfDay } from '@/domain/tips';
import type { AppState } from '@/domain/types';

/** Widget'ta görünen bir iş. */
export type WidgetTask = { id: string; emoji: string; name: string; room: string; label: string; late: boolean };

/** Ana ekran widget'ının göstereceği her şey; React ve yerel modül olmadan hesaplanır. */
export type WidgetData = {
  tasks: WidgetTask[];
  /** Bugün yapılması gereken toplam iş (gecikenler dahil). */
  left: number;
  /** Bugün tamamlanan iş sayısı. */
  done: number;
  streak: number;
  /** Bugün bir şey yapıldı mı (seri bugün de sayıldı mı). */
  active: boolean;
  vacation: boolean;
  /** Bugünkü toplam iş (biten + kalan). */
  total: number;
  /** Moka'nın ruh hali. */
  mood: { emoji: string; line: string };
  tip: { emoji: string; text: string };
};

export function widgetData(S: AppState, now = Date.now()): WidgetData {
  const vacation = S.mode?.k === 'tatil';
  const refs = allTasks(S, now);
  const due = vacation ? [] : refs.filter(x => x.s.k !== 'ok').sort((a, b) => a.s.diff - b.s.diff);
  const p = progressOf(S.play, now);
  const doneN = refs.filter(x => doneToday(x.t, now)).length;
  const lateN = due.filter(x => x.s.k === 'late').length;
  const mood = vacation
    ? { emoji: '😎', line: 'Tatil modu' }
    : !due.length
      ? { emoji: '🥰', line: 'Çok mutlu' }
      : lateN > 2
        ? { emoji: '🥺', line: 'Seni bekliyor' }
        : doneN > 0
          ? { emoji: '😄', line: 'Harika gidiyor' }
          : { emoji: '🙂', line: 'Günaydın' };
  return {
    tasks: due.map(x => {
      const place = placeOf(S, x.rid);
      return {
        id: x.t.id,
        emoji: x.list === 'plants' ? '🪴' : place.emoji,
        name: x.t.name,
        room: place.name,
        label: x.s.label,
        late: x.s.k === 'late',
      };
    }),
    left: due.length,
    done: refs.filter(x => doneToday(x.t, now)).length,
    streak: p.streak,
    active: p.today,
    vacation,
    total: due.length + doneN,
    mood,
    // Günün cümlesini Moka (kakapo) söylüyor.
    tip: { emoji: '🦜', text: tipOfDay(now).text },
  };
}

/** Küçük çoklu widget'ın verisi: su, ilaç, market, aktif görev. */
export type MiniData = {
  streak: number;
  mood: { emoji: string; line: string };
  water: { n: number; goal: number; pct: number; met: boolean };
  /** Sıradaki ilaç dozu; `left` bugün işaretlenmemiş doz sayısı, `total` bugünkü doz. */
  med: { key: string; name: string; time: string; late: boolean; left: number; total: number } | null;
  shop: { id: string; name: string; more: number; total: number } | null;
  task: (WidgetTask & { more: number }) | null;
};

export function miniData(S: AppState, now = Date.now()): MiniData {
  const w = widgetData(S, now);
  const H = S.play.habits;
  const day = hKey(now);
  const doses = dosesOn(S, dayKey(now));
  const open = doses.filter(d => !d.mark);
  const next = open.find(d => doseState(d, now) !== 'later') ?? open[0];
  const shop = shopItems(S);
  const t = w.tasks[0];
  return {
    streak: w.streak,
    mood: w.mood,
    water: { n: waterOf(H, day), goal: H.waterGoal, pct: waterPct(H, day), met: waterMet(H, day) },
    med: next
      ? { key: next.key, name: next.med.name, time: next.time, late: doseState(next, now) === 'missed', left: open.length, total: doses.length }
      : doses.length ? { key: '', name: '', time: '', late: false, left: 0, total: doses.length } : null,
    shop: shop.length ? { id: shop[0].x.id, name: shop[0].x.name, more: shop.length - 1, total: shop.length } : null,
    task: t ? { ...t, more: w.tasks.length - 1 } : null,
  };
}
