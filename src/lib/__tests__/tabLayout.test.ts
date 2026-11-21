import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/supabase', () => ({ prefs: { get: () => null, set: () => undefined } }));

import { resolve } from '@/lib/tabLayout';

describe('Gelişim düzeni', () => {
  it('Haftam, Günüm, Sıralama bloğu her zaman görünür ve en sondadır', () => {
    const l = resolve('gelisim', null);
    expect(l.ids[l.ids.length - 1]).toBe('linkler');
  });

  it('kayıtlı düzen bloğu başa taşısa ya da kapatsa bile en sona döner', () => {
    const l = resolve('gelisim', { order: ['linkler', 'hero', 'halkalar'], on: [] });
    expect(l.ids[l.ids.length - 1]).toBe('linkler');
    expect(l.ids.filter(id => id === 'linkler')).toHaveLength(1);
    expect(l.items.find(i => i.id === 'linkler')?.visible).toBe(true);
  });
});
