import type { BottomTabBarProps } from 'expo-router/tabs';
import { useEffect, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { ROOM_EMOJI } from '@/domain/constants';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

import { Squish } from './motion';
import { AddTaskForm } from './TaskRow';
import { Chip, Sheet, T } from './ui';

type IconName = 'home' | 'rooms' | 'today' | 'me';
const ICONS: Record<string, IconName> = { index: 'home', odalar: 'rooms', bugun: 'today', hesap: 'me' };

/**
 * Alt menü (tasarımdaki gibi): açık, yuvarlak köşeli bir şerit; seçili sekme açık bir hapın içinde,
 * ortada koyu, yuvarlak "+" düğmesi (yeni iş ekleme). Sıra: Ev, Odalar, +, Bugün, Hesabım.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [add, setAdd] = useState(false);
  const tabs = state.routes.map((r, i) => {
    const o = descriptors[r.key].options;
    const focused = state.index === i;
    const press = () => {
      const e = emitter.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
      if (!focused && !e.defaultPrevented) navigateToTab(r.key);
    };
    return <Tab key={r.key} name={ICONS[r.name] ?? 'home'} label={String(o.title ?? r.name)} focused={focused} onPress={press} />;
  });
  const half = Math.ceil(tabs.length / 2);

  return (
    <View style={[st.wrap, { backgroundColor: c.bg, paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={[st.bar, { backgroundColor: c.surface }]}>
        {tabs.slice(0, half)}
        <Squish onPress={() => setAdd(true)} accessibilityLabel="Yeni iş ekle" style={[st.plus, { backgroundColor: c.accent }]}>
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path d="M12 5v14M5 12h14" stroke={c.onAccent} strokeWidth={2.8} strokeLinecap="round" />
          </Svg>
        </Squish>
        {tabs.slice(half)}
      </View>
      <AddSheet open={add} onClose={() => setAdd(false)} />
    </View>
  );
}

function Tab({ name, label, focused, onPress }: { name: IconName; label: string; focused: boolean; onPress: () => void }) {
  const c = useColors();
  const [v] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!focused) return;
    v.setValue(0.8);
    Animated.spring(v, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }).start();
  }, [focused, v]);
  const color = focused ? c.ink : c.muted;
  return (
    <Squish onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label} quiet style={st.tabOuter}>
      <Animated.View style={[st.tab, focused && { backgroundColor: c.surface2 }, { transform: [{ scale: v }] }]}>
        <Glyph name={name} color={color} filled={focused} cut={c.surface2} />
        <Text numberOfLines={1} style={[st.label, { color, fontFamily: focused ? fonts.bodyBlack : fonts.bodyBold }]}>{label}</Text>
      </Animated.View>
    </Squish>
  );
}

function Glyph({ name, color, filled, cut }: { name: IconName; color: ColorValue; filled: boolean; cut: ColorValue }) {
  const p = { stroke: color, strokeWidth: 2.2, fill: filled ? color : 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const line = { ...p, fill: 'none' };
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
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
          <Path {...line} stroke={filled ? cut : color} d="M9 14l2 2 4-4" />
          <Path {...line} d="M8 3v4M16 3v4" />
        </>
      )}
      {name === 'me' && (
        <>
          <Circle {...p} cx={12} cy={8} r={4} />
          <Path {...p} d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6z" />
        </>
      )}
    </Svg>
  );
}

/** "+" düğmesi: odayı seç, işin adını ve sıklığını yaz. */
function AddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state: S } = useStore();
  const ids = S.order.filter(id => S.rooms[id]);
  const [rid, setRid] = useState<string | null>(null);
  const cur = rid && S.rooms[rid] ? rid : ids[0];
  return (
    <Sheet open={open} onClose={onClose} pose="todo">
      <T v="h2">Yeni iş ekle</T>
      <T v="small">Hangi oda için?</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {ids.map(id => (
          <Chip key={id} label={`${ROOM_EMOJI[S.rooms[id].type]} ${S.rooms[id].name}`} on={id === cur} onPress={() => setRid(id)} />
        ))}
      </ScrollView>
      {cur && <AddTaskForm key={cur} rid={cur} list="tasks" placeholder="Yeni iş, ör. Perde yıkama" autoOpen onAdded={onClose} />}
    </Sheet>
  );
}

const st = StyleSheet.create({
  wrap: { paddingHorizontal: 14, paddingTop: 6 },
  bar: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 8, gap: 2 },
  tabOuter: { flex: 1 },
  tab: { alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 7, borderRadius: radius.pill },
  label: { fontSize: 11 },
  plus: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', marginHorizontal: 6 },
});
