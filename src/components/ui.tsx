import type { ComponentProps, ReactNode } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fmtShort, notifs } from '@/domain/logic';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import type { StatusKind } from '@/domain/types';
import { MOKA_ASSETS, type MokaPose } from '@/constants/moka';
import { brand, fonts, radius, space, useColors, type Colors } from '@/theme';

import { Appear, Squish } from './motion';

/* ---------- metin ---------- */

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'bold' | 'small' | 'tiny' | 'eyebrow' | 'lead';

export function T({ v = 'body', style, ...rest }: TextProps & { v?: Variant }) {
  const c = useColors();
  return <Text {...rest} style={[textStyle(v, c), style]} />;
}

function textStyle(v: Variant, c: Colors): TextStyle {
  switch (v) {
    case 'h1': return { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 34, color: c.ink, letterSpacing: -0.3 };
    case 'h2': return { fontFamily: fonts.display, fontSize: 20, lineHeight: 26, color: c.ink };
    case 'h3': return { fontFamily: fonts.display, fontSize: 16, lineHeight: 21, color: c.ink };
    case 'bold': return { fontFamily: fonts.bodyBold, fontSize: 16, color: c.ink };
    case 'small': return { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: c.muted };
    case 'tiny': return { fontFamily: fonts.body, fontSize: 12, color: c.muted };
    case 'eyebrow':
      return { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: c.warm, marginBottom: 6 };
    case 'lead': return { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: c.muted, marginTop: 8 };
    default: return { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: c.ink };
  }
}

/* ---------- ekran ---------- */

export function Screen({ children, scrollEnabled = true, header = true }: { children: ReactNode; scrollEnabled?: boolean; header?: boolean }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      scrollEnabled={scrollEnabled}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: header ? 32 : insets.bottom + 32 }]}
    >
      {header && <AppHeader />}
      {children}
    </ScrollView>
  );
}

export function AppHeader() {
  const now = useNow();
  const c = useColors();
  const router = useRouter();
  const { state } = useStore();
  // Zil ev kurulduktan sonra görünür; kurulum ekranında yok.
  const n = state.setup ? notifs(state, now).length : 0;
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <Image source={MOKA_ASSETS.happy} style={styles.headMoka} resizeMode="contain" accessibilityLabel="Moka" />
        <View style={[styles.brandPill, { backgroundColor: brand.mint }]}>
          <Image source={require('../../assets/logo-yatay.png')} style={styles.wordmark} resizeMode="contain" accessibilityLabel="Homezy" />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <T v="small" style={{ fontFamily: fonts.bodyBold }}>{fmtShort(now)}</T>
        {state.setup && (
          <Pressable
            onPress={() => router.push('/bildirimler')}
            accessibilityRole="button"
            accessibilityLabel={n ? `Bildirimler, ${n} yeni` : 'Bildirimler'}
            hitSlop={6}
            style={({ pressed }) => [styles.bell, { backgroundColor: c.surface }, pressed && { transform: [{ translateY: 1 }] }]}
          >
            <Text style={{ fontSize: 18 }}>🔔</Text>
            {n > 0 && (
              <View style={[styles.badge, { backgroundColor: c.late }]}>
                <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 11, color: '#fff' }}>{n}</Text>
              </View>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Alt ekranlardaki "geri" bağlantısı. */
export function BackLink({ label = 'Geri' }: { label?: string }) {
  const c = useColors();
  const router = useRouter();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <Squish onPress={back} hitSlop={8} style={[styles.back, { backgroundColor: c.surface }]}>
      <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 15, color: c.ink }} accessibilityLabel={label || 'Geri'}>‹{label ? `  ${label}` : ''}</Text>
    </Squish>
  );
}

/* ---------- kart ---------- */

/** Düz, gölgesiz kart. İlk göründüğünde yaylanarak gelir (`index` ile sırayla). */
export function Card({ children, style, index }: { children: ReactNode; style?: StyleProp<ViewStyle>; index?: number }) {
  const c = useColors();
  return (
    <Appear index={index} style={[styles.card, { backgroundColor: c.surface }, style]}>
      {children}
    </Appear>
  );
}

