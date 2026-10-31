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
  if (S.cells2) S.cells2 = Array(S.cols * S.rows).fill(null);
}

export const GRID = { minCols: 4, maxCols: 9, minRows: 4, maxRows: 11 };

/** Izgarayı büyütür / küçültür; kalan bloklar yerinde durur, dışarıda kalanlar silinir. */
export function resizeGrid(S: AppState, cols: number, rows: number) {
  cols = Math.max(GRID.minCols, Math.min(GRID.maxCols, cols));
  rows = Math.max(GRID.minRows, Math.min(GRID.maxRows, rows));
  const fit = (src: (string | null)[]) => {
    const next: (string | null)[] = Array(cols * rows).fill(null);
    for (let r = 0; r < Math.min(rows, S.rows); r++)
      for (let c = 0; c < Math.min(cols, S.cols); c++) next[r * cols + c] = src[r * S.cols + c] ?? null;
    return next;
  };
  const cells2 = S.cells2 ? fit(S.cells2) : null;
  S.cells = fit(S.cells);
  S.cells2 = cells2;
  S.cols = cols;
  S.rows = rows;
}

/** Geri al için planın anlık kopyası. */
export type PlanSnap = Pick<AppState, 'cols' | 'rows' | 'cells' | 'cells2' | 'rooms' | 'order' | 'tasks' | 'mod'>;

export const snapOf = (S: AppState): PlanSnap =>
  JSON.parse(JSON.stringify({ cols: S.cols, rows: S.rows, cells: S.cells, cells2: S.cells2 ?? null, rooms: S.rooms, order: S.order, tasks: S.tasks, mod: S.mod }));

export function restoreSnap(S: AppState, s: PlanSnap) {
  Object.assign(S, JSON.parse(JSON.stringify(s)));
}

/* ---------- 2. kat (dubleks, Premium) ---------- */

export type Floor = 0 | 1;

/** Evin 2. katı var mı (en az bir blok çizilmiş). */
export const hasUpper = (S: Pick<AppState, 'cells2'>) => !!S.cells2?.some(Boolean);

/** Katın blokları. */
export const floorCells = (S: Pick<AppState, 'cells' | 'cells2'>, f: Floor) => (f === 1 ? S.cells2 ?? [] : S.cells);

/** Ekranlar `cells` okur; 2. katı göstermek için o katın bloklarıyla bir görünüm. */
export const floorView = <X extends AppState>(S: X, f: Floor): X => (f === 1 ? { ...S, cells: S.cells2 ?? Array(S.cols * S.rows).fill(null) } : S);

/** Odanın hangi katta olduğu (bloğu çoğunlukla nerede). Bloğu yoksa 0. */
export function roomFloor(S: Pick<AppState, 'cells' | 'cells2'>, id: string): Floor {
  const a = S.cells.filter(x => x === id).length;
  const b = S.cells2?.filter(x => x === id).length ?? 0;
  return b > a ? 1 : 0;
}

/** 2. katı açar (boş). */
export function addUpper(S: AppState) {
  S.cells2 ||= Array(S.cols * S.rows).fill(null);
}

/** 2. katı kaldırır; sadece orada olan odalar silinir. */
export function removeUpper(S: AppState) {
  const up = new Set((S.cells2 ?? []).filter(Boolean) as string[]);
  S.cells2 = null;
  for (const id of up) if (!S.cells.includes(id)) removeRoom(S, id);
}
