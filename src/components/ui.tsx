import { useEffect, useState, type ComponentProps, type ComponentRef, type ReactNode, type Ref } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useRouter } from '@/lib/nav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fmtShort, notifs } from '@/domain/logic';
import { tx } from '@/i18n/runtime';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import type { StatusKind } from '@/domain/types';
import { MOKA_ASSETS, type MokaPose } from '@/constants/moka';
import Svg, { Path } from 'react-native-svg';
import { elevation, fonts, hit, warmShadow, radius, space, type, useColors, useIsDark, type Colors } from '@/theme';

import { Appear, Float, Squish } from './motion';
import { DEEP, ScreenBackground, type Tone } from './ScreenBackground';

/* ---------- metin ---------- */

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'bold' | 'small' | 'tiny' | 'eyebrow' | 'lead';

export function T({ v = 'body', style, ...rest }: TextProps & { v?: Variant; /** Metin çevrilmesin (ör. Türkçe öğrenilen kelime). */ noTx?: boolean }) {
  const c = useColors();
  return <Text maxFontSizeMultiplier={type.maxScale} {...rest} style={[textStyle(v, c), style]} />;
}

function textStyle(v: Variant, c: Colors): TextStyle {
  switch (v) {
    case 'h1': return { fontFamily: fonts.displayBold, fontSize: type.h1, lineHeight: 34, color: c.ink, letterSpacing: -0.4 };
    case 'h2': return { fontFamily: fonts.displayBold, fontSize: type.h2, lineHeight: 26, color: c.ink, letterSpacing: -0.2 };
    case 'h3': return { fontFamily: fonts.displayBold, fontSize: type.h3, lineHeight: 22, color: c.ink };
    case 'bold': return { fontFamily: fonts.bodyBlack, fontSize: type.bold, lineHeight: 22, color: c.ink };
    case 'small': return { fontFamily: fonts.bodyBold, fontSize: 13.5, lineHeight: 19, color: c.muted };
    case 'tiny': return { fontFamily: fonts.bodyBold, fontSize: type.tiny, lineHeight: 16, color: c.muted };
    case 'eyebrow':
      return { fontFamily: fonts.bodyBlack, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: c.warm, marginBottom: 4 };
    case 'lead': return { fontFamily: fonts.bodyBold, fontSize: type.lead, lineHeight: 22, color: c.muted, marginTop: 2 };
    default: return { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 22, color: c.ink };
  }
}

/* ---------- ekran ---------- */

export function Screen({
  children, scrollEnabled = true, header = true, tone = 'peach', tab, image, scrollRef, onScrollY,
}: { children: ReactNode; onScrollY?: (y: number) => void; scrollRef?: Ref<ComponentRef<typeof ScrollView>>; scrollEnabled?: boolean; header?: boolean; tone?: Tone; tab?: boolean; image?: ImageSourcePropType }) {
  const c = useColors();
  const dark = useIsDark();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // Aşağı kaydırdıkça zemin yavaşça sekmenin koyu tonuna geçer (yerel sürücü, her kare JS'e uğramaz).
  const [y] = useState(() => new Animated.Value(0));
  const [onScroll] = useState(() => Animated.event([{ nativeEvent: { contentOffset: { y } } }], { useNativeDriver: true }));
  useEffect(() => {
    if (!onScrollY) return;
    const id = y.addListener(({ value }) => onScrollY(value));
    return () => y.removeListener(id);
  }, [y, onScrollY]);
  const deep = DEEP[tone][dark ? 'dark' : 'light'];
  const shift = y.interpolate({ inputRange: [0, Math.max(400, height * 1.2)], outputRange: [0, 1], extrapolate: 'clamp' });
  // Sekme ekranlarında alt menü yüzer; içerik altına girmesin diye ekstra boşluk.
  const bottom = tab ? 148 + insets.bottom : (header ? 42 : insets.bottom + 42);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {image ? <Image source={image} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors /> : <ScreenBackground tone={tone} />}
      {!image && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: deep, opacity: shift }]} />}
      <Animated.ScrollView
        ref={scrollRef as never}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        scrollEnabled={scrollEnabled}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.screen, { paddingTop: insets.top + 10, paddingBottom: bottom }]}
      >
        {header && <AppHeader />}
        {children}
      </Animated.ScrollView>
      {/* Kaydırılan içerik saat ve pil simgelerinin altına girip çakışmasın; şerit de zeminle birlikte renk değiştirir. */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top }}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, opacity: 0.94 }]} />
        {!image && <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: deep, opacity: shift }]} />}
      </View>
    </View>
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
            <Text style={{ fontSize: 17 }}>🔔</Text>
            {n > 0 && (
              <View style={[styles.badge, { backgroundColor: c.late }]}>
                <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 12, color: '#fff' }}>{n}</Text>
              </View>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Sola bakan ok (geri). */
