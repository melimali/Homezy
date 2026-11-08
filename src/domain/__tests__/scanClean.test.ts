import { describe, expect, it } from '@jest/globals';

import { clean, cleanExp, parseJson, SCHEMA } from '../../../supabase/functions/scan/clean';

const now = Date.UTC(2026, 10, 8);

describe('tarama cevabı temizliği', () => {
  it('JSON kod bloğu içinde de okunur, bozuksa null', () => {
    expect(parseJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJson('yok')).toBeNull();
    expect(parseJson('{bozuk')).toBeNull();
  });

  it('buzdolabı: conf, seviye ve tarih doğrulanır', () => {
    const r = clean('fridge', {
      items: [
        { name: 'Süt', qty: '1 şişe', lvl: 'az', match: 'Süt', conf: 'dusuk', exp: '2026-11-20' },
        { name: 'Yoğurt', qty: '', lvl: 'garip', match: '  ', conf: 'x', exp: '2020-01-01' },
        { name: '  ' },
      ],
      missing: ['Tereyağı', ''],
      note: 'ok',
    }, now) as { items: { name: string; lvl: string; conf: string; exp: string | null; match: string | null }[]; missing: string[] };
    expect(r.items).toHaveLength(2);
    expect(r.items[0]).toMatchObject({ lvl: 'az', conf: 'dusuk', exp: '2026-11-20', match: 'Süt' });
    expect(r.items[1]).toMatchObject({ lvl: 'var', conf: 'yuksek', exp: null, match: null });
    expect(r.missing).toEqual(['Tereyağı']);
  });

  it('son kullanma tarihi: geçersiz, geçmiş ve çok uzak tarihler elenir', () => {
    expect(cleanExp('2026-11-20', now)).toBe('2026-11-20');
    expect(cleanExp('2026-02-31', now)).toBeNull();
    expect(cleanExp('2019-05-01', now)).toBeNull();
    expect(cleanExp('2040-05-01', now)).toBeNull();
    expect(cleanExp('yarın', now)).toBeNull();
    expect(cleanExp(null, now)).toBeNull();
  });

  it('kıyafet: tür, renk, kumaş listeye uymazsa null; conf varsayılan yüksek', () => {
    const r = clean('look', {
      pieces: [
        { name: 'Lacivert gömlek', kind: 'Gömlek', color: 'Lacivert', hex: '#283044', fabric: 'Keten', pattern: 'desenli', wash: 'koyu', conf: 'dusuk' },
        { name: 'Tuhaf', kind: 'Uzay giysisi', color: 'neon', hex: 'kırmızı', fabric: 'Plastik', wash: 'x' },
      ],
      worn: true,
      note: 'n',
    }) as { pieces: Record<string, unknown>[]; worn: boolean };
    expect(r.worn).toBe(true);
    expect(r.pieces[0]).toMatchObject({ kind: 'Gömlek', cat: 'Üst', color: 'lacivert', fabric: 'Keten', pattern: 'desenli', wash: 'koyu', conf: 'dusuk' });
    expect(r.pieces[1]).toMatchObject({ kind: null, cat: 'Aksesuar', color: null, hex: null, fabric: null, wash: null, conf: 'yuksek', pattern: 'düz' });
  });

  it('şema conf alanını zorunlu tutar', () => {
    expect(SCHEMA.fridge.properties.items.items.required).toEqual(expect.arrayContaining(['conf', 'exp']));
    expect(SCHEMA.look.properties.pieces.items.required).toContain('conf');
  });
});
