import type { ComponentProps, ReactNode } from 'react';
import {
  Image,
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

import { displayName, useAuth } from '@/auth/AuthProvider';
import { fmtShort } from '@/domain/logic';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import type { StatusKind } from '@/domain/types';
import { brand, fonts, radius, useColors, type Colors } from '@/theme';

/* ---------- metin ---------- */

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'bold' | 'small' | 'tiny' | 'eyebrow' | 'lead';

export function T({ v = 'body', style, ...rest }: TextProps & { v?: Variant }) {
  const c = useColors();
  return <Text {...rest} style={[textStyle(v, c), style]} />;
}

function textStyle(v: Variant, c: Colors): TextStyle {
  switch (v) {
    case 'h1': return { fontFamily: fonts.displayBold, fontSize: 27, lineHeight: 31, color: c.ink, letterSpacing: -0.2 };
    case 'h2': return { fontFamily: fonts.display, fontSize: 17, color: c.ink };
    case 'h3': return { fontFamily: fonts.display, fontSize: 15, color: c.ink };
    case 'bold': return { fontFamily: fonts.bodyBlack, fontSize: 15, color: c.ink };
    case 'small': return { fontFamily: fonts.body, fontSize: 12, color: c.muted };
    case 'tiny': return { fontFamily: fonts.body, fontSize: 12, color: c.muted };
    case 'eyebrow':
      return { fontFamily: fonts.bodyBlack, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', color: c.warm, marginBottom: 6 };
    case 'lead': return { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: c.muted, marginTop: 8 };
    default: return { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: c.ink };
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
      contentContainerStyle={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: 32 }]}
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
  const { status, user } = useAuth();
  // Hesabım ekranı ev kurulduktan sonra açılır; kurulum ekranında düğme görünmez.
  const setup = useStore().state.setup;
  return (
    <View style={styles.header}>
      <View style={[styles.brandPill, { backgroundColor: brand.navy }]}>
        <Image source={require('../../assets/logo-yatay.png')} style={styles.wordmark} resizeMode="contain" accessibilityLabel="Layfapp" />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[styles.dateChip, { backgroundColor: c.surface, borderColor: c.line }]}>
          <T v="small" style={{ fontFamily: fonts.bodyBold }}>{fmtShort(now)}</T>
        </View>
        {setup && (
          <Pressable
            onPress={() => router.push('/hesap')}
            accessibilityRole="button"
            accessibilityLabel="Hesabım"
            hitSlop={6}
            style={({ pressed }) => [styles.avatar, { backgroundColor: c.accent, boxShadow: `0 2px 0 ${c.shadow}` }, pressed && { transform: [{ translateY: 1 }] }]}
          >
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: c.onAccent }}>
              {(status === 'account' ? displayName(user) : 'M').slice(0, 1).toLocaleUpperCase('tr-TR')}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/* ---------- kart ---------- */

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.surface, boxShadow: `0 3px 0 ${c.line}, 0 10px 24px ${c.lift}` }, style]}>
      {children}
    </View>
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

export function EmptyMsg({ children }: { children: ReactNode }) {
  return <T v="small" style={{ fontSize: 14, paddingVertical: 4 }}>{children}</T>;
}

/* ---------- butonlar ---------- */

type BtnKind = 'primary' | 'ghost' | 'soft' | 'danger';

export function Btn({
  label, kind = 'soft', small, block, style, ...rest
}: PressableProps & { label: string; kind?: BtnKind; small?: boolean; block?: boolean; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const bg = kind === 'primary' ? c.accent : kind === 'danger' ? c.late : kind === 'ghost' ? 'transparent' : c.surface2;
  const fg = kind === 'primary' ? c.onAccent : kind === 'danger' ? c.onBadge : c.ink;
  const lift = kind === 'ghost' ? undefined : `0 3px 0 ${kind === 'primary' ? c.shadow : c.lift}`;
  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        block && { alignSelf: 'stretch' },
        { backgroundColor: bg, borderColor: kind === 'ghost' ? c.line : bg },
        lift && !pressed ? { boxShadow: lift } : null,
        pressed && { transform: [{ translateY: 2 }] },
        rest.disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <Text style={{ color: fg, fontFamily: fonts.bodyBlack, fontSize: small ? 13 : 15 }}>{label}</Text>
    </Pressable>
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
    <View style={{ backgroundColor: c.todaySoft, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14 }}>
      <Text style={{ color: c.today, fontFamily: fonts.bodyBold, fontSize: 14 }}>{children}</Text>
    </View>
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
  screen: { paddingHorizontal: 16, gap: 18, width: '100%', maxWidth: 520, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 },
  brandPill: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  wordmark: { width: 102, height: 34 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dateChip: { borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  card: { borderRadius: radius.card, padding: 16, gap: 12 },
  secHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill,
    paddingVertical: 12, paddingHorizontal: 18, borderWidth: 1.5,
  },
  btnSmall: { paddingVertical: 7, paddingHorizontal: 14 },
  x: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  field: {
    flex: 1, minWidth: 0, borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9,
    fontFamily: fonts.body, fontSize: 15,
  },
});
