import { Tabs } from 'expo-router';
import { Text, View, type ColorValue } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { notifs } from '@/domain/logic';
import { useNotificationSync } from '@/notifications/useNotificationSync';
import { useStore } from '@/store/AppStore';
import { brand, fonts, useColors } from '@/theme';

type IconName = 'home' | 'today' | 'notif' | 'setup';

function TabIcon({ name, color }: { name: IconName; color: ColorValue }) {
  const p = { stroke: color, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      {name === 'home' && <Path {...p} d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />}
      {name === 'today' && (
        <>
          <Rect {...p} x={4} y={5} width={16} height={16} rx={2} />
          <Path {...p} d="M8 3v4M16 3v4M4 10h16M9 15l2 2 4-4" />
        </>
      )}
      {name === 'notif' && (
        <>
          <Path {...p} d="M6 16v-5a6 6 0 1 1 12 0v5l2 2H4z" />
          <Path {...p} d="M10 21h4" />
        </>
      )}
      {name === 'setup' && (
        <>
          <Rect {...p} x={3} y={3} width={8} height={8} />
          <Rect {...p} x={13} y={3} width={8} height={5} />
          <Rect {...p} x={13} y={10} width={8} height={11} />
          <Rect {...p} x={3} y={13} width={8} height={8} />
        </>
      )}
    </Svg>
  );
}

export default function TabLayout() {
  const c = useColors();
  const { state } = useStore();
  useNotificationSync();
  const n = notifs(state).length;

  // Alt menü iki temada da lacivert/koyu kalır (logodaki zemin).
  const barBg = c.bg === brand.navy ? '#1C2232' : brand.navy;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: brand.mint,
        tabBarInactiveTintColor: 'rgba(235,245,238,0.55)',
        tabBarStyle: { backgroundColor: barBg, borderTopWidth: 0, height: undefined },
        tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 11 },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Ev', tabBarIcon: ({ color }) => <TabIcon name="home" color={color} /> }} />
      <Tabs.Screen name="bugun" options={{ title: 'Bugün', tabBarIcon: ({ color }) => <TabIcon name="today" color={color} /> }} />
      <Tabs.Screen
        name="bildirimler"
        options={{
          title: 'Bildirimler',
          tabBarIcon: ({ color }) => (
            <View>
              <TabIcon name="notif" color={color} />
              {n > 0 && (
                <View style={{ position: 'absolute', top: -4, right: -10, minWidth: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: brand.clay, alignItems: 'center' }}>
                  <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 10.5, color: brand.navy }}>{n}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarIcon: ({ color }) => <TabIcon name="setup" color={color} /> }} />
    </Tabs>
  );
}