export function Chevron({ color, size = 18, dir = 'left' }: { color: string; size?: number; dir?: 'left' | 'right' | 'down' }) {
  const d = dir === 'left' ? 'M15 5l-7 7 7 7' : dir === 'right' ? 'M9 5l7 7-7 7' : 'M5 9l7 7 7-7';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={d} stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * Alt ekranların üst çubuğu: solda yuvarlak geri düğmesi (44pt), yanında isteğe bağlı başlık,
 * sağda isteğe bağlı düğme. `label` boşsa sadece ok görünür.
 */
export function BackLink({ label = 'Geri', title, right }: { label?: string; title?: string; right?: ReactNode }) {
  const c = useColors();
  const router = useRouter();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <View style={styles.navBar}>
      <Squish onPress={back} hitSlop={8} accessibilityLabel={label || 'Geri'} style={[styles.back, { backgroundColor: c.surface }, elevation.sm]}>
        <Chevron color={c.ink} />
        {!!label && !title && <Text maxFontSizeMultiplier={type.maxScale} style={[styles.backLabel, { color: c.ink }]}>{label}</Text>}
      </Squish>
      {!!title && <T v="h3" numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>{title}</T>}
      {!title && <View style={{ flex: 1 }} />}
      {right}
    </View>
  );
}

/* ---------- kart ---------- */

/**
 * Yüzen yüzey: çok yuvarlak, kenarlıksız, gölgesiz. `bare` ile zemin rengi kalkar, içerik doğrudan
 * sayfa zemininde nefes alır. İlk göründüğünde yaylanarak gelir (`index` ile sırayla).
 */
export function Card({
  children, style, index, bare, tone = 'surface', onPress, accessibilityLabel,
}: {
  children: ReactNode; style?: StyleProp<ViewStyle>; index?: number; bare?: boolean;
  /** surface: krem kart; tint: hafif renkli; outline: zeminsiz, ince çizgili. */
  tone?: 'surface' | 'tint' | 'outline';
  onPress?: () => void; accessibilityLabel?: string;
}) {
  const c = useColors();
  const look = bare
    ? styles.cardBare
    : tone === 'outline'
      ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: c.line, ...elevation.none }
      : { backgroundColor: tone === 'tint' ? c.surface2 : c.surface };
  if (onPress) {
    return (
      <Appear index={index}>
        <Squish onPress={onPress} accessibilityLabel={accessibilityLabel} scaleTo={0.97} style={[styles.card, look, style]}>
          {children}
        </Squish>
      </Appear>
    );
  }
  return (
    <Appear index={index} style={[styles.card, look, style]}>
      {children}
    </Appear>
  );
}

/** İnce ayırıcı çizgi. */
export function Divider({ inset = 0 }: { inset?: number }) {
  const c = useColors();
  return <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: c.line, marginLeft: inset }} />;
}

/**
 * Liste satırı (ayarlar, menüler): solda emoji / simge rozeti, başlık ve alt yazı, sağda değer ya da ok.
 * En az 56pt yüksek, tamamı dokunulabilir.
 */
