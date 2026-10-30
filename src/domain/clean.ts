import { allTasks, doneToday } from './logic';
import type { AppState, TaskRef } from './types';

/** Aynı aciliyette işlerin mantıklı sırası: önce yukarıdan toz, sonra süpürme, zemin silme, en son çöp. */
function phase(name: string) {
  const n = name.toLocaleLowerCase('tr-TR');
  if (/çöp/.test(n)) return 4;
  if (/paspas|zemin|yer sil/.test(n)) return 3;
  if (/süpür|halı|elektrik/.test(n)) return 2;
  if (/toz|cam|ayna|sil|yüzey|tezgah/.test(n)) return 0;
  return 1;
}

/**
 * Odada şimdi yapılacak işler, Moka'nın önerdiği sırayla: gecikenler, bugünküler, sonra
 * önümüzdeki 2 gün. Aynı gruptaki işler yukarıdan aşağıya (toz → süpür → paspas → çöp) dizilir.
 */
export function cleanQueue(S: AppState, rid: string, now = Date.now()): TaskRef[] {
  const bucket = (x: TaskRef) => (x.s.k === 'late' ? 0 : x.s.k === 'today' ? 1 : 2);
  return allTasks(S, now)
    .filter(x => x.rid === rid && !doneToday(x.t, now) && (x.s.k !== 'ok' || x.s.diff <= 2))
    .sort((a, b) => bucket(a) - bucket(b) || phase(a.t.name) - phase(b.t.name) || a.s.diff - b.s.diff);
}
