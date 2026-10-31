import { makeRoom, removeRoom } from './logic';
import type { AppState, RoomType } from './types';

/**
 * Ev planı şablonları ve ızgara boyutu (docs/skeleton-v3.md). Şablon tek dokunuşla çizilir,
 * sonra kullanıcı bloklarla düzenler. Harf → oda türü; aynı türden ikinci oda ayrı harfle.
 */

const LETTER: Record<string, RoomType> = {
  Y: 'yatak', Z: 'yatak', W: 'cocuk', M: 'mutfak', B: 'banyo', A: 'antre', S: 'salon', L: 'balkon', K: 'calisma',
};

export type PlanTemplate = { id: string; label: string; emoji: string; sub: string; rows: string[] };

export const TEMPLATES: PlanTemplate[] = [
  { id: 'studyo', label: 'Stüdyo', emoji: '🛋️', sub: '1 oda', rows: ['SSSMM', 'SSSMM', 'SSSSS', 'SSSAB', 'SSSAB', 'LLL..'] },
  { id: '1+1', label: '1+1', emoji: '🏠', sub: '2 oda', rows: ['YYYMMM', 'YYYMMM', 'YYYABB', 'SSSABB', 'SSSSSL', 'SSSSSL'] },
  { id: '2+1', label: '2+1', emoji: '🏡', sub: '3 oda', rows: ['YYYMMM', 'YYYMMM', 'YYYABB', 'ZZAABB', 'ZZSSSL', 'ZZSSSL', 'SSSSSL', '......'] },
  { id: '3+1', label: '3+1', emoji: '🏘️', sub: '4 oda', rows: ['YYYMMMM', 'YYYMMMM', 'YYYAABB', 'ZZZAABB', 'ZZZSSSL', 'WWWSSSL', 'WWWSSSL', 'WWWSSSS'] },
];

/** Planı temizleyip şablonu çizer (yerinde değiştirir). */
export function applyTemplate(S: AppState, t: PlanTemplate) {
  for (const id of [...S.order]) removeRoom(S, id);
  S.rows = t.rows.length;
  S.cols = t.rows[0].length;
  const ids: Record<string, string> = {};
  // Odalar planda soldan sağa, yukarıdan aşağı göründükleri sırayla oluşur.
  for (const ch of t.rows.join('')) if (LETTER[ch] && !ids[ch]) ids[ch] = makeRoom(S, LETTER[ch]);
  S.cells = [...t.rows.join('')].map(ch => ids[ch] ?? null);
}

export const GRID = { minCols: 4, maxCols: 9, minRows: 4, maxRows: 11 };

/** Izgarayı büyütür / küçültür; kalan bloklar yerinde durur, dışarıda kalanlar silinir. */
export function resizeGrid(S: AppState, cols: number, rows: number) {
  cols = Math.max(GRID.minCols, Math.min(GRID.maxCols, cols));
  rows = Math.max(GRID.minRows, Math.min(GRID.maxRows, rows));
  const next: (string | null)[] = Array(cols * rows).fill(null);
  for (let r = 0; r < Math.min(rows, S.rows); r++)
    for (let c = 0; c < Math.min(cols, S.cols); c++) next[r * cols + c] = S.cells[r * S.cols + c] ?? null;
  S.cols = cols;
  S.rows = rows;
  S.cells = next;
}

/** Geri al için planın anlık kopyası. */
export type PlanSnap = Pick<AppState, 'cols' | 'rows' | 'cells' | 'rooms' | 'order' | 'tasks' | 'mod'>;

export const snapOf = (S: AppState): PlanSnap =>
  JSON.parse(JSON.stringify({ cols: S.cols, rows: S.rows, cells: S.cells, rooms: S.rooms, order: S.order, tasks: S.tasks, mod: S.mod }));

export function restoreSnap(S: AppState, s: PlanSnap) {
  Object.assign(S, JSON.parse(JSON.stringify(s)));
}
