import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, type Href } from 'expo-router';

import { useReduceMotion } from '@/components/motion';
import { NUDGE_FREE, NUDGE_ROWS } from '@/i18n/nudge';
import { tx } from '@/i18n/runtime';
import { useRouter } from '@/lib/nav';
import { prefs } from '@/lib/supabase';
import { haptic } from '@/lib/sfx';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { fonts, radius, useColors } from '@/theme';

/** Günde en çok bu kadar çağrı, ikisi arasında en az bu kadar süre, uygulama açıldıktan en erken bu kadar sonra. */
const MAX_PER_DAY = 3;
const MIN_GAP_MS = 3 * 60 * 60 * 1000;
const FIRST_MS = [45_000, 90_000] as const;
const SHOW_MS = 6000;
const TAB_PATHS = new Set(['/', '/index', '/bugun', '/gelisim', '/hesap']);

let lastIdx = -1;
const dayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
const read = (k: string) => {
  try {
    return prefs.get(k) ?? '';
  } catch {
    return '';
  }
};
const write = (k: string, v: string) => {
  try {
    prefs.set(k, v);
  } catch {
    // Saklanamazsa bu oturumda bir kez daha gösterilebilir; sorun değil.
  }
};

/**
 * Alt menüdeki Moka düğmesinin üstünde ara sıra beliren küçük, tatlı çağrı balonu.
 * Ücretsiz üyelere sohbetin Premium olduğunu açıkça söyleyen cümleler de çıkar; Premium üyelere sadece hafif davetler.
 * Sıklık sınırı: günde en çok 3, aralarında en az 3 saat, uygulama açıldıktan 45-90 sn sonra; odadayken ya da sekme dışındayken çıkmaz.
 */
export function MokaNudge({ buttonSize }: { buttonSize: number }) {
  const c = useColors();
  const router = useRouter();
  const reduce = useReduceMotion();
  const path = usePathname();
  const { premium } = usePurchases();
  const isPremium = !!premium.active;
  const onTab = TAB_PATHS.has(path);
  const [msg, setMsg] = useState<string | null>(null);
  const [anim] = useState(() => new Animated.Value(0));
  const hideT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTabRef = useRef(onTab);
  const premRef = useRef(isPremium);
  useEffect(() => {
    onTabRef.current = onTab;
    premRef.current = isPremium;
  }, [onTab, isPremium]);

  const hide = () => {
    if (hideT.current) clearTimeout(hideT.current);
    hideT.current = null;
    Animated.timing(anim, { toValue: 0, duration: reduce ? 0 : 200, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => setMsg(null));
  };

  useEffect(() => {
    const wait = FIRST_MS[0] + Math.random() * (FIRST_MS[1] - FIRST_MS[0]);
    const t = setTimeout(() => {
      if (!onTabRef.current) return;
      const today = dayKey();
      const n = read('nudge.d') === today ? Number(read('nudge.n') || '0') : 0;
      const last = Number(read('nudge.t') || '0');
      if (n >= MAX_PER_DAY || Date.now() - last < MIN_GAP_MS) return;
      const pool = premRef.current ? NUDGE_ROWS.slice(NUDGE_FREE) : NUDGE_ROWS.slice(0, NUDGE_FREE);
      let i = Math.floor(Math.random() * pool.length);
      if (pool.length > 1 && pool[i]![0] === NUDGE_ROWS[lastIdx]?.[0]) i = (i + 1) % pool.length;
      lastIdx = NUDGE_ROWS.indexOf(pool[i]!);
      write('nudge.d', today);
      write('nudge.n', String(n + 1));
      write('nudge.t', String(Date.now()));
      setMsg(tx(pool[i]![0]));
    }, wait);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!msg) return;
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }).start();
    hideT.current = setTimeout(hide, SHOW_MS);
    return () => {
      if (hideT.current) clearTimeout(hideT.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msg]);

  // Sekmeden çıkınca (odaya girince) hemen kapanır.
  useEffect(() => {
    if (!onTab && msg) hide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onTab]);

  if (!msg) return null;
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[st.wrap, { bottom: buttonSize + 14, opacity: anim, transform: [
        { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [reduce ? 0 : 10, 0] }) },
        { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [reduce ? 1 : 0.8, 1] }) },
      ] }]}
    >
      <Pressable
        onPress={() => { haptic('light'); hide(); router.push('/moka' as Href); }}
        accessibilityRole="button"
        accessibilityLabel={msg}
        style={[st.bubble, { backgroundColor: c.surface, borderColor: c.line, shadowColor: c.shadow }]}
      >
        <Text maxFontSizeMultiplier={1.2} style={[st.text, { color: c.ink }]}>{msg}</Text>
        <Pressable onPress={hide} hitSlop={10} accessibilityRole="button" accessibilityLabel={tx('Kapat')} style={st.x}>
          <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 13, color: c.muted }}>✕</Text>
        </Pressable>
      </Pressable>
      <View style={[st.tail, { backgroundColor: c.surface, borderColor: c.line }]} />
    </Animated.View>
  );
}

const st = StyleSheet.create({
  wrap: { position: 'absolute', alignSelf: 'center', width: 232, alignItems: 'center' },
  bubble: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 11, paddingLeft: 14, paddingRight: 10, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 },
  text: { flex: 1, fontFamily: fonts.bodyBlack, fontSize: 14, lineHeight: 19 },
  x: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  tail: { width: 14, height: 14, marginTop: -8, transform: [{ rotate: '45deg' }], borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
});
