import { describe, expect, it } from '@jest/globals';

import { flap, H, newFlap, playsToday, step } from '../flap';

describe('Moka Uçuş', () => {
  it('dokunmadan önce hareket yok', () => {
    const g = newFlap();
    expect(step(g, 0.5)).toBe(g);
  });
  it('dokunuş yukarı iter, yerçekimi düşürür', () => {
    let g = flap(newFlap(), 0.5);
    const y0 = g.y;
    g = step(g, 0.1, 0.5);
    expect(g.y).toBeLessThan(y0);
    for (let i = 0; i < 100 && !g.over; i++) g = step(g, 0.05, 0.5);
    expect(g.over).toBe(true);
    expect(g.y + 14).toBeGreaterThan(H - 1);
  });
  it('boşluktan geçince skor artar', () => {
    let g = flap(newFlap(), 0.5);
    const gapMid = g.pipes[0].gap + 64;
    for (let i = 0; i < 400 && !g.over && g.score === 0; i++) {
      g = step({ ...g, y: gapMid, vy: 0 }, 0.02, 0.5);
    }
    expect(g.over).toBe(false);
    expect(g.score).toBe(1);
  });
  it('günlük hak yeni günde sıfırlanır', () => {
    expect(playsToday({ day: 'a', plays: 3 }, 'a')).toBe(3);
    expect(playsToday({ day: 'a', plays: 3 }, 'b')).toBe(0);
    expect(playsToday(undefined, 'b')).toBe(0);
  });
});
