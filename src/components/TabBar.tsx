import { type Href } from 'expo-router';
import { useRouter } from '@/lib/nav';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useEffect, useState } from 'react';
import { Animated, Image, ScrollView, StyleSheet, Text, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { MOKA_ASSETS } from '@/constants/moka';
import { furSource } from '@/components/MokaAcc';
import { ROOM_EMOJI } from '@/domain/constants';
import { useStore } from '@/store/AppStore';
import { fonts, warmShadow, radius, useColors, useIsDark } from '@/theme';

import { AdBanner } from '@/ads/AdBanner';
import { haptic } from '@/lib/sfx';

import { MokaNudge } from './MokaNudge';
import { Squish } from './motion';
import { AddTaskForm } from './TaskRow';
import { TAB_TONE, type Tone } from './ScreenBackground';
import { Chip, Sheet, T } from './ui';

type IconName = 'home' | 'today' | 'growth' | 'me';
/** Alt menüde görünen sekmeler; listede olmayan rota (ör. odalar) gizli kalır. */
const ICONS: Record<string, IconName> = { index: 'home', bugun: 'today', gelisim: 'growth', hesap: 'me' };
const TONE_OF: Record<IconName, Tone> = { home: 'peach', today: 'rose', growth: 'sky', me: 'lavender' };
const BUBBLE: Record<IconName, 'peachSoft' | 'sageSoft' | 'roseSoft' | 'lavenderSoft'> = { home: 'peachSoft', today: 'roseSoft', growth: 'sageSoft', me: 'lavenderSoft' };

/**
 * Alt menü (tasarımdaki gibi): açık, yuvarlak köşeli bir şerit; seçili sekme açık bir hapın içinde,
 * ortada Moka'lı yuvarlak "+" düğmesi (iş ekle / temizlik başlat). Sıra: Ev, Bugün, +, Gelişim, Ben.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const c = useColors();
  const dark = useIsDark();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mokaFur = useStore().state.play.mokaFur;
  const tabs = state.routes.flatMap((r, i) => {
    if (!ICONS[r.name]) return [];
    const o = descriptors[r.key].options;
    const focused = state.index === i;
    const press = () => {
      if (!focused) haptic('light');
      const e = emitter.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
      if (!focused && !e.defaultPrevented) navigateToTab(r.key);
    };
    return [<Tab key={r.key} name={ICONS[r.name]} label={String(o.title ?? r.name)} focused={focused} onPress={press} />];
  });
  const half = Math.ceil(tabs.length / 2);

  return (
    <View pointerEvents="box-none" style={[st.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <AdBanner dock />
      <View style={[st.bar, { backgroundColor: c.surface, borderColor: dark ? 'rgba(255,255,255,0.06)' : c.line, shadowColor: c.shadow }]}>
        {tabs.slice(0, half)}
        <View style={{ alignItems: 'center', zIndex: 10 }}>
        <Squish onPress={() => { haptic('light'); router.push('/moka' as Href); }} accessibilityLabel="Moka'nın odası: sohbet, iş ekle, temizlik" style={[st.plus, { backgroundColor: c.peach, borderColor: c.surface }]}>
          <View style={st.plusClip}>
            <Image source={furSource(mokaFur, 'happy', MOKA_ASSETS.happy)} style={st.plusMoka} resizeMode="contain" accessibilityIgnoresInvertColors />
          </View>
        </Squish>
          <MokaNudge buttonSize={58} />
        </View>
        {tabs.slice(half)}
      </View>
    </View>
  );
}

function Tab({ name, label, focused, onPress }: { name: IconName; label: string; focused: boolean; onPress: () => void }) {
  const c = useColors();
  const dark = useIsDark();
  const tone = TAB_TONE[TONE_OF[name]];
  const mode = dark ? 'dark' : 'light';
  const [v] = useState(() => new Animated.Value(1));
  const [f] = useState(() => new Animated.Value(focused ? 1 : 0));
  useEffect(() => {
    Animated.timing(f, { toValue: focused ? 1 : 0, duration: 320, useNativeDriver: false }).start();
  }, [focused, f]);
  const pillBg = f.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,0,0,0)', tone.pill[mode]] });
  useEffect(() => {
    if (!focused) return;
    v.setValue(0.8);
    Animated.spring(v, { toValue: 1.06, friction: 3, tension: 200, useNativeDriver: true }).start();
  }, [focused, v]);
  const color = focused ? tone.ink[mode] : c.muted;
  return (
    <Squish onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label} quiet style={st.tabOuter}>
      {/* Arka plan (JS sürücü) ve ölçek (yerel sürücü) aynı View'da karışırsa "moved to native" hatası verir; ayrı View'lar. */}
      <Animated.View style={[st.tab, { backgroundColor: pillBg }]}>
        <Animated.View style={[st.tabInner, { transform: [{ scale: v }] }]}>
          <Glyph name={name} color={color} filled={focused} cut={c[BUBBLE[name]]} />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.15} style={[st.label, { color, fontFamily: focused ? fonts.bodyBlack : fonts.bodyBold }]}>{label}</Text>
        </Animated.View>
      </Animated.View>
    </Squish>
  );
}

function Glyph({ name, color, filled, cut }: { name: IconName; color: ColorValue; filled: boolean; cut: ColorValue }) {
  const p = { stroke: color, strokeWidth: 2.2, fill: filled ? color : 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const line = { ...p, fill: 'none' };
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24">
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
export function AddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
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
    flexDirection: 'row', alignItems: 'center', borderRadius: 28, paddingVertical: 6, paddingHorizontal: 6, gap: 2,
    borderWidth: StyleSheet.hairlineWidth, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 14, elevation: 6,
  },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.card, paddingVertical: 16, paddingHorizontal: 18, minHeight: 72 },
  tabOuter: { flex: 1 },
  tab: { alignItems: 'center', justifyContent: 'center', minHeight: 50, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 22 },
  tabInner: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontSize: 12 },
  plus: {
    width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4, marginTop: -22, borderWidth: 3,
    shadowColor: warmShadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
  },
  plusClip: { width: 56, height: 56, borderRadius: radius.card, overflow: 'hidden', alignItems: 'center' },
  plusMoka: { width: 62, height: 62, marginTop: 4 },
});
