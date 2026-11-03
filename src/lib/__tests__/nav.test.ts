import { beforeEach, expect, it, jest } from '@jest/globals';

jest.mock('expo-router', () => ({ router: { push() {}, navigate() {}, replace() {} }, useRouter: () => ({}) }));

import { allowNav, resetNavGuard } from '../nav';

beforeEach(() => resetNavGuard());

it('aynı rota hızlı ikinci kez açılmaz, sonra açılır', () => {
  expect(allowNav('/magaza', 1000)).toBe(true);
  expect(allowNav('/magaza', 1100)).toBe(false);
  expect(allowNav('/magaza', 1800)).toBe(false);
  expect(allowNav('/magaza', 2000)).toBe(true);
});

it('farklı rota çok hızlı gelirse yok sayılır, biraz sonra geçer', () => {
  expect(allowNav('/bahce', 1000)).toBe(true);
  expect(allowNav('/gunluk', 1100)).toBe(false);
  expect(allowNav('/gunluk', 1300)).toBe(true);
});

it('nesne rotaları anahtarlanır', () => {
  const r = { pathname: '/oda/[id]', params: { id: 'a' } };
  expect(allowNav(r, 1000)).toBe(true);
  expect(allowNav({ ...r }, 1400)).toBe(false);
});
