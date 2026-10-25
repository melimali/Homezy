import type { ComponentRef, RefObject } from 'react';
import { Platform, Share, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

/**
 * Ekrandaki bir kartı görsel olarak paylaşır (Instagram, WhatsApp…). Görsel çekilemezse
 * (web önizlemesi, paylaşma desteklenmiyor) aynı şeyi metin olarak paylaşır.
 * Kartın `View`'ı `collapsable={false}` olmalı, yoksa Android'de görsel çekilemez.
 */
export async function shareCard(ref: RefObject<ComponentRef<typeof View> | null>, text: string) {
  if (Platform.OS !== 'web' && ref.current) {
    try {
      if (await Sharing.isAvailableAsync()) {
        const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Paylaş' });
        return;
      }
    } catch (e) {
      console.warn('Layfapp: kart görsel olarak paylaşılamadı, metin paylaşılıyor', e);
    }
  }
  await Share.share({ message: text }).catch(() => {});
}
