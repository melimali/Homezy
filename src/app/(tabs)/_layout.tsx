import { Tabs } from 'expo-router';

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
    <Tabs
      tabBar={props => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: c.bg },
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