export function SecHead({ title, right, h = 'h2' }: { title: string; right?: ReactNode; h?: 'h2' | 'h3' }) {
  return (
    <View style={styles.secHead}>
      <T v={h} style={{ flexShrink: 1 }}>{title}</T>
      {typeof right === 'string' || typeof right === 'number' ? <T v="small">{right}</T> : right}
    </View>
  );
}

/** Boş durum: Moka ve kısa bir cümle. */
export function EmptyMsg({ children, pose = 'wink' }: { children: ReactNode; pose?: MokaPose }) {
  return (
    <View style={styles.empty}>
      <Image source={MOKA_ASSETS[pose]} style={styles.emptyMoka} resizeMode="contain" accessibilityIgnoresInvertColors />
      <T v="small" style={{ fontSize: 14, lineHeight: 20, flex: 1 }}>{children}</T>
    </View>
  );
}

/* ---------- butonlar ---------- */

type BtnKind = 'primary' | 'ghost' | 'soft' | 'danger';

export function Btn({
  label, kind = 'soft', small, block, style, ...rest
}: Omit<PressableProps, 'style' | 'children'> & { label: string; kind?: BtnKind; small?: boolean; block?: boolean; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const bg = kind === 'primary' ? c.accent : kind === 'danger' ? c.late : kind === 'ghost' ? 'transparent' : c.surface2;
  const fg = kind === 'primary' ? c.onAccent : kind === 'danger' ? c.onBadge : c.ink;
  return (
    <Squish
      {...rest}
      style={[
        styles.btn,
        small && styles.btnSmall,
        block && { alignSelf: 'stretch' },
        { backgroundColor: bg, borderColor: kind === 'ghost' ? c.line : bg },
        style,
      ]}
    >
      <Text style={{ color: fg, fontFamily: fonts.bodyBlack, fontSize: small ? 13 : 15 }}>{label}</Text>
    </Squish>
  );
}

export function XBtn({ onPress, label }: { onPress: () => void; label: string }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}
      style={({ pressed }) => [styles.x, pressed && { backgroundColor: c.surface2 }]}>
      <Text style={{ color: c.muted, fontSize: 20, lineHeight: 22 }}>×</Text>
    </Pressable>
  );
}

/** Seçilebilir hap (spor türü, dakika, gün). */
export function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Squish
      onPress={onPress}
      accessibilityState={{ selected: on }}
      style={[styles.chip, on ? { backgroundColor: c.accent, borderColor: c.accent } : { backgroundColor: c.surface, borderColor: c.line }]}
    >
      <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 13.5, color: on ? c.onAccent : c.ink }}>{label}</Text>
    </Squish>
  );
}

/**
 * Oda içi sekmeler: emoji + kısa ad, yatay kaydırılır. Seçili sekme dolgun ve hafif büyük durur.
 * Her şeyi alt alta dizmek yerine bir anda tek bölüm görünür, böylece aşağı kaydırma azalır.
 */
export function Tabs<K extends string>({
  items, value, onChange,
}: { items: { k: K; emoji: string; label: string; badge?: number }[]; value: K; onChange: (k: K) => void }) {
  const c = useColors();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} accessibilityRole="tablist">
      {items.map(it => {
        const on = it.k === value;
        return (
          <Squish
            key={it.k}
            onPress={() => onChange(it.k)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={it.badge ? `${it.label}, ${it.badge}` : it.label}
            style={[
              styles.tab,
              on
                ? { backgroundColor: c.accent }
                : { backgroundColor: c.surface },
            ]}
          >
            <Text style={{ fontSize: 22 }}>{it.emoji}</Text>
            <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 13, color: on ? c.onAccent : c.ink }}>{it.label}</Text>
            {!!it.badge && (
              <View style={[styles.tabBadge, { backgroundColor: c.late }]}>
                <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 11, color: '#fff' }}>{it.badge}</Text>
              </View>
            )}
          </Squish>
        );
      })}
    </ScrollView>
  );
}