export function ListRow({
  icon, title, sub, right, onPress, tint, danger, accessibilityLabel,
}: { icon?: ReactNode; title: string; sub?: string; right?: ReactNode; onPress?: () => void; tint?: string; danger?: boolean; accessibilityLabel?: string }) {
  const c = useColors();
  const body = (
    <>
      {icon != null && (
        <View style={[styles.rowIcon, { backgroundColor: tint ?? c.surface2 }]}>
          {typeof icon === 'string' ? <Text style={{ fontSize: 19 }}>{icon}</Text> : icon}
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="bold" numberOfLines={2} style={danger && { color: c.late }}>{title}</T>
        {!!sub && <T v="small" numberOfLines={2}>{sub}</T>}
      </View>
      {typeof right === 'string' ? <T v="small" numberOfLines={1} style={{ maxWidth: '40%' }}>{right}</T> : right}
      {onPress && right === undefined && <Chevron color={c.muted} size={16} dir="right" />}
    </>
  );
  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <Squish onPress={onPress} scaleTo={0.98} accessibilityLabel={accessibilityLabel ?? title} style={styles.row}>
      {body}
    </Squish>
  );
}

/** Sekme başlığı (tasarımdaki gibi): solda büyük başlık, sağda yuvarlak simge düğmesi. */
export function TitleBar({ title, sub, right, after }: { title: string; sub?: string; right?: ReactNode; after?: ReactNode }) {
  return (
    <Appear style={styles.titleBar}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <T v="h1">{title}</T>
          {after}
        </View>
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
          <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 12, color: '#fff' }}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </Squish>
  );
}

