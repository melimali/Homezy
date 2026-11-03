import { router as baseRouter, useRouter as useBaseRouter, type Href } from 'expo-router';
import { useMemo } from 'react';

/**
 * Çift navigasyon koruması. Aynı butona ard arda basınca (ya da yavaş açılan bir ekranda parmak bir daha
 * dokununca) aynı sayfa üst üste açılıyor ve ağır ekranlar iki kere kurulduğu için uygulama kasıyordu.
 * Bütün `push` / `navigate` / `replace` çağrıları buradan geçer (`useRouter` ve `router` bu dosyadan alınır):
 * - Aynı rota SAME_MS içinde tekrar istenirse yok sayılır.
 * - Hangi rota olursa olsun art arda iki istek ANY_MS içinde gelirse ikincisi yok sayılır
 *   (ekran geçişi sürerken bir sonraki dokunuş boşa gitsin).
 */
const SAME_MS = 900;
const ANY_MS = 250;

let lastKey = '';
let lastAt = 0;
let lastAny = 0;

const keyOf = (href: unknown) => {
  try {
    return typeof href === 'string' ? href : JSON.stringify(href);
  } catch {
    return String(href);
  }
};

/** Bu çağrıya izin var mı? Varsa kilidi yeniler. */
export function allowNav(href: unknown, now = Date.now()): boolean {
  const k = keyOf(href);
  if (k === lastKey && now - lastAt < SAME_MS) return false;
  if (now - lastAny < ANY_MS) return false;
  lastKey = k;
  lastAt = now;
  lastAny = now;
  return true;
}

/** Testler için. */
export function resetNavGuard() {
  lastKey = '';
  lastAt = 0;
  lastAny = 0;
}

type BaseRouter = typeof baseRouter;

function guarded<R extends BaseRouter>(r: R): R {
  const wrap =
    <A extends unknown[]>(fn: (...a: A) => void) =>
    (...a: A) => {
      if (allowNav(a[0])) fn(...a);
    };
  return {
    ...r,
    push: wrap(r.push.bind(r) as (href: Href, options?: never) => void),
    navigate: wrap(r.navigate.bind(r) as (href: Href, options?: never) => void),
    replace: wrap(r.replace.bind(r) as (href: Href, options?: never) => void),
  } as unknown as R;
}

/** expo-router `useRouter`, çift dokunmaya karşı korumalı. Aynı kimlikte kalır (useEffect bağımlılığı olarak güvenli). */
export function useRouter(): BaseRouter {
  const r = useBaseRouter();
  return useMemo(() => guarded(r as BaseRouter), [r]);
}

/** expo-router `router`, çift dokunmaya karşı korumalı (bileşen dışı çağrılar için). */
export const router: BaseRouter = guarded(baseRouter);
