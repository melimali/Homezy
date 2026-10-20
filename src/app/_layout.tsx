import { Baloo2_600SemiBold, Baloo2_700Bold } from '@expo-google-fonts/baloo-2';
import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { ToastProvider } from '@/components/Toast';
import { configureNotifications } from '@/notifications/schedule';
import { PurchasesProvider } from '@/purchases/PurchasesProvider';
import { AppStoreProvider, useStore } from '@/store/AppStore';
import { useCloudSync } from '@/sync/cloud';
import { useColors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotifications();

export default function RootLayout() {
  const c = useColors();
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
              <StatusBar style="auto" />
              <RootStack />
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

  const loading = status === 'loading';
  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  if (loading) return null;
  // Açılış sırası: tanıtım → giriş / hesap oluştur (ya da hesapsız devam) → evini kur → ana ekran.
  const inside = introSeen && (status === 'guest' || status === 'account');

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
      <Stack.Protected guard={!introSeen}>
        <Stack.Screen name="tanitim" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={inside && state.setup}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="oda/[id]" />
        <Stack.Screen name="hesap" />
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