/* ---------- rozetler ---------- */

export function Pill({ k, label }: { k: StatusKind | 'neutral'; label: string }) {
  const c = useColors();
  const map = {
    late: [c.lateSoft, c.late],
    today: [c.todaySoft, c.today],
    ok: [c.okSoft, c.ok],
    neutral: [c.surface, c.muted],
  } as const;
  const [bg, fg] = map[k];
  return (
    <View style={[styles.pill, { backgroundColor: bg }, k === 'neutral' && { borderWidth: 1.5, borderColor: c.line }]}>
      <Text style={{ color: fg, fontFamily: fonts.bodyBlack, fontSize: 11.5 }}>{label}</Text>
    </View>
  );
}

export function Swatch({ color, size = 18 }: { color: string; size?: number }) {
  const c = useColors();
  return <View style={{ width: size, height: size, borderRadius: size / 3, borderWidth: 2, borderColor: c.wall, backgroundColor: color }} />;
}

export function Callout({ children }: { children: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ backgroundColor: c.todaySoft, borderRadius: radius.tile, paddingVertical: 12, paddingHorizontal: 16 }}>
      <Text style={{ color: c.today, fontFamily: fonts.bodyBold, fontSize: 14 }}>{children}</Text>
    </View>
  );
}

/** Alttan kayarak açılan yumuşak sayfa. */
export function Sheet({ open, onClose, children, pose = 'happy' }: { open: boolean; onClose: () => void; children: ReactNode; pose?: MokaPose }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.sheetBg, { backgroundColor: c.shadow }]} onPress={onClose} accessibilityLabel="Kapat" />
      <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + 20 }]}>
        <Image source={MOKA_ASSETS[pose]} style={styles.sheetMoka} resizeMode="contain" accessibilityIgnoresInvertColors />
        <View style={[styles.grab, { backgroundColor: c.line }]} />
        {children}
      </View>
    </Modal>
  );
}

/* ---------- formlar ---------- */

export function Field(props: ComponentProps<typeof TextInput>) {
  const c = useColors();
  return (
    <TextInput
      placeholderTextColor={c.muted}
      {...props}
      style={[styles.field, { borderColor: c.line, color: c.ink, backgroundColor: c.bg }, props.style]}
    />
  );
}

export const styles = StyleSheet.create({
  screen: { paddingHorizontal: space.screen, gap: space.section, width: '100%', maxWidth: 520, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headMoka: { width: 48, height: 48, marginVertical: -6 },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  emptyMoka: { width: 64, height: 64 },
  sheetMoka: { position: 'absolute', top: -58, right: 24, width: 76, height: 76 },
  brandPill: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  wordmark: { width: 102, height: 34 },
  bell: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -3, right: -4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  back: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14 },
  card: { borderRadius: radius.card, padding: space.card, gap: 14 },
  secHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill,
    paddingVertical: 13, paddingHorizontal: 20, borderWidth: 1.5,
  },
  btnSmall: { paddingVertical: 7, paddingHorizontal: 14 },
  chip: { borderWidth: 1.5, borderRadius: radius.pill, paddingVertical: 7, paddingHorizontal: 12 },
  tabs: { gap: 8, paddingVertical: 6, paddingHorizontal: 2 },
  tab: { alignItems: 'center', justifyContent: 'center', gap: 2, minWidth: 78, paddingVertical: 9, paddingHorizontal: 12, borderRadius: radius.tile },
  tabBadge: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  x: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  sheetBg: { flex: 1 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: space.card, paddingTop: 10, gap: 14, maxWidth: 520, alignSelf: 'center', width: '100%' },
  grab: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 4 },
  field: {
    flex: 1, minWidth: 0, borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9,
    fontFamily: fonts.body, fontSize: 15,
  },
});
