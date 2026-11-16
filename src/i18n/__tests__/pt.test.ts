import { describe, expect, it } from '@jest/globals';

import { EN } from '../en';
import { PT } from '../pt';
import { setLang, tx } from '../runtime';

describe('Portekizce sözlük', () => {
  it('İngilizce sözlükle aynı anahtarlara sahip', () => {
    expect(Object.keys(PT).sort()).toEqual(Object.keys(EN).sort());
  });

  it('{} ve {ad} yer tutucuları İngilizceyle aynı sayıda', () => {
    for (const [k, en] of Object.entries(EN)) {
      const pt = PT[k];
      expect(pt.split('{}').length).toBe(en.split('{}').length);
      expect((pt.match(/\{\w+\}/g) ?? []).sort()).toEqual((en.match(/\{\w+\}/g) ?? []).sort());
    }
  });

  it('boş çeviri yok', () => {
    for (const v of Object.values(PT)) expect(v.trim().length).toBeGreaterThan(0);
  });

  it('çalışma zamanında Portekizce çevirir', () => {
    setLang('pt');
    expect(tx('Bugün')).toBe('Hoje');
    expect(tx('Odalar')).toBe('Cômodos');
    expect(tx('Tümü (3)')).toBe('Todas (3)');
    setLang('en');
    expect(tx('Bugün')).toBe('Today');
    setLang('tr');
    expect(tx('Bugün')).toBe('Bugün');
  });
});
