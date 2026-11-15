import { AR } from '../ar';
import { EN } from '../en';
import { setLang, tx } from '../runtime';

const ph = (s: string) => (s.match(/\{\}/g) ?? []).length;

describe('Arapça sözlük', () => {
  it('her İngilizce anahtarın Arapça karşılığı var ve {} sayısı aynı', () => {
    const missing: string[] = [];
    const bad: string[] = [];
    for (const k of Object.keys(EN)) {
      const v = AR[k];
      if (!v) missing.push(k);
      else if (ph(v) !== ph(EN[k])) bad.push(k);
    }
    expect(missing).toEqual([]);
    expect(bad).toEqual([]);
  });

  it('setLang(ar) ile çeviri yapılır', () => {
    setLang('ar');
    const k = Object.keys(AR)[0];
    expect(tx(k)).toBe(AR[k]);
    setLang('tr');
  });
});
