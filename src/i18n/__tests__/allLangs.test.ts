import { AR } from '../ar';
import { DE } from '../de';
import { EN } from '../en';
import { ES } from '../es';
import { FR } from '../fr';
import { JA } from '../ja';
import { KO } from '../ko';
import { PT } from '../pt';
import { LANGUAGES } from '../translations';

const ALL: Record<string, Record<string, string>> = { de: DE, es: ES, fr: FR, pt: PT, ja: JA, ko: KO, ar: AR };
const ph = (s: string) => (s.match(/\{\}/g) ?? []).length;

describe('tüm diller', () => {
  it('seçicide 9 dil var ve hepsi seçilebilir', () => {
    expect(LANGUAGES.map(l => l.code).sort()).toEqual(['ar', 'de', 'en', 'es', 'fr', 'ja', 'ko', 'pt', 'tr']);
    expect(LANGUAGES.filter(l => (l as { soon?: string }).soon)).toEqual([]);
  });
  for (const [code, dict] of Object.entries(ALL)) {
    it(`${code}: anahtarların hepsi var, {} sayısı tutuyor, boş değer yok`, () => {
      const missing = Object.keys(EN).filter(k => !(k in dict));
      const badPh = Object.keys(dict).filter(k => ph(k) !== ph(dict[k]!));
      const empty = Object.keys(dict).filter(k => !dict[k]!.trim());
      expect({ missing: missing.length, sample: missing.slice(0, 5), badPh: badPh.slice(0, 5), empty: empty.slice(0, 5) }).toEqual({ missing: 0, sample: [], badPh: [], empty: [] });
    });
    it(`${code}: Türkçe harf sızıntısı yok`, () => {
      const leak = Object.entries(dict).filter(([, v]) => /[ışğİ]/.test(v.replace(/Mant[^\s(]*|Karn[^\s(]*|İmam bay[^\s(]*|Çılb[^\s(]*|Cacık|Kaşar|Başkadır|Organize İşler/gi, ''))).map(([k, v]) => `${k} => ${v}`);
      expect(leak.slice(0, 8)).toEqual([]);
    });
  }
});
