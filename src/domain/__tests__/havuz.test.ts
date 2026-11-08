import { describe, expect, it } from '@jest/globals';

import { kindsOf, kindToday, KIND_POOL, LVLS, rotate, ROOM_POOL, roomSpark } from '../havuz';
import { mikroToday } from '../mikro';
import { DEFAULT_ANSWERS } from '../persona';
import { setLang, tx } from '../../i18n/runtime';

const day = (n: number) => new Date(Date.UTC(2026, 10, 1) + n * 864e5).toISOString().slice(0, 10);

describe('havuz', () => {
  it('her oda türünde her zorluktan iş var', () => {
    for (const pool of Object.values(ROOM_POOL)) for (const l of LVLS) expect(pool.some(p => p.lvl === l)).toBe(true);
  });
  it('rotasyon: bir tur içinde ve tur sınırında art arda tekrar yok', () => {
    const list = ['a', 'b', 'c', 'd', 'e'];
    for (let n = 0; n < 40; n++) {
      const turn = Math.floor(n / 5);
      if (n % 5 === 4) {
        const seen = new Set(Array.from({ length: 5 }, (_, i) => rotate(list, turn * 5 + i, 'x')));
        expect(seen.size).toBe(5);
      }
      expect(rotate(list, n, 'x')).not.toBe(rotate(list, n + 1, 'x'));
    }
  });
  it('oda dokunuşu: 3 zorluk, odalar arasında döner', () => {
    const rooms = [{ id: 'r1', type: 'yatak' as const }, { id: 'r2', type: 'mutfak' as const }];
    const a = roomSpark(day(0), rooms)!;
    const b = roomSpark(day(1), rooms)!;
    expect(a.tasks.map(t => t.lvl)).toEqual(LVLS);
    expect(a.rid).not.toBe(b.rid);
  });
  it('kişi türleri ve bugünün 2 farklı bonusu', () => {
    expect(kindsOf({ ...DEFAULT_ANSWERS, who: 'ogrenci', style: 'duzenli' })).toEqual(['ogrenci', 'duzenli']);
    expect(kindsOf({ ...DEFAULT_ANSWERS, who: 'anne' }, 'tembel')[0]).toBe('ebeveyn');
    expect(kindsOf(null).length).toBeGreaterThan(0);
    for (let i = 0; i < 20; i++) {
      const [x, y] = kindToday(day(i), ['ertelemeci']);
      expect(x.id).not.toBe(y.id);
    }
  });
  it('mini öneriler: 3 farklı, kişi türüne göre değişir', () => {
    const m = mikroToday(day(3), 'dengeli', {}, ['ogrenci']);
    expect(new Set(m.map(x => x.id)).size).toBe(m.length);
    expect(m.length).toBe(3);
  });
  it('İngilizce çeviriler eksiksiz', () => {
    setLang('en');
    const all = [
      ...Object.values(ROOM_POOL).flat().map(p => p.title),
      ...Object.values(KIND_POOL).flat().flatMap(b => [b.title, b.hint]),
    ];
    expect(all.filter(s => tx(s) === s)).toEqual([]);
    setLang('tr');
  });
});
