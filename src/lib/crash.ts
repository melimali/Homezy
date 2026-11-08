import { NativeModules, TurboModuleRegistry } from 'react-native';

/**
 * Uzaktan çökme raporu (Sentry). Güvenli: DSN yoksa, geliştirmedeyse ya da yerel modül derlemede yoksa
 * (eski geliştirme derlemesi, Expo Go) hiçbir şey yapmaz, uygulamayı asla çökertmez.
 * Kişisel veri gönderilmez: kullanıcı, IP, istek, fotoğraf yok; sadece hata, yığın izi, cihaz modeli, sürüm.
 */
type SentryT = typeof import('@sentry/react-native');
let S: SentryT | null = null;

const hasNative = () => {
  try {
    return !!(TurboModuleRegistry.get('RNSentry') ?? NativeModules.RNSentry);
  } catch {
    return false;
  }
};

export function initCrashReporting() {
  try {
    const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
    if (__DEV__ || !dsn || !hasNative()) return;
    const sentry = require('@sentry/react-native') as SentryT;
    sentry.init({
      dsn,
      sendDefaultPii: false,
      enableNativeCrashHandling: true,
      tracesSampleRate: 0,
      attachScreenshot: false,
      attachViewHierarchy: false,
      maxBreadcrumbs: 20,
      // Konsol çıktıları ve ağ adresleri kullanıcı verisi taşıyabilir (iş adları, e-posta, Supabase kimliği): izleme kırıntısı olarak gitmez.
      beforeBreadcrumb(b) {
        if (b.category === 'console' || b.category === 'http' || b.category === 'fetch' || b.category === 'xhr') return null;
        return { ...b, data: undefined, message: undefined };
      },
      beforeSend(event) {
        const e = event as { user?: unknown; request?: unknown; extra?: unknown; server_name?: unknown };
        e.user = undefined;
        e.request = undefined;
        e.extra = undefined;
        e.server_name = undefined;
        return event;
      },
    });
    S = sentry;
  } catch {
    S = null;
  }
}

/** Yakalanan bir hatayı da raporla (ör. ErrorBoundary). */
export function reportError(e: unknown) {
  try {
    S?.captureException(e);
  } catch {}
}

/** Sentry testi: gizli tetik (Ben sekmesi, sürüm yazısına uzun bas). Gönderildiyse true. */
export async function sendTestError(): Promise<boolean> {
  try {
    if (!S) return false;
    S.captureException(new Error('Homezy Sentry test hatası (' + new Date().toISOString() + ')'));
    await S.flush(4000);
    return true;
  } catch {
    return false;
  }
}
