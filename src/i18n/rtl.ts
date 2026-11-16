import { DevSettings, I18nManager } from 'react-native';

/**
 * Arapça için sağdan sola yön.
 * `swapLeftAndRightInRTL(false)`: sahneler, 3B ev ve ev planı gibi sol/sağ'a göre çizilen
 * yerler bozulmasın; metin ve satır yönü (`row`) yine tersine döner.
 * Yön değişince React Native'in yeniden başlaması gerekir.
 */
I18nManager.allowRTL?.(true); // web önizlemesinde yok
I18nManager.swapLeftAndRightInRTL?.(false);

let reloading = false;

export function applyDirection(rtl: boolean) {
  if (I18nManager.isRTL === rtl) return;
  I18nManager.forceRTL(rtl);
  if (reloading) return;
  reloading = true;
  // Dil ayarının diske yazılması için kısa süre beklenir (kayıt 500 ms toplanır), sonra yeniden başlatılır.
  setTimeout(async () => {
    try {
      const { requireOptionalNativeModule } = require('expo-modules-core');
      if (requireOptionalNativeModule('ExpoUpdates')) {
        const Updates = require('expo-updates');
        await Updates.reloadAsync();
        return;
      }
    } catch {
      // yedek yola düş
    }
    try {
      DevSettings.reload();
    } catch {
      // Yön bir sonraki açılışta uygulanır.
    }
  }, 1500);
}
