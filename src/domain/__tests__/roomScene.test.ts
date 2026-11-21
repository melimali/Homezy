import { describe, expect, it } from '@jest/globals';

import { clearNightCondition } from '@/domain/roomScene';

describe('Moka room night scene conditions', () => {
  it('returns a boolean during daytime instead of a renderable zero', () => {
    expect(clearNightCondition(0, 'clear')).toBe(false);
  });
});
