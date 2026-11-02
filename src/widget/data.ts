import { allTasks, doneToday, placeOf } from '@/domain/logic';
import { progressOf } from '@/domain/play';
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
