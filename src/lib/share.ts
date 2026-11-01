import type { ComponentRef, RefObject } from 'react';
import { NativeModules, Platform, Share, TurboModuleRegistry, View } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

// Yerel modül bu derlemede yoksa içe aktarma ekranı kırmızıya boyar; kullanılırken güvenle yükle.
function sharing() {
  try {
    return requireOptionalNativeModule('ExpoSharing') ? (require('expo-sharing') as typeof import('expo-sharing')) : null; // eslint-disable-line @typescript-eslint/no-require-imports
  } catch {
    return null;
  }
}
function viewShot() {
  try {
    return (TurboModuleRegistry.get('RNViewShot') ?? NativeModules.RNViewShot) ? (require('react-native-view-shot') as typeof import('react-native-view-shot')) : null; // eslint-disable-line @typescript-eslint/no-require-imports
  } catch {
    return null;
  }
}

/**
 * Ekrandaki bir kartı görsel olarak paylaşır (Instagram, WhatsApp…). Görsel çekilemezse
 * (web önizlemesi, paylaşma desteklenmiyor) aynı şeyi metin olarak paylaşır.
 * Kartın `View`'ı `collapsable={false}` olmalı, yoksa Android'de görsel çekilemez.
 */
export async function shareCard(ref: RefObject<ComponentRef<typeof View> | null>, text: string) {
  if (Platform.OS !== 'web' && ref.current) {
    try {
      const Sharing = sharing();
      const shot = viewShot();
      if (Sharing && shot && (await Sharing.isAvailableAsync())) {
        const uri = await shot.captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Paylaş' });
        return;
      }
    } catch (e) {
      console.warn('Homezy: kart görsel olarak paylaşılamadı, metin paylaşılıyor', e);
    }
  }
  await Share.share({ message: text }).catch(() => {});
}
