import { initCrashReporting } from '@/lib/crash';
import { installTranslationPatch } from '@/i18n/patch';
import { Baloo2_600SemiBold, Baloo2_700Bold } from '@expo-google-fonts/baloo-2';
import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import { router } from '@/lib/nav';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { LogBox, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { CaptchaHost } from '@/auth/captcha';
import { AppAlertHost } from '@/components/AppAlert';
import { ErrorScreen } from '@/components/ErrorScreen';
import { IntroSplash } from '@/components/IntroSplash';
import { MeikaiIntro } from '@/components/MeikaiIntro';
import { PremiumChoice } from '@/components/PremiumChoice';
import { ToastProvider } from '@/components/Toast';
import { FamilyProvider } from '@/family/FamilyProvider';
import { configureNotifications } from '@/notifications/schedule';
import { trackOpen } from '@/lib/events';
import { prefs } from '@/lib/supabase';
import { markFirstDay, needsCheckin } from '@/domain/mood';
import { sessionNo, useStep } from '@/lib/firstRun';
import { setSfxEnabled } from '@/lib/sfx';
import { usePlaySync } from '@/play/usePlay';
import { useLeaderboardSync } from '@/leaderboard/leaderboard';
import { usePersona, usePersonaSync } from '@/profile/usePersona';
import { PurchasesProvider, usePurchases } from '@/purchases/PurchasesProvider';
import { AppStoreProvider, useStore } from '@/store/AppStore';
import { useCloudSync } from '@/sync/cloud';
import { useColors } from '@/theme';

initCrashReporting();
installTranslationPatch();
SplashScreen.preventAutoHideAsync().catch(() => {});
// Emülatörde Google Play hesabı olmadığı için RevenueCat her açılışta hata yazar; geliştirirken ekranı kaplamasın.
if (__DEV__) LogBox.ignoreLogs(['[RevenueCat]']);
configureNotifications();

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <ErrorScreen error={error} retry={retry} />;
}

export default function RootLayout() {
  const c = useColors();
  const [introDone, setIntroDone] = useState(false);
  const [meikai, setMeikai] = useState<'play' | 'fade' | 'done'>('play');
  const [fontsLoaded, fontError] = useFonts({
    Baloo2_600SemiBold, Baloo2_700Bold, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold,
  });

  useEffect(() => trackOpen(), []);

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
                <CaptchaHost />
                <AppAlertHost />
              </FamilyProvider>
              {/* Açılış animasyonu uygulamanın üstünde oynar; altta veriler bu sırada yüklenir. İlk karede
                  takılır ve Meikai bitene kadar opak krem perde olarak bekler: tanıtım/sorular introdan önce görünmez. */}
              {!introDone && <IntroSplash play={meikai !== 'play'} onDone={() => setIntroDone(true)} />}
              {/* Önce Meikai Digital açılışı; solarken altta Homezy açılışı başlar. */}
              {meikai !== 'done' && <MeikaiIntro onFade={() => setMeikai(m => (m === 'play' ? 'fade' : m))} onDone={() => setMeikai('done')} />}
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
  usePersonaSync();
  useLeaderboardSync();
  const { seen: quizSeen } = usePersona();
  const { update } = useStore();
  // Ilk indirme günü işaretlenir: o gün "nasılsın" / "evde misin" sorulmaz (src/domain/mood.ts).
  const needFirst = !state.setup && !state.play.ask?.first;
  useEffect(() => {
    if (needFirst) update(D => markFirstDay(D.play));
  }, [needFirst, update]);
  const sound = state.settings.sound;
  useEffect(() => setSfxEnabled(sound), [sound]);

  const loading = status === 'loading';
  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  // Ne olursa olsun 8 sn sonra açılış ekranı kalkar (ağ takılsa bile).
  useEffect(() => {
    const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 8000);
    return () => clearTimeout(t);
  }, []);

  // Evi zaten kurulu olanlara da sorular bir kere açılır (sonra Ben > Seni tanıyalım'dan tekrar).
  const askOld = !loading && introSeen && (status === 'guest' || status === 'account') && state.setup && !quizSeen;
  useEffect(() => {
    if (!askOld) return;
    const t = setTimeout(() => router.push('/taniyalim'), 1500);
    return () => clearTimeout(t);
  }, [askOld]);

  if (loading) return null;
  // Açılış sırası: açılış animasyonu → tanıtım (Moka) → giriş / hesap oluştur (ya da hesapsız devam) → evini kur → evle ilgili sorular → Ücretsiz / Premium seçimi (LaunchChoice) → ana ekran.
  const inside = introSeen && (status === 'guest' || status === 'account');

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: c.bg } }}>
      <Stack.Protected guard={!introSeen}>
        <Stack.Screen name="tanitim" options={{ animation: 'fade' }} />
      </Stack.Protected>
      {/* Tanıtımdan sonra "seni tanıyalım" soruları (evi zaten kurulu olanlara sorulmaz). */}
      <Stack.Protected guard={introSeen && (state.setup || !quizSeen)}>
        <Stack.Screen name="taniyalim" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={inside && state.setup}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="oda/[id]" options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen name="is" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="temizlik" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="plan" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="yasal" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="bildirimler" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="magaza" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="bahce" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="dekor" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="odak" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="moka" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="spor" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="rozetler" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="siralama" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="buyume" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="aliskanlik" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="gunluk" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ilac" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="alisveris" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="evcil" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="evler" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="aile" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="bakim" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="dolap" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="buzdolabi" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="evim" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="yemek" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="hafta" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ruhhali" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="gunum" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="hikaye" options={{ animation: 'fade' }} />
        <Stack.Screen name="premium" options={{ animation: 'slide_from_bottom' }} />
      </Stack.Protected>
      <Stack.Protected guard={inside && !state.setup}>
        <Stack.Screen name="kurulum" options={{ animation: 'fade' }} />
      </Stack.Protected>
      {/* Misafir de buradan hesap açabilsin diye hesapla girmemiş herkese açık. */}
      <Stack.Protected guard={introSeen && status !== 'account' && !(status === 'guest' && !state.setup)}>
        <Stack.Screen name="giris" options={{ animation: 'slide_from_bottom' }} />
      </Stack.Protected>
    </Stack>
  );
}

// Evi kurarken ve tanıtımda satın alma ekranı çıkmasın diye bu sayfalarda gizlenir.
const CHOICE_WAIT = ['/tanitim', '/taniyalim', '/giris', '/kurulum', '/evim'];
// Seçim ekranı rota değil, üstüne binen bir katman: sadece sekme sayfalarında çıkar (yoksa derin bağlantıyla açılan sayfa altında kalır).
const CHOICE_TABS = ['/', '/bugun', '/gelisim', '/odalar', '/hesap'];

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
  // İlk açılışta (ve ilk oturumda) satın alma ekranı çıkmaz; kullanıcı önce evini görsün. İkinci açılıştan itibaren sırayla gelir.
  const ready = sessionNo >= 2 && introSeen && (status === 'guest' || status === 'account') && state.setup && !CHOICE_WAIT.includes(path) && CHOICE_TABS.includes(path) && !needsCheckin(state.play);
  const turn = useStep('choice', !done && !premium.active && ready);
  if (!turn) return null;
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
