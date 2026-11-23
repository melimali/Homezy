/**
 * Yazmaları sıraya dizer: biri bitmeden öbürü başlamaz. Böylece bir yazma "bulutta ne var" diye bakarken
 * başka bir yazma damgayı değiştirmez; yoksa aynı telefon kendi yazmasını "başka telefonda değişiklik" sanıp
 * çakışma penceresi açardı.
 */
export function createLock() {
  let tail: Promise<unknown> = Promise.resolve();
  return function run<T>(fn: () => Promise<T>): Promise<T> {
    const next = tail.then(fn, fn);
    tail = next.catch(() => {});
    return next;
  };
}
