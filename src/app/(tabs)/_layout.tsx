import { Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';
import { useNotificationSync } from '@/notifications/useNotificationSync';
import { useWidgetSync } from '@/widget/useWidgetSync';
import { useColors } from '@/theme';

/** Dört sekme: Ev, Odalar, Bugün, Hesabım; ortada "+" ile yeni iş (TabBar). Bildirimler ve plan düzenleme bunların içinden açılır. */
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
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Ev' }} />
      <Tabs.Screen name="odalar" options={{ title: 'Odalar' }} />
      <Tabs.Screen name="bugun" options={{ title: 'Bugün' }} />
      <Tabs.Screen name="hesap" options={{ title: 'Hesabım' }} />
    </Tabs>
  );
}
