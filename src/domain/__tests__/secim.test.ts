import { describe, expect, it } from '@jest/globals';

import { ROOM_POOL } from '../havuz';
import { ACTS, available, CATS, CTASKS, nextOf, roomHow, setChoice, starterThree, suggest } from '../secim';
import type { Growth } from '../types';
import { setLang, tx } from '../../i18n/runtime';

const G = (): Growth => ({ bonus: {} } as unknown as Growth);
const day = (n: number) => new Date(Date.UTC(2026, 10, 1) + n * 864e5).toISOString().slice(0, 10);

describe('secim', () => {
  it('kimlikler benzersiz, zincir ve etkinlik referansları geçerli, her işte nasıl yapılır var', () => {
    const ids = CTASKS.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of CTASKS) {
      expect(t.how.length).toBeGreaterThanOrEqual(2);
      if (t.after) expect(ids).toContain(t.after);
      if (t.act) expect(ACTS.some(a => a.id === t.act)).toBe(true);
      expect(CATS.some(c => c.id === t.cat)).toBe(true);
    }
  });
  it('her oda işinin nasıl yapılır adımı var', () => {
    for (const p of Object.values(ROOM_POOL).flat()) expect(roomHow(p.id).length).toBeGreaterThanOrEqual(2);
  });
  it('gün 1: 3 basit, farklı kategoriden iş; etkinlik ve zincir işi yok', () => {
    const s = starterThree(G(), day(0), ['ogrenci']);
    expect(s).toHaveLength(3);
    expect(new Set(s.map(t => t.cat)).size).toBe(3);
    for (const t of s) {
      expect(t.min).toBeLessThanOrEqual(3);
      expect(t.act).toBeUndefined();
      expect(t.after).toBeUndefined();
    }
  });
  it('etkinlik cevabı özel işi açar, cevapsızken görünmez', () => {
    expect(available(G(), { acts: [], kinds: [] }).some(t => t.id === 'pc1')).toBe(false);
    const a = available(G(), { acts: ['pc', 'shoes'], kinds: [] }).map(t => t.id);
    expect(a).toContain('pc1');
    expect(a).toContain('sh1');
    expect(suggest(G(), day(0), { acts: ['pc'], kinds: [] }, 5).some(t => t.id === 'pc1')).toBe(true);
  });
  it('zincir: ilk adım yapılınca sıradaki açılır ve öne çıkar', () => {
    const g = G();
    const ctx = { acts: ['pc' as const], kinds: [] };
    expect(available(g, ctx).some(t => t.id === 'pc2')).toBe(false);
    setChoice(g, day(0), 'pc1', 'done');
    expect(nextOf('pc1').map(t => t.id)).toEqual(['pc2']);
    expect(suggest(g, day(0), ctx, 5).some(t => t.id === 'pc2')).toBe(true);
  });
  it('öneriler çeşitli kategoriden; yapılan iş aynı gün yerinde kalır', () => {
    const g = G();
    const a = suggest(g, day(2), { acts: [], kinds: ['calisan'] }, 5);
    expect(new Set(a.map(t => t.cat)).size).toBe(5);
    setChoice(g, day(2), a[0].id, 'done');
    expect(suggest(g, day(2), { acts: [], kinds: ['calisan'] }, 5).map(t => t.id)).toContain(a[0].id);
    setChoice(g, day(2), a[1].id, 'skip');
    expect(suggest(g, day(2), { acts: [], kinds: ['calisan'] }, 5).map(t => t.id)).not.toContain(a[1].id);
  });
  it('İngilizce çeviriler eksiksiz', () => {
    setLang('en');
    const all = [
      ...CTASKS.flatMap(t => [t.title, ...t.how]),
      ...ACTS.map(a => a.label), ...CATS.map(c => c.label),
      ...Object.values(ROOM_POOL).flat().flatMap(p => roomHow(p.id)),
      'Evde neler yaparsın?',
    ];
    expect(all.filter(s => tx(s) === s)).toEqual([]);
    setLang('tr');
  });
});
