import { describe, expect, it } from '@jest/globals';

import { listTotal, logPurchases, lastMonths, parsePrice, setLimit, setPrice, spentIn } from '../budget';
import { monthGrid, monthItems, ymd } from '../calendar';
import { seed } from '../logic';
import { norm, searchAll } from '../search';
import { addShop, clearChecked, toggleShop } from '../shopping';

const NOW = new Date(2026, 10, 8, 12).getTime();

describe('takvim', () => {
  it('ay ızgarası pazartesiden başlar ve 7nin katıdır', () => {
    const g = monthGrid(2026, 10); // Kasım 2026: 1 Kasım pazar
    expect(g.length % 7).toBe(0);
    expect(g.indexOf(1)).toBe(6);
    expect(g.filter(x => x != null)).toHaveLength(30);
  });
  it('işler vade gününe, gecikenler bugüne yazılır', () => {
    const S = seed(NOW);
    const m = monthItems(S, 2026, 10, NOW);
    const all = Object.values(m).flat();
    expect(all.length).toBeGreaterThan(0);
    for (const [k, xs] of Object.entries(m)) for (const x of xs) if (x.late) expect(k).toBe(ymd(NOW));
  });
  it('başka aydaki işler sayılmaz', () => {
    const S = seed(NOW);
    const far = monthItems(S, 2030, 0, NOW);
    expect(Object.values(far).flat().filter(x => x.kind === 'task')).toHaveLength(0);
  });
});

describe('arama', () => {
  it('Türkçe işaretleri ve büyük harfi yok sayar', () => {
    expect(norm('ÇAMAŞIR')).toBe(norm('camasir'));
    expect(norm('IŞIK')).toBe(norm('isik'));
  });
  it('alışveriş ve odalarda bulur, kısa sorguda boş döner', () => {
    const S = seed(NOW);
    addShop(S, 'Çamaşır suyu', 'temizlik');
    expect(searchAll(S, 'c')).toEqual([]);
    expect(searchAll(S, 'camasir').some(h => h.group === 'Alışveriş')).toBe(true);
    const room = S.rooms[S.order[0]];
    expect(searchAll(S, room.name).some(h => h.group === 'Odalar')).toBe(true);
  });
  it('sonuç sayısı sınırlı', () => {
    const S = seed(NOW);
    expect(searchAll(S, 'ev', 3).length).toBeLessThanOrEqual(3);
  });
});

describe('bütçe', () => {
  it('fiyat ayrıştırır', () => {
    expect(parsePrice('12,5')).toBe(12.5);
    expect(parsePrice('abc')).toBeNull();
    expect(parsePrice('-3')).toBeNull();
  });
  it('alınanları temizleyince harcamaya yazılır', () => {
    const S = seed(NOW);
    addShop(S, 'Süt', 'market', NOW);
    addShop(S, 'Sabun', 'temizlik', NOW);
    for (const i of S.shop) setPrice(S, i.id, 40);
    expect(listTotal(S)).toBe(80);
    toggleShop(S, S.shop[0].id);
    expect(logPurchases(S, NOW)).toBe(40);
    S.budget = { limit: 0, log: [] };
    expect(clearChecked(S)).toBe(1);
    expect(spentIn(S).total).toBe(40);
    expect(lastMonths(S, 3).at(-1)?.total).toBe(40);
  });
  it('limit negatif olmaz', () => {
    const S = seed(NOW);
    setLimit(S, -5);
    expect(S.budget?.limit).toBe(0);
  });
});
