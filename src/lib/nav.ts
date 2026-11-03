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
type NavFn = (href: Href, options?: never) => void;

const GUARDED = new Set(['push', 'navigate', 'replace']);

/**
 * Dikkat: expo-router'ın dışa verdiği `router` nesnesi ilk render bitene kadar "throwBeforeFirstRender" fonksiyonlarını
 * taşır ve sonra yöntemleri YERİNDE değiştirir. Bu yüzden yöntemler modül yüklenirken kopyalanıp bağlanamaz
 * (eskiden öyle yapılıyordu ve üretim derlemesi açılışta "The imperative router is unavailable before the first render
 * has finished" ile çöküyordu). Her çağrıda güncel yöntem o anda `target`tan okunur.
 */
function guarded<R extends BaseRouter>(target: () => R): R {
  return new Proxy({} as R, {
    get(_, key: string) {
      const t = target() as unknown as Record<string, unknown>;
      const v = t[key];
      if (GUARDED.has(key) && typeof v === 'function') {
        return (href: Href, options?: never) => {
          if (!allowNav(href)) return;
          try {
            (t[key] as NavFn)(href, options);
          } catch (e) {
            resetNavGuard(); // Başarısız çağrı kilit bırakmasın.
            throw e;
          }
        };
      }
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(t) : v;
    },
  });
}

/** expo-router `useRouter`, çift dokunmaya karşı korumalı. Aynı kimlikte kalır (useEffect bağımlılığı olarak güvenli). */
export function useRouter(): BaseRouter {
  const r = useBaseRouter();
  return useMemo(() => guarded(() => r as BaseRouter), [r]);
}

/** expo-router `router`, çift dokunmaya karşı korumalı (bileşen dışı çağrılar için). İlk render öncesi çağrılırsa expo-router'ın kendi hatasını verir. */
export const router: BaseRouter = guarded(() => baseRouter);
