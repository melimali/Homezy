import { Baloo2_600SemiBold, Baloo2_700Bold } from '@expo-google-fonts/baloo-2';
import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { LogBox, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { IntroSplash } from '@/components/IntroSplash';
import { PremiumChoice } from '@/components/PremiumChoice';
import { ToastProvider } from '@/components/Toast';
import { FamilyProvider } from '@/family/FamilyProvider';
import { configureNotifications } from '@/notifications/schedule';
import { prefs } from '@/lib/supabase';
import { setSfxEnabled } from '@/lib/sfx';
import { usePlaySync } from '@/play/usePlay';
import { PurchasesProvider, usePurchases } from '@/purchases/PurchasesProvider';
import { AppStoreProvider, useStore } from '@/store/AppStore';
import { useCloudSync } from '@/sync/cloud';
import { useColors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
// Emülatörde Google Play hesabı olmadığı için RevenueCat her açılışta hata yazar; geliştirirken ekranı kaplamasın.
if (__DEV__) LogBox.ignoreLogs(['[RevenueCat]']);
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
  const sound = state.settings.sound;
  useEffect(() => setSfxEnabled(sound), [sound]);

  const loading = status === 'loading';
  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  if (loading) return null;
  // Açılış sırası: açılış animasyonu → tanıtım (Moka) → giriş / hesap oluştur (ya da hesapsız devam) → evini kur → evle ilgili sorular → Ücretsiz / Premium seçimi (LaunchChoice) → ana ekran.
  const inside = introSeen && (status === 'guest' || status === 'account');

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: c.bg } }}>
      <Stack.Protected guard={!introSeen}>
        <Stack.Screen name="tanitim" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={inside && state.setup}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="oda/[id]" options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen name="is" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="temizlik" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="plan" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="bildirimler" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="magaza" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="bahce" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="dekor" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="odak" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="spor" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="gunluk" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="evler" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="aile" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="bakim" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="evim" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="hafta" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="hikaye" options={{ animation: 'fade' }} />
        <Stack.Screen name="premium" options={{ animation: 'slide_from_bottom' }} />
      </Stack.Protected>
      <Stack.Protected guard={inside && !state.setup}>
        <Stack.Screen name="kurulum" options={{ animation: 'fade' }} />
      </Stack.Protected>
      {/* Misafir de buradan hesap açabilsin diye hesapla girmemiş herkese açık. */}
      <Stack.Protected guard={introSeen && status !== 'account'}>
        <Stack.Screen name="giris" options={{ animation: 'slide_from_bottom' }} />
      </Stack.Protected>
    </Stack>
  );
}

// Evi kurarken ve tanıtımda satın alma ekranı çıkmasın diye bu sayfalarda gizlenir.
const CHOICE_WAIT = ['/tanitim', '/giris', '/kurulum', '/evim'];

/**
 * Tanıtım ve ev kurulumundan sonra Ücretsiz / Premium seçimi. Bir kere seçilince bir daha çıkmaz;
 * sonra Hesabım'dan açılır. Premium olana hiç çıkmaz.
 */
function LaunchChoice() {
  const { premium } = usePurchases();
  const { state } = useStore();
  const { status, introSeen } = useAuth();
  const path = usePathname();
  const [done, setDone] = useState(() => prefs.get('planChoice') != null);
  const ready = introSeen && (status === 'guest' || status === 'account') && state.setup && !CHOICE_WAIT.includes(path);
  if (done || premium.active || !ready) return null;
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
