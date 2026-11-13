import { describe, expect, it } from '@jest/globals';
import { runMigrations, storedVersion } from '../migrate';

describe('şema geçişi', () => {
  it('adımlar sırayla çalışır, güncelse hiçbir şey yapmaz', async () => {
    const log: number[] = [];
    const steps = { 2: () => void log.push(2), 3: () => void log.push(3), 4: async () => void log.push(4) };
    const seen: number[] = [];
    expect(await runMigrations(2, 4, steps, null, v => void seen.push(v))).toEqual({ from: 2, to: 4, ok: true });
    expect(log).toEqual([3, 4]);
    expect(seen).toEqual([3, 4]);
    expect(await runMigrations(4, 4, steps, null)).toEqual({ from: 4, to: 4, ok: true });
    expect(log).toEqual([3, 4]);
  });
  it('hata olursa durur, ulaşılan sürümü ve hatayı bildirir (fırlatmaz)', async () => {
    const steps = { 2: () => {}, 3: () => { throw new Error('bozuk'); }, 4: () => {} };
    const r = await runMigrations(1, 4, steps, null);
    expect(r).toEqual({ from: 1, to: 2, ok: false, error: 'bozuk' });
  });
  it('kayıtlı sürüm okuma', () => {
    expect(storedVersion('3')).toBe(3);
    expect(storedVersion(undefined)).toBe(1);
    expect(storedVersion('abc')).toBe(1);
  });
});
