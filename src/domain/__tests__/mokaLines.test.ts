import { setLang, tx } from '@/i18n/runtime';
import { LINES, line, openingLine, windowLine } from '../mokaLines';

const base = { hour: 9, done: 0, due: 3, late: 0, total: 10, away: 0 };

describe('Moka odası cümleleri', () => {
  afterAll(() => setLang('tr'));
  it('gününe göre açılış', () => {
    expect(openingLine(base).key).toBe('morning');
    expect(openingLine(base).text).toContain('3');
    expect(openingLine({ ...base, away: 4 }).sleeping).toBe(true);
    expect(openingLine({ ...base, total: 0 }).key).toBe('noTasks');
    expect(openingLine({ ...base, done: 2, due: 0 }).key).toBe('allDone');
    expect(openingLine({ ...base, late: 5 }).key).toBe('manyLate');
    expect(openingLine({ ...base, hour: 23 }).key).toBe('night');
    expect(openingLine({ ...base, hour: 19, due: 0 }).key).toBe('eveningFree');
    expect(windowLine('rain', false)).toBe(line('window_rain'));
  });
  for (const lang of ['en', 'de', 'es', 'fr', 'pt', 'ja', 'ko', 'ar']) {
    it(`${lang}: her cümlenin çevirisi var`, () => {
      setLang(lang);
      const miss = Object.values(LINES).flat().filter(s => !/^Zzz/.test(s)).map(s => s.replace('{}', '7')).filter(s => tx(s) === s);
      expect(miss).toEqual([]);
    });
  }
});
