import { beforeAll, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/supabase', () => ({ prefs: { get: () => null, set: () => {} } }));

import { setLang, tx } from '../runtime';

beforeAll(() => setLang('en'));

it('ek yuvası harfle başlayan sözcüğe uymaz ("işaretlersin" ≠ "iş" + ek)', () => {
  expect(tx('içince işaretlersin')).toBe('içince işaretlersin');
});

it('Ben turu ilaç adımı çevrilir', () => {
  expect(tx('İlaçlarını buradan takip edersin. Hatırlatma gelir, içince işaretlersin.')).toMatch(/medication/);
});

it('iş sayıları çevrilir, boş ek de olur', () => {
  expect(tx('3 iş')).toBe('3 tasks');
  expect(tx('3 iş bitti. Moka seninle gurur duyuyor.')).not.toMatch(/Out/);
  expect(tx('3 iş bitti · +30 ⭐. Moka seninle gurur duyuyor.')).not.toMatch(/Out/);
});
