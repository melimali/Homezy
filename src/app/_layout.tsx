import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/Toast';
import { configureNotifications } from '@/notifications/schedule';
import { AppStoreProvider, useStore } from '@/store/AppStore';
import { useColors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotifications();

export default function RootLayout() {
  const c = useColors();
  const [fontsLoaded, fontError] = useFonts({
    Fredoka_600SemiBold, Fredoka_700Bold, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold,
  });

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.bg).catch(() => {});
  }, [c.bg]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <AppStoreProvider>
        <ToastProvider>
          <StatusBar style="auto" />
          <RootStack />
        </ToastProvider>
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}

function RootStack() {
  const { state } = useStore();
  const c = useColors();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
      <Stack.Protected guard={state.setup}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="oda/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={!state.setup}>
        <Stack.Screen name="kurulum" />
      </Stack.Protected>
    </Stack>
  );
}
