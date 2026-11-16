import { setLang, tx } from '../runtime';

describe('Fransızca çeviri', () => {
  beforeAll(() => setLang('fr'));
  afterAll(() => setLang('tr'));

  it('düz metni çevirir', () => {
    expect(tx('Bugün')).not.toBe('Bugün');
  });
  it('yüzde sayıdan sonra boşlukla yazılır', () => {
    expect(tx('%50')).toBe('50 %');
  });
});
