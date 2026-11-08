import { describe, expect, it } from '@jest/globals';
import { streakBonus, taskPoints } from '../play';

describe('puan dengesi', () => {
  it('azalan getiri: 5x10, 5x5, 10x2, sonra 0 (günlük 95)', () => {
    let total = 0;
    for (let n = 0; n < 25; n++) total += taskPoints(n);
    expect(taskPoints(0)).toBe(10);
    expect(taskPoints(5)).toBe(5);
    expect(taskPoints(10)).toBe(2);
    expect(taskPoints(20)).toBe(0);
    expect(total).toBe(95);
  });
  it('seri bonusu 30 ile sınırlı', () => {
    expect(streakBonus(3)).toBe(6);
    expect(streakBonus(40)).toBe(30);
  });
});
