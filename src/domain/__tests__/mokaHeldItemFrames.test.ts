import { expect, it } from '@jest/globals';

import { cosmeticArtworkBounds } from '../../constants/cosmeticFrames';
import { OUTFIT_HELD_OBJECT_BOUNDS } from '../../constants/mokaHeldItemFrames';
import { WORN_CLOTHES } from '../../constants/wornClothes';
import { COSMETICS } from '../kozmetik';

it('covers every body outfit and hand item without exposing arms', () => {
  const bodyItems = COSMETICS.filter(item => item.slot === 'govde').map(item => item.id).sort();
  expect(Object.keys(WORN_CLOTHES).sort()).toEqual(bodyItems);

  const handItems = COSMETICS.filter(item => item.slot === 'el').map(item => item.id).sort();
  expect(Object.keys(OUTFIT_HELD_OBJECT_BOUNDS).sort()).toEqual(handItems);

  for (const id of handItems) {
    const [left, top, right, bottom] = OUTFIT_HELD_OBJECT_BOUNDS[id as keyof typeof OUTFIT_HELD_OBJECT_BOUNDS];
    const [sourceLeft, sourceTop, sourceRight, sourceBottom] = cosmeticArtworkBounds(id);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(right).toBeLessThanOrEqual(512);
    expect(bottom).toBeLessThanOrEqual(512);
    expect(right).toBeGreaterThan(left);
    expect(bottom).toBeGreaterThan(top);
    expect(sourceLeft).toBeGreaterThanOrEqual(0);
    expect(sourceTop).toBeGreaterThanOrEqual(0);
    expect(sourceRight).toBeLessThanOrEqual(512);
    expect(sourceBottom).toBeLessThanOrEqual(512);
    expect(sourceRight).toBeGreaterThan(sourceLeft);
    expect(sourceBottom).toBeGreaterThan(sourceTop);
  }
});
