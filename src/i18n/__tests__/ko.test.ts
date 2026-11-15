import { describe, expect, it } from '@jest/globals';

import { EN } from '../en';
import { KO } from '../ko';
import { setLang, tx } from '../runtime';

describe('Korece sözlük', () => {
  it('İngilizce sözlükle aynı anahtarlara sahip', () => {
    expect(Object.keys(KO).sort()).toEqual(Object.keys(EN).sort());
  });

  it('{} ve {ad} yer tutucuları İngilizceyle aynı sayıda', () => {
    for (const [k, en] of Object.entries(EN)) {
      const ko = KO[k];
      expect(ko.split('{}').length).toBe(en.split('{}').length);
      expect((ko.match(/\{\w+\}/g) ?? []).sort()).toEqual((en.match(/\{\w+\}/g) ?? []).sort());
    }
  });

  it('boş çeviri yok', () => {
    for (const v of Object.values(KO)) expect(v.trim().length).toBeGreaterThan(0);
  });

  it('çalışma zamanında Korece çevirir', () => {
    setLang('ko');
    expect(tx('Bugün')).toBe('오늘');
    expect(tx('Odalar')).toBe('방');
    expect(tx('Tümü (3)')).toBe('전체 (3)');
    setLang('en');
    expect(tx('Bugün')).toBe('Today');
    setLang('tr');
    expect(tx('Bugün')).toBe('Bugün');
  });
});
