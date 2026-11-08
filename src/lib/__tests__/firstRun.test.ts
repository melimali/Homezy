import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';

import { GAP, createQueue } from '../firstRun';

jest.mock('@/lib/supabase', () => ({ prefs: { get: () => null, set: () => {} } }));

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });

it('aynı anda tek pencere, öncelik sırasıyla, aralıklı', () => {
  const q = createQueue();
  q.want('mood', true);
  q.want('welcome', true);
  expect(q.current).toBe(null);
  jest.advanceTimersByTime(GAP);
  expect(q.current).toBe('welcome');
  q.want('welcome', false);
  expect(q.current).toBe(null);
  jest.advanceTimersByTime(GAP - 1);
  expect(q.current).toBe(null);
  jest.advanceTimersByTime(1);
  expect(q.current).toBe('mood');
});

it('sonradan gelen yüksek öncelikli, açık olanı bölmez', () => {
  const q = createQueue();
  q.want('levelUp', true);
  jest.advanceTimersByTime(GAP);
  q.want('welcome', true);
  expect(q.current).toBe('levelUp');
  q.want('levelUp', false);
  jest.advanceTimersByTime(GAP);
  expect(q.current).toBe('welcome');
});
