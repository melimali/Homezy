import { Baloo2_600SemiBold, Baloo2_700Bold } from '@expo-google-fonts/baloo-2';
import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { IntroSplash } from '@/components/IntroSplash';
import { PremiumChoice } from '@/components/PremiumChoice';
import { ToastProvider } from '@/components/Toast';
import { FamilyProvider } from '@/family/FamilyProvider';
import { configureNotifications } from '@/notifications/schedule';
import { prefs } from '@/lib/supabase';
import { usePlaySync } from '@/play/usePlay';
import { PurchasesProvider, usePurchases } from '@/purchases/PurchasesProvider';
import { AppStoreProvider, useStore } from '@/store/AppStore';
import { useCloudSync } from '@/sync/cloud';
import { useColors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotifications();

export default function RootLayout() {
  const c = useColors();
  const [introDone, setIntroDone] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Baloo2_600SemiBold, Baloo2_700Bold, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold,
  });

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.bg).catch(() => {});
  }, [c.bg]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PurchasesProvider>
          <AppStoreProvider>
            <ToastProvider>
              <FamilyProvider>
                <StatusBar style="auto" />
                <RootStack />
                <LaunchChoice />
              </FamilyProvider>
              {/* Açılış animasyonu uygulamanın üstünde oynar; altta veriler bu sırada yüklenir. */}
              {!introDone && <IntroSplash onDone={() => setIntroDone(true)} />}
            </ToastProvider>
          </AppStoreProvider>
        </PurchasesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootStack() {
  const { state } = useStore();
  const { status, introSeen } = useAuth();
  const c = useColors();
  useCloudSync();
  usePlaySync();

  const loading = status === 'loading';
  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  if (loading) return null;
  // Açılış sırası: açılış animasyonu → Ücretsiz / Premium seçimi (LaunchChoice) → tanıtım → giriş / hesap oluştur (ya da hesapsız devam) → evini kur → ana ekran.
  const inside = introSeen && (status === 'guest' || status === 'account');

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
      <Stack.Protected guard={!introSeen}>
        <Stack.Screen name="tanitim" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={inside && state.setup}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="oda/[id]" />
        <Stack.Screen name="plan" />
        <Stack.Screen name="bildirimler" />
        <Stack.Screen name="magaza" />
        <Stack.Screen name="spor" />
        <Stack.Screen name="gunluk" />
        <Stack.Screen name="evler" />
        <Stack.Screen name="aile" />
        <Stack.Screen name="premium" options={{ animation: 'fade_from_bottom' }} />
      </Stack.Protected>
      <Stack.Protected guard={inside && !state.setup}>
        <Stack.Screen name="kurulum" />
      </Stack.Protected>
      {/* Misafir de buradan hesap açabilsin diye hesapla girmemiş herkese açık. */}
      <Stack.Protected guard={introSeen && status !== 'account'}>
        <Stack.Screen name="giris" options={{ animation: 'fade_from_bottom' }} />
      </Stack.Protected>
    </Stack>
  );
}

/**
 * İlk açılışta, açılış animasyonunun hemen arkasında Ücretsiz / Premium seçimi.
 * Bir kere seçilince bir daha çıkmaz; sonra Hesabım'dan açılır. Premium olana hiç çıkmaz.
 */
function LaunchChoice() {
  const { premium } = usePurchases();
  const [done, setDone] = useState(() => prefs.get('planChoice') != null);
  if (done || premium.active) return null;
  return (
    <View style={StyleSheet.absoluteFill}>
      <PremiumChoice
        onDone={() => {
          prefs.set('planChoice', '1');
          setDone(true);
        }}
      />
    </View>
  );
}
