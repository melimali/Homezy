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

it("router yöntemleri çağrı anında okunur (expo-router ilk render sonrası yöntemleri yerinde değiştirir)", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const base = (require('expo-router') as { router: { push: (h: string) => void } }).router;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { router } = require('../nav') as { router: { push: (h: string) => void } };
  resetNavGuard();
  base.push = () => {
    throw new Error('The imperative router is unavailable before the first render has finished.');
  };
  expect(() => router.push('/x')).toThrow(/unavailable/);
  const seen: string[] = [];
  base.push = (h: string) => { seen.push(h); };
  jest.useFakeTimers({ now: 5000000 });
  expect(() => router.push('/y')).not.toThrow();
  expect(seen).toEqual(['/y']);
  jest.useRealTimers();
});
