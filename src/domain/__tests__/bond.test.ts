import { describe, expect, it } from '@jest/globals';
import { canGiveCoffee, giveCoffee, toNextGift, GIFT_FIRST } from '../bond';
import { emptyPlay } from '../play';
import type { AppState } from '../types';

const DAY = 86400000;
const at = (i: number) => new Date(2027, 2, 1 + i, 12).getTime();
const stateOf = (): AppState => ({ play: emptyPlay(), cols: 6, rows: 8, cells: ['salon', 'salon', null], cells2: [] }) as unknown as AppState;

describe('Moka ile bağ', () => {
  it('günde bir kahve verilir, ilk hediye 7. kahvede gelir, sonraki daha seyrek', () => {
    const S = stateOf();
    const gifts: number[] = [];
    for (let i = 0; i < 30; i++) {
      const now = at(i);
      S.play.days.push(new Date(now).toISOString().slice(0, 10).replace(/-0?/g, '-').replace(/^(\d+)-(\d+)-(\d+)$/, (_, y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`));
      expect(canGiveCoffee(S.play, now)).toBe(true);
      const r = giveCoffee(S, now);
      expect(r.ok).toBe(true);
      expect(giveCoffee(S, now).ok).toBe(false); // aynı gün ikinci kez olmaz
      if (r.gift) gifts.push(i + 1);
    }
    expect(gifts[0]).toBe(GIFT_FIRST);
    expect(gifts[1]! - gifts[0]!).toBe(GIFT_FIRST + 3);
    expect(S.play.owned).toHaveLength(gifts.length);
    expect(toNextGift(S.play)).toBeGreaterThan(0);
    expect(DAY).toBeGreaterThan(0);
  });

  it('hediye eve konur', () => {
    const S = stateOf();
    for (let i = 0; i < GIFT_FIRST; i++) {
      S.play.days.push(`2027-03-${String(1 + i).padStart(2, '0')}`);
      const r = giveCoffee(S, at(i));
      if (r.gift) expect(S.play.placed[r.gift.id]).toBe('salon');
    }
    expect(S.play.owned).toHaveLength(1);
  });
});
