import { Tabs, useRouter, type Href } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Squish } from '@/components/motion';
import { MOKA_ASSETS } from '@/constants/moka';

import { TabBar } from '@/components/TabBar';
import { useNotificationSync } from '@/notifications/useNotificationSync';
import { useWidgetSync } from '@/widget/useWidgetSync';
import { useColors } from '@/theme';

/**
 * Dört sekme (docs/skeleton-v3.md): Ev, Bugün, Gelişim, Ben; ortada Moka "+" (TabBar).
 * Odalar artık Ev'in içinde; rota eski bağlantılar için gizli sekme olarak duruyor.
 */
export default function TabLayout() {
  const c = useColors();
  useNotificationSync();
  useWidgetSync();

  return (
    <View style={{ flex: 1 }}>
      <TabsNav bg={c.bg} />
      <MokaFab />
    </View>
  );
}

/** Sol altta her sekmede duran Moka sohbet düğmesi (alt menünün üstünde, güvenli alanı kapatmaz). */
function MokaFab() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <Squish
      onPress={() => router.push('/moka' as Href)}
      accessibilityLabel="Moka ile sohbet"
      style={[st.fab, { left: 14, bottom: Math.max(insets.bottom, 12) + 92, backgroundColor: c.peachSoft, borderColor: c.surface, shadowColor: c.shadow }]}
    >
      <View style={st.clip}>
        <Image source={MOKA_ASSETS.wink} style={st.img} resizeMode="contain" accessibilityIgnoresInvertColors />
      </View>
    </Squish>
  );
}

const st = StyleSheet.create({
  fab: {
    position: 'absolute', width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 12, elevation: 6,
  },
  clip: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', alignItems: 'center' },
  img: { width: 54, height: 54, marginTop: 4 },
});

function TabsNav({ bg }: { bg: string }) {
  return (
    <Tabs
      tabBar={props => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: bg },
        tabBarStyle: { position: 'absolute' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Ev' }} />
      <Tabs.Screen name="bugun" options={{ title: 'Bugün' }} />
      <Tabs.Screen name="gelisim" options={{ title: 'Gelişim' }} />
      <Tabs.Screen name="hesap" options={{ title: 'Ben' }} />
      <Tabs.Screen name="odalar" options={{ title: 'Odalar', href: null }} />
    </Tabs>
  );
}
