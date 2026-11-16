import { expect, it } from '@jest/globals';

import { mokaOutfit } from '../mokaOutfit';

it('hava mevsimden önce gelir', () => {
  expect(mokaOutfit('rain', 6, 0).gear).toBe('☂️');
  expect(mokaOutfit('clear', 6, 0, 12).gear).toBe('🕶️');
  expect(mokaOutfit('clear', 6, 0, 22).gear).toBeNull();
  expect(mokaOutfit('clear', 0, 0).gear).toBe('🧣');
  expect(mokaOutfit('clear', 3, 0).gear).toBe('🌸');
  expect(mokaOutfit('clear', 9, 0).gear).toBe('🍂');
});
it('seriye göre taç', () => {
  expect(mokaOutfit(null, 8, 3).crown).toBeNull();
  expect(mokaOutfit(null, 8, 7).crown).toBe('🎀');
  expect(mokaOutfit(null, 8, 30).crown).toBe('👑');
});
