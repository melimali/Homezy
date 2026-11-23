import { createLock } from '../lock';

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

describe('createLock', () => {
  it('işleri sırayla çalıştırır, üst üste binmez', async () => {
    const run = createLock();
    const log: string[] = [];
    const a = run(async () => { log.push('a başla'); await wait(30); log.push('a bitti'); return 1; });
    const b = run(async () => { log.push('b başla'); await wait(5); log.push('b bitti'); return 2; });
    expect(await Promise.all([a, b])).toEqual([1, 2]);
    expect(log).toEqual(['a başla', 'a bitti', 'b başla', 'b bitti']);
  });

  it('bir iş hata verse de sıradaki çalışır', async () => {
    const run = createLock();
    const bad = run(async () => { throw new Error('x'); });
    const ok = run(async () => 'tamam');
    await expect(bad).rejects.toThrow('x');
    await expect(ok).resolves.toBe('tamam');
  });
});
