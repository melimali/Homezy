import { NUDGE_FREE, NUDGE_ROWS } from '../nudge';
import { setLang, tx } from '../runtime';

describe('Moka çağrı balonu', () => {
  it('her cümle 9 dilde dolu ve Türkçe harf sızmıyor', () => {
    const bad: string[] = [];
    for (const l of ['en', 'de', 'es', 'fr', 'pt', 'ja', 'ko', 'ar']) {
      setLang(l);
      for (const r of NUDGE_ROWS) {
        const v = tx(r[0]);
        if (v === r[0] || /[ışğİ]/.test(v)) bad.push(`${l}: ${r[0]}`);
      }
    }
    expect(bad).toEqual([]);
  });
  it('ücretsiz ve Premium için cümle var', () => {
    expect(NUDGE_FREE).toBeGreaterThanOrEqual(8);
    expect(NUDGE_ROWS.length - NUDGE_FREE).toBeGreaterThanOrEqual(5);
    expect(NUDGE_ROWS.every(r => r.length === 9 && r.every(x => x.trim()))).toBe(true);
  });
});
