import { describe, expect, it } from '@jest/globals';
import { DAY } from '../constants';
import { applyTemplate, TEMPLATES } from '../plan-templates';
import { allTasks, emptyState, makeRoom, roomClean, seed, staggerFirstDay, statusIn } from '../logic';

const NOON = new Date('2026-11-03T12:00:00').getTime();

describe('seed', () => {
  it('altı oda ve görevler üretir', () => {
    const S = seed(NOON);
    expect(S.order.length).toBe(6);
    expect(Object.values(S.tasks).flat().length).toBeGreaterThan(10);
  });
});

describe('staggerFirstDay', () => {
  it('ilk günde en fazla `keep` iş bugün kalır', () => {
    const S = emptyState();
    for (const t of ['yatak', 'mutfak', 'banyo', 'salon', 'balkon', 'antre'] as const) makeRoom(S, t);
    staggerFirstDay(S, NOON, 6);
    expect(allTasks(S, NOON).filter(x => x.s.k !== 'ok').length).toBeLessThanOrEqual(6);
  });
});

describe('ilk gün şablonlar', () => {
  it('her şablonda ilk gün en fazla 6 iş bekler', () => {
    for (const t of TEMPLATES) {
      const S = emptyState();
      applyTemplate(S, t);
      staggerFirstDay(S, NOON);
      expect(allTasks(S, NOON).filter(x => x.s.k !== 'ok').length).toBeLessThanOrEqual(6);
    }
  });
});

describe('roomClean', () => {
  it('yüzde 0-100 arası döner', () => {
    const S = seed(NOON);
    for (const rid of S.order) {
      const v = roomClean(S, rid, NOON);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});

describe('statusIn', () => {
  it('fonksiyon tanımlı', () => {
    expect(typeof statusIn).toBe('function');
  });
});
