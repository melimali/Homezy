import { expect, it } from '@jest/globals';

import { achievements } from '../achievements';
import { emptyState } from '../logic';

it('35 rozet: kolay/orta/zor dağılımı ve benzersiz kimlik', () => {
  const list = achievements(emptyState(), Date.now());
  expect(list.length).toBe(35);
  expect(new Set(list.map(a => a.id)).size).toBe(35);
  const n = (t: string) => list.filter(a => a.tier === t).length;
  expect([n('kolay'), n('orta'), n('zor')]).toEqual([15, 12, 8]);
  expect(list.filter(a => a.on).map(a => a.id)).toEqual([]);
});
