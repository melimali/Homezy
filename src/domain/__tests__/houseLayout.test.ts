import { describe, expect, it } from '@jest/globals';

import { orientUV, sideOfCell, wallRankOf } from '@/domain/houseLayout';

// 3x3 ızgara: tek oda "a" ortada ve sağında "b".
const cells = [null, null, null, null, 'a', 'b', null, null, null];

describe('house layout', () => {
  it('prefers back walls (north, west) for prop orientation', () => {
    expect(sideOfCell(cells, 3, 3, 4)).toBe(0);
    const row = ['a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a'];
    expect(sideOfCell(row, 3, 3, 3)).toBe(1); // üstte aynı oda, solda ızgara kenarı: batı
  });
  it('falls back to front walls when no back wall', () => {
    const c = ['a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a'];
    expect(sideOfCell(c, 3, 3, 8)).toBe(2);
  });
  it('wall rank follows the same rule', () => {
    expect(wallRankOf(cells, 3, 3, 4)).toBe(0);
    const c = ['a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a'];
    expect(wallRankOf(c, 3, 3, 4)).toBe(2);
  });
  it('mirrors blocks without leaving the cell', () => {
    for (const o of [0, 1, 2, 3] as const) {
      const [u, v, du, dv] = orientUV(o, 0.1, 0.2, 0.3, 0.4);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(u + du).toBeLessThanOrEqual(1.0001);
      expect(v + dv).toBeLessThanOrEqual(1.0001);
    }
  });
});
