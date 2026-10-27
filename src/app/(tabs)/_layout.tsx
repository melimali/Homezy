import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useNotificationSync } from '@/notifications/useNotificationSync';
import { useWidgetSync } from '@/widget/useWidgetSync';
import { brand, fonts, useColors } from '@/theme';

type IconName = 'home' | 'rooms' | 'today' | 'me';

/** Sekme seçilince simgesi küçük bir zıplama yapar. */
function TabIcon({ name, color, focused }: { name: IconName; color: ColorValue; focused: boolean }) {
  const [v] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!focused) return;
    v.setValue(0.7);
    Animated.spring(v, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }).start();
  }, [focused, v]);
  return (
    <Animated.View
      style={{
        transform: [{ scale: v }],
        width: 56, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
        backgroundColor: focused ? 'rgba(235,245,238,0.16)' : 'transparent',
      }}
    >
      <TabGlyph name={name} color={color} />
    </Animated.View>
  );
}

function TabGlyph({ name, color }: { name: IconName; color: ColorValue }) {
  const p = { stroke: color, strokeWidth: 2.4, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
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
  useWidgetSync();

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
        tabBarInactiveTintColor: 'rgba(235,245,238,0.5)',
        tabBarStyle: {
          backgroundColor: barBg,
          borderTopWidth: 0,
          height: 72 + bottom,
          paddingTop: 10,
          paddingHorizontal: 12,
          borderTopLeftRadius: 36,
          borderTopRightRadius: 36,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: { fontFamily: fonts.bodyBlack, fontSize: 11.5, letterSpacing: 0.3, marginTop: 4 },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Ev', tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} /> }} />
      <Tabs.Screen name="odalar" options={{ title: 'Odalar', tabBarIcon: ({ color, focused }) => <TabIcon name="rooms" color={color} focused={focused} /> }} />
      <Tabs.Screen name="bugun" options={{ title: 'Bugün', tabBarIcon: ({ color, focused }) => <TabIcon name="today" color={color} focused={focused} /> }} />
      <Tabs.Screen name="hesap" options={{ title: 'Hesabım', tabBarIcon: ({ color, focused }) => <TabIcon name="me" color={color} focused={focused} /> }} />
    </Tabs>
  );
}
