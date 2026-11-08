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
  it('seri bonusu yumuşak eğri, 30\'u geçmez', () => {
    expect(streakBonus(0)).toBe(0);
    expect(streakBonus(1)).toBe(2);
    expect(streakBonus(7)).toBe(11);
    expect(streakBonus(30)).toBe(26);
    expect(streakBonus(400)).toBe(30);
  });
});
