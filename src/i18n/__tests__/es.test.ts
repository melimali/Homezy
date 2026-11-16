import { describe, expect, it } from '@jest/globals';

import { EN } from '../en';
import { ES } from '../es';
import { setLang, tx } from '../runtime';

describe('İspanyolca sözlük', () => {
  it('İngilizce sözlükle aynı anahtarlara sahip', () => {
    expect(Object.keys(ES).sort()).toEqual(Object.keys(EN).sort());
  });

  it('{} ve {ad} yer tutucuları İngilizceyle aynı sayıda', () => {
    for (const [k, en] of Object.entries(EN)) {
      const es = ES[k];
      expect(es.split('{}').length).toBe(en.split('{}').length);
      expect((es.match(/\{\w+\}/g) ?? []).sort()).toEqual((en.match(/\{\w+\}/g) ?? []).sort());
    }
  });

  it('boş çeviri yok', () => {
    for (const v of Object.values(ES)) expect(v.trim().length).toBeGreaterThan(0);
  });

  it('çalışma zamanında İspanyolca çevirir', () => {
    setLang('es');
    expect(tx('Bugün')).toBe('Hoy');
    expect(tx('Odalar')).toBe('Habitaciones');
    expect(tx('Tümü (3)')).toBe('Todas (3)');
    setLang('en');
    expect(tx('Bugün')).toBe('Today');
    setLang('tr');
    expect(tx('Bugün')).toBe('Bugün');
  });
});
