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
import { fonts, radius, space, useColors, type Colors } from '@/theme';

import { Appear, Float, Squish } from './motion';

/* ---------- metin ---------- */

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'bold' | 'small' | 'tiny' | 'eyebrow' | 'lead';

export function T({ v = 'body', style, ...rest }: TextProps & { v?: Variant }) {
  const c = useColors();
  return <Text {...rest} style={[textStyle(v, c), style]} />;
}

function textStyle(v: Variant, c: Colors): TextStyle {
  switch (v) {
    case 'h1': return { fontFamily: fonts.displayBold, fontSize: 36, lineHeight: 42, color: c.ink, letterSpacing: -0.8 };
    case 'h2': return { fontFamily: fonts.displayBold, fontSize: 23, lineHeight: 29, color: c.ink, letterSpacing: -0.3 };
    case 'h3': return { fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 24, color: c.ink };
    case 'bold': return { fontFamily: fonts.bodyBlack, fontSize: 16, color: c.ink };
    case 'small': return { fontFamily: fonts.bodyBold, fontSize: 13.5, lineHeight: 19, color: c.muted };
    case 'tiny': return { fontFamily: fonts.bodyBold, fontSize: 12, color: c.muted };
    case 'eyebrow':
      return { fontFamily: fonts.bodyBlack, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: c.warm, marginBottom: 4 };
    case 'lead': return { fontFamily: fonts.bodyBold, fontSize: 16.5, lineHeight: 24, color: c.muted, marginTop: 6 };
    default: return { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 22, color: c.ink };
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
      contentContainerStyle={[styles.screen, { paddingTop: insets.top + 10, paddingBottom: header ? 42 : insets.bottom + 42 }]}
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
        <View style={[styles.headMokaRing, { backgroundColor: c.surface, borderColor: c.line }]}>
          <Image source={MOKA_ASSETS.happy} style={styles.headMoka} resizeMode="contain" accessibilityLabel="Moka" />
        </View>
        <View>
          <Text style={[styles.brandWord, { color: c.ink }]}>Homezy</Text>
          <T v="tiny">{fmtShort(now)}</T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {state.setup && (
          <Pressable
            onPress={() => router.push('/bildirimler')}
            accessibilityRole="button"
            accessibilityLabel={n ? `Bildirimler, ${n} yeni` : 'Bildirimler'}
            hitSlop={6}
            style={({ pressed }) => [styles.bell, { backgroundColor: c.surface, borderColor: c.line }, pressed && { transform: [{ scale: 0.96 }] }]}
          >
            <Text style={{ fontSize: 19 }}>🔔</Text>
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

/**
 * Yüzen yüzey: çok yuvarlak, kenarlıksız, gölgesiz. `bare` ile zemin rengi kalkar, içerik doğrudan
 * sayfa zemininde nefes alır. İlk göründüğünde yaylanarak gelir (`index` ile sırayla).
 */
export function Card({ children, style, index, bare }: { children: ReactNode; style?: StyleProp<ViewStyle>; index?: number; bare?: boolean }) {
  const c = useColors();
  return (
    <Appear index={index} style={[styles.card, { borderColor: c.line }, bare ? styles.cardBare : { backgroundColor: c.surface }, style]}>
      {children}
    </Appear>
  );
}

/** Sekme başlığı (tasarımdaki gibi): solda büyük başlık, sağda yuvarlak simge düğmesi. */
export function TitleBar({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <Appear style={styles.titleBar}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="h1">{title}</T>
        {!!sub && <T v="small" style={{ marginTop: 2 }}>{sub}</T>}
      </View>
      {right}
    </Appear>
  );
}

/** Yuvarlak simge düğmesi (zil, takvim, ayar…). `badge` sayısı kırmızı rozet olarak durur. */
export function IconBtn({
  icon, label, onPress, badge, size = 46, style,
}: { icon: ReactNode; label: string; onPress: () => void; badge?: number; size?: number; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <Squish onPress={onPress} accessibilityLabel={badge ? `${label}, ${badge}` : label} hitSlop={6}
      style={[{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface }, style]}>
      {typeof icon === 'string' ? <Text style={{ fontSize: size * 0.4 }}>{icon}</Text> : icon}
      {!!badge && (
        <View style={[styles.badge, { backgroundColor: c.late }]}>
          <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 11, color: '#fff' }}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </Squish>
  );
}

/** İnce ilerleme çubuğu (0-1). */
export function Bar({ value, color, track, height = 8, style }: { value: number; color?: string; track?: string; height?: number; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <View style={[{ height, borderRadius: height / 2, overflow: 'hidden', backgroundColor: track ?? c.surface2 }, style]}>
      <View style={{ width: `${v * 100}%`, height: '100%', borderRadius: height / 2, backgroundColor: color ?? c.hi }} />
    </View>
  );
}

/** Sekme başlığı: büyük başlık, kısa alt cümle ve yanında yüzen Moka. */
export function MokaHero({
  title, sub, eyebrow, pose = 'happy', right,
}: { title: string; sub?: string; eyebrow?: string; pose?: MokaPose; right?: ReactNode }) {
  const c = useColors();
  return (
    <Appear style={styles.hero}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {!!eyebrow && <T v="eyebrow">{eyebrow}</T>}
        <T v="h1">{title}</T>
        {!!sub && <T v="lead">{sub}</T>}
        {right}
      </View>
      <View style={[styles.heroRing, { backgroundColor: c.surface }]}>
        <Float amp={4} dur={2400}>
          <Image source={MOKA_ASSETS[pose]} style={styles.heroMoka} resizeMode="contain" accessibilityIgnoresInvertColors />
        </Float>
      </View>
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
      <Float amp={3} dur={2600}>
        <Image source={MOKA_ASSETS[pose]} style={styles.emptyMoka} resizeMode="contain" accessibilityIgnoresInvertColors />
      </Float>
      <T v="bold" style={{ fontSize: 16, lineHeight: 23, textAlign: 'center', maxWidth: 280 }}>{children}</T>
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
        { backgroundColor: kind === 'ghost' ? c.surface : bg },
        kind === 'ghost' && { shadowOpacity: 0, elevation: 0 },
        style,
      ]}
    >
      <Text style={{ color: fg, fontFamily: fonts.bodyBlack, fontSize: small ? 13.5 : 16, letterSpacing: 0.1 }}>{label}</Text>
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
      style={[styles.chip, { backgroundColor: on ? c.accent : c.surface, borderColor: c.line }]}
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
            style={[styles.tab, { backgroundColor: on ? c.accent : c.surface }]}
          >
            <Text style={{ fontSize: 24 }}>{it.emoji}</Text>
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

export function Pill({ k, label }: { k: StatusKind | 'neutral' | 'rose' | 'lavender' | 'sage' | 'peach'; label: string }) {
  const c = useColors();
  const map = {
    late: [c.lateSoft, c.late],
    today: [c.todaySoft, c.today],
    ok: [c.okSoft, c.ok],
    neutral: [c.surface, c.muted],
    rose: [c.roseSoft, c.fashionAccent],
    lavender: [c.lavenderSoft, c.fashionInk],
    sage: [c.sageSoft, c.ok],
    peach: [c.peachSoft, c.today],
  } as const;
  const [bg, fg] = map[k];
  return (
    <View style={[styles.pill, { backgroundColor: k === 'neutral' ? c.surface2 : bg }]}>
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
      style={[styles.field, { color: c.ink, backgroundColor: c.surface2 }, props.style]}
    />
  );
}

export const styles = StyleSheet.create({
  screen: { paddingHorizontal: space.screen, gap: space.section, width: '100%', maxWidth: 520, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headMokaRing: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  headMoka: { width: 50, height: 50, marginTop: 6 },
  brandWord: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 22, letterSpacing: -0.3 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  titleBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroRing: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' },
  heroMoka: { width: 104, height: 104 },
  empty: { alignItems: 'center', gap: 14, paddingVertical: 20 },
  emptyMoka: { width: 132, height: 132 },
  sheetMoka: { position: 'absolute', top: -70, right: 28, width: 92, height: 92 },
  bell: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  badge: { position: 'absolute', top: -3, right: -4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  back: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 16 },
  card: {
    borderRadius: radius.card, padding: space.card, gap: 16, borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#B9805F', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 3,
  },
  cardBare: { paddingHorizontal: 0, paddingVertical: 0, borderWidth: 0, shadowOpacity: 0, elevation: 0 },
  secHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill,
    paddingVertical: 16, paddingHorizontal: 24,
    shadowColor: '#B9805F', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 10, elevation: 2,
  },
  btnSmall: { paddingVertical: 9, paddingHorizontal: 16, shadowOpacity: 0, elevation: 0 },
  chip: { borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 16, borderWidth: StyleSheet.hairlineWidth },
  tabs: { gap: 10, paddingVertical: 6, paddingHorizontal: 2 },
  tab: { alignItems: 'center', justifyContent: 'center', gap: 4, minWidth: 84, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.tile },
  tabBadge: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  x: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pill: { borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 4, alignSelf: 'flex-start' },
  sheetBg: { flex: 1 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: space.card, paddingTop: 12, gap: 16, maxWidth: 520, alignSelf: 'center', width: '100%' },
  grab: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 4 },
  field: {
    flex: 1, minWidth: 0, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 13,
    fontFamily: fonts.bodyBold, fontSize: 15.5,
  },
});
