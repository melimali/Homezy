import { clampCount, safeCount } from '../safeNum';

describe('safeNum', () => {
  it('bozuk sayıyı 0 yapar', () => {
    expect(safeCount(NaN)).toBe(0);
    expect(safeCount(-5)).toBe(0);
    expect(safeCount(Infinity)).toBe(0);
    expect(safeCount('7')).toBe(0);
    expect(safeCount(4.4)).toBe(4);
  });
  it('sayaç ara değeri hedefi aşmaz, 0 altına inmez', () => {
    expect(clampCount(-8.8e16, 12)).toBe(0);
    expect(clampCount(9e20, 12)).toBe(12);
    expect(clampCount(NaN, 12)).toBe(12);
    expect(clampCount(5.4, 12)).toBe(5);
    expect(clampCount(3, -4)).toBe(0);
  });
});
