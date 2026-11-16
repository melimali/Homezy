import { tx } from '@/i18n/runtime';

/**
 * Hafif bağlantı kontrolü (native modül yok). Uygulama internetsiz de açılır; internet gereken
 * yerler `online()` ile sorar ve çevrimdışıysa `OFFLINE_MSG` ile nazikçe uyarır.
 */
export const OFFLINE_MSG = 'Bağlantı yok ☕ İnternetini kontrol edip tekrar dene; evin yine de telefonunda güvende.';
export const offlineMsg = () => tx(OFFLINE_MSG);

/** Süre dolarsa `fallback` ile devam eder; asla sonsuza kadar beklemez. */
export function withTimeout<T>(p: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>(resolve => {
    const t = setTimeout(() => resolve(fallback), ms);
    Promise.resolve(p).then(
      v => {
        clearTimeout(t);
        resolve(v);
      },
      () => {
        clearTimeout(t);
        resolve(fallback);
      },
    );
  });
}

/** `fetch` için zaman aşımı sarmalayıcısı (askıda kalan istekleri keser). */
export function fetchWithTimeout(ms: number): typeof fetch {
  return (input, init) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    const outer = init?.signal;
    if (outer) outer.addEventListener('abort', () => ctl.abort());
    return fetch(input, { ...init, signal: ctl.signal }).finally(() => clearTimeout(t));
  };
}

let last: { at: number; ok: boolean } | null = null;
const PROBE = process.env.EXPO_PUBLIC_SUPABASE_URL
  ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/health`
  : 'https://clients3.google.com/generate_204';

/** İnternet var mı? Herhangi bir HTTP cevabı yeter. Sonuç 8 sn önbelleğe alınır. */
export async function online(): Promise<boolean> {
  if (last && Date.now() - last.at < 8000) return last.ok;
  let ok = false;
  // Yavaş ağda tek denemede yanlış "bağlantı yok" çıkmasın: iki kez denenir.
  for (let i = 0; i < 2 && !ok; i++) {
    try {
      await fetchWithTimeout(6000)(PROBE, { method: 'GET' });
      ok = true;
    } catch {
      ok = false;
    }
  }
  last = { at: Date.now(), ok };
  return ok;
}

/** Ağ hatası mı (cevap hiç gelmedi)? */
export function isNetworkError(e: unknown): boolean {
  const m = String((e as { message?: string } | null)?.message ?? e ?? '');
  return /network|fetch|abort|timed? ?out|failed to connect/i.test(m);
}
