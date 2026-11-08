import { expect, it } from '@jest/globals';

import { TIPS, eligible, mayShow, pickTip, remember, EMPTY_MEM, type TipMem } from '../featureTips';
import type { AppState } from '../types';

const S = (o: Partial<{ journal: object; meds: unknown[]; sport: unknown[]; plots: unknown[] }> = {}) =>
  ({
    meds: o.meds ?? [],
    play: { journal: o.journal ?? {}, sport: o.sport ?? [], garden: { plots: o.plots ?? [] }, look: undefined, placed: {} },
  }) as unknown as AppState;
const ctx = { android: true, sportOpen: true };

it('kullanılan özelliğin ipucu çıkmaz', () => {
  const ids = eligible(S({ journal: { '2026-11-01': {} }, meds: [{}] }), ctx).map(t => t.id);
  expect(ids).not.toContain('journal');
  expect(ids).not.toContain('meds');
  expect(ids).toContain('garden');
});

it('iOS ve kilitli spor elenir', () => {
  const ids = eligible(S(), { android: false, sportOpen: false }).map(t => t.id);
  expect(ids).not.toContain('widget');
  expect(ids).not.toContain('sport');
});

it('son gösterilenler tekrar seçilmez', () => {
  let mem: TipMem = EMPTY_MEM;
  const seen: string[] = [];
  for (let i = 0; i < TIPS.length; i++) {
    const t = pickTip(S(), mem, ctx, () => 0)!;
    seen.push(t.id);
    mem = remember(mem, t.id, `d${i}`, i + 2);
  }
  expect(new Set(seen).size).toBe(seen.length - (seen.length - new Set(seen).size));
  expect(new Set(seen.slice(0, 4)).size).toBe(4);
});

it('günün ilk açılışı, ilk oturum, günde ikinci ve art arda açılışta çıkmaz', () => {
  const base = { today: 'g1', firstOfDay: false, sessionNo: 5, mem: EMPTY_MEM, roll: 0.1 };
  expect(mayShow(base)).toBe(true);
  expect(mayShow({ ...base, firstOfDay: true })).toBe(false);
  expect(mayShow({ ...base, sessionNo: 1 })).toBe(false);
  expect(mayShow({ ...base, mem: { ...EMPTY_MEM, day: 'g1' } })).toBe(false);
  expect(mayShow({ ...base, mem: { ...EMPTY_MEM, session: 4 } })).toBe(false);
  expect(mayShow({ ...base, roll: 0.9 })).toBe(false);
});