/** İnce ilerleme çubuğu (0-1). */
export function Bar({ value, color, track, height = 8, style }: { value: number; color?: string; track?: string; height?: number; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const v = Math.max(0, Math.min(1, value || 0));
  const [w] = useState(() => new Animated.Value(v));
  // Değer değişince çubuk yumuşakça dolar.
  useEffect(() => {
    Animated.timing(w, { toValue: v, duration: 450, useNativeDriver: false }).start();
  }, [v, w]);
  return (
    <View style={[{ height, borderRadius: height / 2, overflow: 'hidden', backgroundColor: track ?? c.surface2 }, style]}>
      <Animated.View
        style={{
          width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          height: '100%', borderRadius: height / 2, backgroundColor: color ?? c.hi,
        }}
      />
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

/** Boş durum: Moka, kısa bir cümle, isteğe bağlı başlık ve düğme. */
export function EmptyMsg({
  children, pose = 'wink', title, action, onAction,
}: { children?: ReactNode; pose?: MokaPose; title?: string; action?: string; onAction?: () => void }) {
  return (
    <Appear style={styles.empty}>
      <Float amp={3} dur={2600}>
        <Image source={MOKA_ASSETS[pose]} style={styles.emptyMoka} resizeMode="contain" accessibilityIgnoresInvertColors />
      </Float>
      {!!title && <T v="h3" style={{ textAlign: 'center' }}>{title}</T>}
      {children != null && (
        <T v={title ? 'small' : 'bold'} style={[{ textAlign: 'center', maxWidth: 300 }, !title && { fontSize: 16, lineHeight: 23 }]}>{children}</T>
      )}
      {!!action && onAction && <Btn label={action} kind="primary" small onPress={onAction} style={{ marginTop: 4 }} />}
    </Appear>
  );
}

/** Yükleniyor: Moka hafifçe süzülür. */
export function Loading({ text = 'Bir saniye…', pose = 'analyzing' }: { text?: string; pose?: MokaPose }) {
  return (
    <Appear style={styles.empty}>
      <View accessibilityRole="progressbar" accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: 8 }}>
        <Float amp={5} dur={1200}>
          <Image source={MOKA_ASSETS[pose]} style={styles.emptyMoka} resizeMode="contain" accessibilityIgnoresInvertColors />
        </Float>
        <T v="small" style={{ textAlign: 'center' }}>{text}</T>
      </View>
    </Appear>
  );
}

/** Hata durumu: üzgün Moka, kısa açıklama, "Tekrar dene". */
export function ErrorState({ text, onRetry, retryLabel = 'Tekrar dene' }: { text: string; onRetry?: () => void; retryLabel?: string }) {
  const c = useColors();
  return (
    <Appear style={[styles.errorBox, { backgroundColor: c.lateSoft }]}>
      <Image source={MOKA_ASSETS.shocked} style={{ width: 64, height: 64 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      <View style={{ flex: 1, minWidth: 0, gap: 8 }} accessibilityLiveRegion="polite">
        <T v="bold" style={{ color: c.late }}>{text}</T>
        {onRetry && <Btn label={retryLabel} small kind="ghost" onPress={onRetry} style={{ alignSelf: 'flex-start' }} />}
      </View>
    </Appear>
  );
}

/** İçerik gelene kadar yumuşakça parlayan yer tutucu. */
export function Skeleton({ height = 16, width = '100%', r = radius.xs, style }: { height?: number; width?: number | `${number}%`; r?: number; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const [v] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0.5, duration: 650, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View style={[{ height, width, borderRadius: r, backgroundColor: c.surface2, opacity: v }, style]} />;
}

/* ---------- butonlar ---------- */

type BtnKind = 'primary' | 'ghost' | 'soft' | 'danger';

export function Btn({
  label, kind = 'soft', small, block, style, icon, loading, disabled, ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  label: string; kind?: BtnKind; small?: boolean; block?: boolean; style?: StyleProp<ViewStyle>;
  /** Yazının solunda emoji ya da simge. */
  icon?: ReactNode;
  /** Çalışırken düğme kilitlenir ve yazı yerine üç nokta döner. */
  loading?: boolean;
}) {
  const c = useColors();
  const bg = kind === 'primary' ? c.accent : kind === 'danger' ? c.late : kind === 'ghost' ? c.surface : c.surface2;
  const fg = kind === 'primary' ? c.onAccent : kind === 'danger' ? c.onBadge : c.ink;
  const off = !!disabled || !!loading;
  return (
    <Squish
      sound={kind === 'primary' ? 'pop' : 'tap'}
      scaleTo={kind === 'primary' ? 0.95 : 0.96}
      accessibilityState={{ disabled: off, busy: !!loading }}
      accessibilityLabel={label}
      disabled={off}
      dim={false}
      {...rest}
      style={[
        styles.btn,
        small && styles.btnSmall,
        block && { alignSelf: 'stretch' },
        { backgroundColor: bg },
        kind === 'ghost' && { borderWidth: 1.5, borderColor: c.line, ...elevation.none },
        kind === 'primary' && !small && { shadowColor: c.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 4 },
        off && { opacity: 0.5, ...elevation.none },
        style,
      ]}
    >
      {loading ? <Dots color={fg} /> : (
        <>
          {typeof icon === 'string' ? <Text style={{ fontSize: small ? 15 : 18 }}>{icon}</Text> : icon}
          <Text maxFontSizeMultiplier={type.maxScale} numberOfLines={2} style={{ flexShrink: 1, color: fg, fontFamily: fonts.bodyBlack, fontSize: small ? 14 : 16, letterSpacing: 0.2, textAlign: 'center' }}>{label}</Text>
        </>
      )}
    </Squish>
  );
}

/** Üç nokta sırayla zıplar (düğme içi yükleniyor). */
function Dots({ color }: { color: string }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 3, duration: 900, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <View style={{ flexDirection: 'row', gap: 6, height: 22, alignItems: 'center' }} accessibilityLabel="Yükleniyor">
      {[0, 1, 2].map(i => (
        <Animated.View
          key={i}
          style={{
            width: 7, height: 7, borderRadius: 4, backgroundColor: color,
            opacity: v.interpolate({ inputRange: [0, i, i + 0.5, i + 1, 3], outputRange: [0.35, 0.35, 1, 0.35, 0.35], extrapolate: 'clamp' }),
          }}
        />
      ))}
    </View>
  );
}

export function XBtn({ onPress, label }: { onPress: () => void; label: string }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={tx(label)} hitSlop={14}
      style={({ pressed }) => [styles.x, { backgroundColor: pressed ? c.line : c.surface2 }]}>
      <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6L6 18" stroke={c.muted} strokeWidth={3} strokeLinecap="round" /></Svg>
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
      style={[styles.chip, { backgroundColor: on ? c.accent : c.surface, borderColor: on ? c.accent : c.line }, on && styles.lift]}
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
            style={[styles.tab, { backgroundColor: on ? c.accent : c.surface }, on && styles.lift]}
          >
            <Text style={{ fontSize: 20 }}>{it.emoji}</Text>
            <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 13.5, color: on ? c.onAccent : c.ink }}>{it.label}</Text>
            {!!it.badge && (
              <View style={[styles.tabBadge, { backgroundColor: c.late }]}>
                <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 12, color: '#fff' }}>{it.badge}</Text>
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
      <Text style={{ color: fg, fontFamily: fonts.bodyBlack, fontSize: 12 }}>{label}</Text>
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
export function Sheet({ open, onClose, children, pose = 'happy', scroll = false }: { open: boolean; onClose: () => void; children: ReactNode; pose?: MokaPose; scroll?: boolean }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <Modal visible={open} transparent statusBarTranslucent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.sheetBg, { backgroundColor: c.shadow }]} onPress={onClose} accessibilityRole="button" accessibilityLabel={tx('Kapat')} />
      <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + 20 }, scroll && { maxHeight: height - insets.top - 90 }]}>
        <Image source={MOKA_ASSETS[pose]} style={styles.sheetMoka} resizeMode="contain" accessibilityIgnoresInvertColors />
        <View style={[styles.grab, { backgroundColor: c.line }]} />
        {scroll ? <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>{children}</ScrollView> : children}
      </View>
    </Modal>
  );
}

