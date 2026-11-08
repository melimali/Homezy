import { describe, expect, it } from '@jest/globals';

import { circleHitsRect, flap, GAP, GROUND, H, hits, MR, mix, newFlap, night, playsToday, step, W } from '../flap';

describe('Moka Uçuş', () => {
  it('dokunmadan önce hareket yok', () => {
    const g = newFlap();
    expect(step(g, 0.5)).toBe(g);
  });
  it('dokunuş yukarı iter, yerçekimi düşürür, zemine çarpınca biter', () => {
    let g = flap(newFlap(), 0.5);
    const y0 = g.y;
    g = step(g, 0.1, 0.5);
    expect(g.y).toBeLessThan(y0);
    for (let i = 0; i < 100 && !g.over; i++) g = step(g, 0.05, 0.5);
    expect(g.over).toBe(true);
    expect(g.y + MR).toBeGreaterThan(H - GROUND - 1);
  });
  it('boşluktan geçince skor artar', () => {
    let g = flap(newFlap(), 0.5);
    const gapMid = g.pipes[0].gap + GAP / 2;
    for (let i = 0; i < 400 && !g.over && g.score === 0; i++) g = step({ ...g, y: gapMid, vy: 0 }, 0.02, 0.5);
    expect(g.over).toBe(false);
    expect(g.score).toBe(1);
  });
  it('kare hızından bağımsız: 1x0.04 ile 4x0.01 aynı yere gelir', () => {
    const a0 = flap(newFlap(), 0.5);
    let a = step(a0, 0.04, 0.5);
    let b = a0;
    for (let i = 0; i < 4; i++) b = step(b, 0.01, 0.5);
    expect(a.y).toBeCloseTo(b.y, 0);
    expect(a.dist).toBeCloseTo(b.dist, 3);
    a = step(a, 5, 0.5); // çok uzun kare kısıtlanır
    expect(a.dist - b.dist).toBeLessThan(10);
  });
  it('hızlı düşüş sınırlı', () => {
    let g = { ...flap(newFlap(), 0.5), y: 10 };
    g = step({ ...g, vy: 5000 }, 0.01, 0.5);
    expect(g.vy).toBeLessThanOrEqual(520);
  });
  it('çarpışma: daire-dikdörtgen', () => {
    expect(circleHitsRect(0, 0, 5, 10, 0, 10, 10)).toBe(false);
    expect(circleHitsRect(8, 5, 5, 10, 0, 10, 10)).toBe(true);
    expect(circleHitsRect(7, 15, 5, 10, 0, 10, 10)).toBe(false); // köşe boşluğu
  });
  it('sütuna değince biter, boşlukta kalınca bitmez', () => {
    const p = [{ id: 0, x: 60, gap: 100, amp: 0, ph: 0, passed: false }];
    expect(hits(50, p)).toBe(true);
    expect(hits(100 + GAP / 2, p)).toBe(false);
    expect(hits(100 + GAP + 20, p)).toBe(true);
  });
  it('sütunlar ekran dışında doğar, eskiyen silinir', () => {
    let g = flap(newFlap(), 0.5);
    expect(g.pipes[0].x).toBeGreaterThan(W);
    for (let i = 0; i < 300 && !g.over; i++) g = step({ ...g, y: g.pipes.find(p => p.x + 60 > 0)!.gap + GAP / 2, vy: 0 }, 0.02, 0.5);
    expect(g.pipes.length).toBeLessThan(5);
  });
  it('gün-gece 0..1 arası', () => {
    for (let s = 0; s < 40; s++) { const n = night(s, 50); expect(n).toBeGreaterThanOrEqual(0); expect(n).toBeLessThanOrEqual(1); }
    expect(night(0)).toBe(0);
    expect(night(12)).toBeCloseTo(1, 5);
  });
  it('renk karışımı', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#102030', '#ffffff', 0)).toBe('#102030');
  });
  it('günlük hak yeni günde sıfırlanır', () => {
    expect(playsToday({ day: 'a', plays: 3 }, 'a')).toBe(3);
    expect(playsToday({ day: 'a', plays: 3 }, 'b')).toBe(0);
    expect(playsToday(undefined, 'b')).toBe(0);
  });
});
