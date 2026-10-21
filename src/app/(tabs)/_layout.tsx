import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useNotificationSync } from '@/notifications/useNotificationSync';
import { brand, fonts, useColors } from '@/theme';

type IconName = 'home' | 'rooms' | 'today' | 'me';

function TabIcon({ name, color }: { name: IconName; color: ColorValue }) {
  const p = { stroke: color, strokeWidth: 2.2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      {name === 'home' && <Path {...p} d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />}
      {name === 'rooms' && (
        <>
          <Rect {...p} x={3} y={3} width={8} height={8} rx={2.5} />
          <Rect {...p} x={13} y={3} width={8} height={8} rx={2.5} />
          <Rect {...p} x={3} y={13} width={8} height={8} rx={2.5} />
          <Rect {...p} x={13} y={13} width={8} height={8} rx={2.5} />
        </>
      )}
      {name === 'today' && (
        <>
          <Rect {...p} x={4} y={5} width={16} height={16} rx={3} />
          <Path {...p} d="M8 3v4M16 3v4M9 14l2 2 4-4" />
        </>
      )}
      {name === 'me' && (
        <>
          <Circle {...p} cx={12} cy={8} r={4} />
          <Path {...p} d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
        </>
      )}
    </Svg>
  );
}

/** Dört sekme: Ev, Odalar, Bugün, Hesabım. Bildirimler ve plan düzenleme bunların içinden açılır. */
export default function TabLayout() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  useNotificationSync();

  // Alt menü iki temada da lacivert/koyu kalır (logodaki zemin).
  const barBg = c.bg === brand.navy ? '#1C2232' : brand.navy;
  // Yükseklik açıkça verilmeli: `height: undefined` verince Android'de çubuk içeriği
  // sistem gezinme çubuğunun altında eziliyor ve sekmelerin yarısı görünmüyordu.
  const bottom = Math.max(insets.bottom, 8);

  return (
    <Tabs
      safeAreaInsets={{ bottom }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: brand.mint,
        tabBarInactiveTintColor: 'rgba(235,245,238,0.55)',
        tabBarStyle: {
          backgroundColor: barBg,
          borderTopWidth: 0,
          height: 66 + bottom,
          paddingTop: 8,
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          elevation: 0,
        },
        tabBarLabelStyle: { fontFamily: fonts.bodyBlack, fontSize: 12, marginTop: 2 },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Ev', tabBarIcon: ({ color }) => <TabIcon name="home" color={color} /> }} />
      <Tabs.Screen name="odalar" options={{ title: 'Odalar', tabBarIcon: ({ color }) => <TabIcon name="rooms" color={color} /> }} />
      <Tabs.Screen name="bugun" options={{ title: 'Bugün', tabBarIcon: ({ color }) => <TabIcon name="today" color={color} /> }} />
      <Tabs.Screen name="hesap" options={{ title: 'Hesabım', tabBarIcon: ({ color }) => <TabIcon name="me" color={color} /> }} />
    </Tabs>
  );
}
