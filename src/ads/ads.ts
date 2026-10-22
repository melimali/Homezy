import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

type AdsModule = typeof import('react-native-google-mobile-ads');

/**
 * Ücretsiz planda az ve sakin reklam: sadece Ev ve Bugün sayfalarının en altında bir afiş (banner).
 * İş tamamlarken, ödeme ekranında, kurulumda ya da tam ekran reklam yok. Premium'da hiç reklam yok.
 * Reklamlar kişiselleştirilmez (takip izni istenmez). Avrupa'daki kullanıcılar için Google'ın
 * onay penceresi (UMP) reklamdan önce bir kez çıkar.
 *
 * Reklam kimlikleri `.env` dosyasından gelir (bkz. docs/reklam.md). Girilmemişse geliştirme
 * sürümünde Google'ın test reklamları, yayın sürümünde hiç reklam gösterilmez.
 * Expo Go'da ve web'de reklam modülü yok; o zaman uygulama reklamsız çalışır.
 */
let mod: AdsModule | null | undefined;

export function getAds(): AdsModule | null {
  if (mod !== undefined) return mod;
  if (Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return (mod = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('react-native-google-mobile-ads') as AdsModule;
  } catch (e) {
    console.warn('Layfapp: reklam modülü yüklenemedi, reklamsız devam', e);
    mod = null;
  }
  return mod;
}

/** Afişin reklam birimi. Yoksa null (reklam gösterilmez). */
export function bannerUnit(): string | null {
  const ads = getAds();
  if (!ads) return null;
  const id = Platform.select({ ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS, android: process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID });
  if (id) return id;
  return __DEV__ ? ads.TestIds.ADAPTIVE_BANNER : null;
}

let ready: Promise<boolean> | null = null;

/** Onayı toplar ve reklam SDK'sını başlatır; bir kez çalışır. Reklam istenebiliyorsa true. */
export function startAds(): Promise<boolean> {
  const ads = getAds();
  if (!ads || !bannerUnit()) return Promise.resolve(false);
  ready ||= (async () => {
    try {
      const info = await ads.AdsConsent.gatherConsent();
      if (!info.canRequestAds) return false;
      await ads.default().setRequestConfiguration({ maxAdContentRating: ads.MaxAdContentRating.PG });
      await ads.default().initialize();
      return true;
    } catch (e) {
      console.warn('Layfapp: reklamlar başlatılamadı', e);
      return false;
    }
  })();
  return ready;
}
