import { useEffect } from 'react';
import { Image, Linking, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { reportError } from '@/lib/crash';
import { MOKA_ASSETS } from '@/constants/moka';
import { useColors } from '@/theme';

import { Btn, T } from './ui';

/**
 * Bir ekran çökerse beyaz ekran yerine gösterilir (Expo Router `ErrorBoundary` verisi: `error`, `retry`).
 * Veri telefonda duruyor; "Tekrar dene" ekranı yeniden çizer, "Rapor gönder" e-posta taslağı açar.
 */
export function ErrorScreen({ error, retry }: { error: Error; retry: () => void }) {
  const c = useColors();
  useEffect(() => reportError(error), [error]);
  const report = () => {
    const body = encodeURIComponent(`Homezy hata raporu\n\n${String(error?.message ?? error).slice(0, 600)}\n\n${String(error?.stack ?? '').slice(0, 1200)}`);
    Linking.openURL(`mailto:info@themeikai.com?subject=${encodeURIComponent('Homezy hata raporu')}&body=${body}`).catch(() => {});
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 }}>
        <Image source={MOKA_ASSETS.sleepy} style={{ width: 150, height: 150 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        <T v="h2" style={{ textAlign: 'center' }}>Bir şeyler ters gitti</T>
        <T style={{ textAlign: 'center', maxWidth: 300 }}>Verilerin telefonunda güvende. Tekrar deneyelim; olmazsa uygulamayı kapatıp aç.</T>
        <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 8 }}>
          <Btn label="Tekrar dene" kind="primary" onPress={retry} />
          <Btn label="Hata raporu gönder" kind="ghost" onPress={report} />
        </View>
      </View>
    </SafeAreaView>
  );
}
