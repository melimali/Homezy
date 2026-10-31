import { useRouter, type Href } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useEffect, useState } from 'react';
import { Animated, Image, ScrollView, StyleSheet, Text, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { MOKA_ASSETS } from '@/constants/moka';
import { ROOM_EMOJI } from '@/domain/constants';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors, useIsDark } from '@/theme';

import { Squish } from './motion';
import { AddTaskForm } from './TaskRow';
import { Chip, Sheet, T } from './ui';

type IconName = 'home' | 'today' | 'growth' | 'me';
/** Alt menüde görünen sekmeler; listede olmayan rota (ör. odalar) gizli kalır. */
const ICONS: Record<string, IconName> = { index: 'home', bugun: 'today', gelisim: 'growth', hesap: 'me' };
const BUBBLE: Record<IconName, 'peachSoft' | 'sageSoft' | 'roseSoft' | 'lavenderSoft'> = { home: 'peachSoft', today: 'roseSoft', growth: 'sageSoft', me: 'lavenderSoft' };

/**
 * Alt menü (tasarımdaki gibi): açık, yuvarlak köşeli bir şerit; seçili sekme açık bir hapın içinde,
 * ortada Moka'lı yuvarlak "+" düğmesi (iş ekle / temizlik başlat). Sıra: Ev, Bugün, +, Gelişim, Ben.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const c = useColors();
  const dark = useIsDark();
  const insets = useSafeAreaInsets();
  const [menu, setMenu] = useState(false);
  const [add, setAdd] = useState(false);
  const router = useRouter();
  const tabs = state.routes.flatMap((r, i) => {
    if (!ICONS[r.name]) return [];
    const o = descriptors[r.key].options;
    const focused = state.index === i;
    const press = () => {
      const e = emitter.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
      if (!focused && !e.defaultPrevented) navigateToTab(r.key);
    };
    return [<Tab key={r.key} name={ICONS[r.name]} label={String(o.title ?? r.name)} focused={focused} onPress={press} />];
  });
  const half = Math.ceil(tabs.length / 2);

  return (
    <View pointerEvents="box-none" style={[st.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={[st.bar, { backgroundColor: dark ? 'rgba(55,54,74,0.94)' : 'rgba(255,251,245,0.94)', borderColor: dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.9)', shadowColor: c.shadow }]}>
        {tabs.slice(0, half)}
        <Squish onPress={() => setMenu(true)} accessibilityLabel="Ekle" style={[st.plus, { backgroundColor: c.peach, borderColor: c.surface }]}>
          <View style={st.plusClip}>
            <Image source={MOKA_ASSETS.happy} style={st.plusMoka} resizeMode="contain" accessibilityIgnoresInvertColors />
          </View>
          <View style={[st.plusBadge, { backgroundColor: c.accent, borderColor: c.surface }]}>
            <Svg width={12} height={12} viewBox="0 0 24 24">
              <Path d="M12 5v14M5 12h14" stroke={c.onAccent} strokeWidth={4} strokeLinecap="round" />
            </Svg>
          </View>
        </Squish>
        {tabs.slice(half)}
      </View>
      <Sheet open={menu} onClose={() => setMenu(false)} pose="todo">
        <T v="h2">Ne yapalım?</T>
        <View style={{ gap: 10 }}>
          <Squish
            onPress={() => { setMenu(false); setAdd(true); }}
            accessibilityLabel="İş ekle"
            style={[st.opt, { backgroundColor: c.surface2 }]}
          >
            <Text style={{ fontSize: 28 }}>📝</Text>
            <View style={{ flex: 1 }}>
              <T v="bold">İş ekle</T>
              <T v="small">Odaya yeni bir iş yaz</T>
            </View>
          </Squish>
          <Squish
            onPress={() => { setMenu(false); router.push('/temizlik' as Href); }}
            accessibilityLabel="Temizlik başlat"
            style={[st.opt, { backgroundColor: c.accent }]}
          >
            <Text style={{ fontSize: 28 }}>🧹</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 16, color: c.onAccent }}>Temizlik başlat</Text>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13.5, color: c.onAccent, opacity: 0.85 }}>Moka sırayı seçsin, sen yap</Text>
            </View>
          </Squish>
        </View>
      </Sheet>
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
    Animated.spring(v, { toValue: 1.06, friction: 3, tension: 200, useNativeDriver: true }).start();
  }, [focused, v]);
  const color = focused ? c.ink : c.muted;
  return (
    <Squish onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label} quiet style={st.tabOuter}>
      <Animated.View style={[st.tab, focused && { backgroundColor: c[BUBBLE[name]] }, { transform: [{ scale: v }] }]}>
        <Glyph name={name} color={color} filled={focused} cut={c[BUBBLE[name]]} />
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
      {name === 'growth' && (
        <>
          <Rect {...p} x={3.5} y={13} width={4.5} height={8} rx={2.25} />
          <Rect {...p} x={9.75} y={8} width={4.5} height={13} rx={2.25} />
          <Rect {...p} x={16} y={3} width={4.5} height={18} rx={2.25} />
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
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 6, maxWidth: 520, alignSelf: 'center', width: '100%' },
  bar: {
    flexDirection: 'row', alignItems: 'center', borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 8, gap: 2,
    borderWidth: 1.5, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 1, shadowRadius: 22, elevation: 8,
  },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.tile, paddingVertical: 16, paddingHorizontal: 18 },
  tabOuter: { flex: 1 },
  tab: { alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 7, borderRadius: radius.pill },
  label: { fontSize: 11 },
  plus: {
    width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4, marginTop: -22, borderWidth: 4,
    shadowColor: '#B9805F', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
  },
  plusClip: { width: 54, height: 54, borderRadius: 27, overflow: 'hidden', alignItems: 'center' },
  plusMoka: { width: 60, height: 60, marginTop: 4 },
  plusBadge: { position: 'absolute', right: -4, bottom: -2, width: 22, height: 22, borderRadius: 11, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
});
