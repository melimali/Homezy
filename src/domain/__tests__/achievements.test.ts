import { expect, it } from '@jest/globals';

import { achievements } from '../achievements';
import { emptyState } from '../logic';

it('37 rozet (60 ve 365 günlük kahve rozetleri dahil): kolay/orta/zor dağılımı ve benzersiz kimlik', () => {
  const list = achievements(emptyState(), Date.now());
  expect(list.length).toBe(37);
  expect(new Set(list.map(a => a.id)).size).toBe(37);
  const n = (t: string) => list.filter(a => a.tier === t).length;
  expect([n('kolay'), n('orta'), n('zor')]).toEqual([15, 12, 10]);
  expect(list.filter(a => a.on).map(a => a.id)).toEqual([]);
});
