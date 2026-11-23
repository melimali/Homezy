/**
 * 3D evde eşya yerleşim kuralları (saf fonksiyonlar, House3D.tsx kullanır ve testler sınar).
 * Izgara: `cells[r * cols + c]` oda kimliği ya da boş (null / '').
 */
export type Orient = 0 | 1 | 2 | 3;
type Cells = ReadonlyArray<string | null | undefined>;

const cellAt = (cells: Cells, cols: number, rows: number, r: number, c: number) =>
  r >= 0 && r < rows && c >= 0 && c < cols ? cells[r * cols + c] || null : null;

/** Bloğun sırtını verebileceği arka duvar: 0 kuzey, 1 batı, 2 arka duvar yok. */
export function wallRankOf(cells: Cells, cols: number, rows: number, i: number): 0 | 1 | 2 {
  const r = Math.floor(i / cols), c = i % cols, id = cells[i] || null;
  return cellAt(cells, cols, rows, r - 1, c) !== id ? 0 : cellAt(cells, cols, rows, r, c - 1) !== id ? 1 : 2;
}

/** Eşyanın sırtını vereceği duvar: önce arka duvarlar (kuzey 0, batı 1), yoksa ön (güney 2, doğu 3), hiçbiri yoksa 0. */
export function sideOfCell(cells: Cells, cols: number, rows: number, i: number): Orient {
  const r = Math.floor(i / cols), c = i % cols, id = cells[i] || null;
  const n = (dr: number, dc: number) => cellAt(cells, cols, rows, r + dr, c + dc) !== id;
  return n(-1, 0) ? 0 : n(0, -1) ? 1 : n(1, 0) ? 2 : n(0, 1) ? 3 : 0;
}

/** Blok içi (u, v, du, dv) koordinatını yöne göre aynalar. */
export const orientUV = (o: Orient, u: number, v: number, du = 0, dv = 0): [number, number, number, number] =>
  o === 0 ? [u, v, du, dv] : o === 1 ? [v, u, dv, du] : o === 2 ? [1 - u - du, v, du, dv] : [u, 1 - v - dv, du, dv];
