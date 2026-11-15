import { notifs, seed } from '../../domain/logic';
import { summaryFor } from '../../notifications/schedule';
import { setLang, tx } from '../runtime';

const NOW = new Date('2026-11-16T09:00:00').getTime();
const TR_ONLY = /[ışğİ]|Günaydın|bekliyor|gecikti/;

describe('bildirim metinleri her dilde çevrilir', () => {
  afterAll(() => setLang('tr'));
  for (const code of ['en', 'de', 'es', 'fr', 'pt', 'ja', 'ko', 'ar']) {
    it(code, () => {
      setLang(code);
      const S = seed(NOW);
      const ns = notifs(S, NOW + 3 * 86400000);
      const out: string[] = [];
      for (const n of ns) out.push(tx(n.title), tx(n.text));
      const sum = summaryFor(ns, new Date(NOW));
      if (sum) out.push(tx(sum.title), tx(sum.body));
      const leaks = [...new Set(out)].filter(s => TR_ONLY.test(s));
      expect({ n: out.length > 0, leaks: leaks.slice(0, 6) }).toEqual({ n: true, leaks: [] });
    });
  }
});
