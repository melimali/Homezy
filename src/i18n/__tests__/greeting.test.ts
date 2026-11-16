import { beforeAll, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/supabase', () => ({ prefs: { get: () => null, set: () => {} } }));

import { greet } from '@/domain/greeting';
import { setLang, tx } from '../runtime';

beforeAll(() => setLang('en'));

it('EN: adlı selamlama İngilizce', () => {
  expect(greet(new Date(2026, 10, 4, 6), 'Melih')).toBe('Good morning Melih! ☀️');
  expect(tx(greet(new Date(2026, 10, 4, 19), 'Melih'))).toMatch(/^Good evening Melih/);
});

it('EN: adsız selamlama İngilizce', () => {
  expect(tx(greet(new Date(2026, 10, 4, 23)))).toMatch(/^Good night/);
});

it('EN: numaralı oda adları çevrilir', () => {
  expect(tx('Salon 2')).toBe('Living room 2');
  expect(tx('Yatak odası 3')).toBe('Bedroom 3');
});