/* ---------- formlar ---------- */

export function Field(props: ComponentProps<typeof TextInput>) {
  const c = useColors();
  const [focus, setFocus] = useState(false);
  return (
    <TextInput
      placeholderTextColor={c.muted}
      maxFontSizeMultiplier={type.maxScale}
      selectionColor={c.accent}
      {...props}
      onFocus={e => { setFocus(true); props.onFocus?.(e); }}
      onBlur={e => { setFocus(false); props.onBlur?.(e); }}
      style={[styles.field, { color: c.ink, backgroundColor: c.surface2, borderColor: focus ? c.accent : 'transparent' }, props.style]}
    />
  );
}

/** Etiketli form alanı: üstte etiket, altta yardım ya da hata yazısı. */
export function FormField({ label, hint, error, ...props }: ComponentProps<typeof TextInput> & { label: string; hint?: string; error?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 6, alignSelf: 'stretch' }}>
      <T v="small" style={{ color: c.ink }}>{label}</T>
      <View style={{ flexDirection: 'row' }}>
        <Field accessibilityLabel={label} {...props} style={[error ? { borderColor: c.late } : null, props.style]} />
      </View>
      {!!(error || hint) && <T v="tiny" style={error ? { color: c.late } : undefined} accessibilityLiveRegion="polite">{error || hint}</T>}
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { paddingHorizontal: space.screen, gap: space.section, width: '100%', maxWidth: 520, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headMokaRing: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  headMoka: { width: 38, height: 38, marginTop: 4 },
  brandWord: { fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 19, letterSpacing: -0.2 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroRing: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  heroMoka: { width: 82, height: 82 },
  empty: { alignItems: 'center', gap: 14, paddingVertical: 20 },
  emptyMoka: { width: 104, height: 104 },
  sheetMoka: { position: 'absolute', top: -62, right: 24, width: 84, height: 84, zIndex: 2 },
  bell: { width: hit, height: hit, borderRadius: hit / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 0 },
  badge: { position: 'absolute', top: -3, right: -4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  navBar: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: hit },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: hit, height: hit, borderRadius: radius.pill, paddingLeft: 11, paddingRight: 14, justifyContent: 'center' },
  backLabel: { fontFamily: fonts.bodyBlack, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingVertical: 10 },
  rowIcon: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.card, padding: space.card },
  card: {
    borderRadius: radius.card, padding: space.card, gap: space.sm, borderWidth: 0,
    ...elevation.sm,
  },
  cardBare: { paddingHorizontal: 0, paddingVertical: 0, borderWidth: 0, shadowOpacity: 0, elevation: 0 },
  secHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: radius.btn,
    gap: 8, paddingVertical: 13, paddingHorizontal: 24, minHeight: 52,
    ...elevation.sm,
  },
  btnSmall: { paddingVertical: 9, paddingHorizontal: 16, minHeight: hit, ...elevation.none },
  lift: { shadowColor: warmShadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  chip: { minHeight: hit, justifyContent: 'center', borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 16, borderWidth: StyleSheet.hairlineWidth },
  tabs: { gap: 10, paddingVertical: 6, paddingHorizontal: 2 },
  tab: { alignItems: 'center', justifyContent: 'center', gap: 2, minWidth: 76, paddingVertical: 9, paddingHorizontal: 12, borderRadius: radius.tile },
  tabBadge: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  x: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', margin: 4 },
  pill: { borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 4, alignSelf: 'flex-start' },
  sheetBg: { flex: 1 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, padding: space.card, paddingTop: 12, gap: 16, maxWidth: 520, alignSelf: 'center', width: '100%' },
  grab: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 4 },
  field: {
    flex: 1, minWidth: 0, minHeight: 50, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 13,
    fontFamily: fonts.bodyBold, fontSize: 16, borderWidth: 2,
  },
});
