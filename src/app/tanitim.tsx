import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { dateLocale, tx } from '@/i18n/runtime';
import { useAuth } from '@/auth/AuthProvider';
import { useStore } from '@/store/AppStore';
import { Burst, Squish, useReduceMotion } from '@/components/motion';
import { Btn } from '@/components/ui';
import { IntroDeco, type DecoKind } from '@/components/IntroDeco';
import { MOKA_ASSETS } from '@/constants/moka';
import { POSE_SCENES } from '@/constants/scenes';
import { sfx } from '@/lib/sfx';
import { brand, fonts, radius, useColors, type Colors } from '@/theme';

// Web önizlemesinde yerel sürücü yok; orada kaydırma JS ile izlenir.
const PAPER = '#FFFDF8';
const native = Platform.OS !== 'web';

type Page = {
  eyebrow: string;
  title: string;
  text: string;
  /** Polaroid alt yazı şeridi. */
  caption: string;
  scene: ImageSourcePropType;
  tint: (c: Colors) => string;
  deco: DecoKind;
};

// 6 sayfa, her biri: başlık + tek kısa cümle. Amaç: günlük disiplin, küçük adımlarla (docs/skeleton-v3.md).
const PAGES: Page[] = [
  {
    eyebrow: 'Tanışalım',
    title: 'Merhaba, ben Moka',
    text: 'Homezy ev işlerini küçük günlük adımlara böler. Her gün biraz yaptıkça düzenin oturur ve evin seninle birlikte büyür.',
    caption: 'Hazır mısın?',
    scene: POSE_SCENES.happy!,
    deco: 'hello',
    tint: c => c.peachSoft,
  },
  {
    eyebrow: 'Plan',
    title: 'Evini çiz',
    text: 'Odalarını bloklarla boya; her odanın işleri kendiliğinden gelir. Ne yapacağını düşünmezsin, sadece başlarsın.',
    caption: 'Önce planı çizelim',
    scene: POSE_SCENES.handyman!,
    deco: 'draw',
    tint: c => c.sageSoft,
  },
  {
    eyebrow: 'Günlük işler',
    title: 'Günde birkaç iş',
    text: 'Bugünün işlerini tek tek bitir ve puan kazan. Seri tuttukça alışkanlık oluşur; küçük işler büyük düzeni getirir.',
    caption: 'Süpürge hazır',
    scene: POSE_SCENES.sweeping!,
    deco: 'tasks',
    tint: c => c.roseSoft,
  },
  {
    eyebrow: '3D evin',
    title: 'Evin seninle büyür',
    text: 'Düzenli yaptığın her iş evine yeni bir parça katar ve seri uzadıkça ev seviye atlar. Aksatırsan toz tutar, geri dönünce yeniden parlar.',
    caption: 'Vay, ne büyüdü!',
    scene: POSE_SCENES.amazed!,
    deco: 'house',
    tint: c => c.peachSoft,
  },
  {
    eyebrow: 'Moka ve bahçe',
    title: 'Moka yanında',
    text: 'Takıldığında Moka’ya sor, odaklanma sayacıyla çalış. Bitirdiğin her iş bahçendeki çiçekleri büyütür.',
    caption: 'Birlikte çalışalım',
    scene: POSE_SCENES.watering!,
    deco: 'garden',
    tint: c => c.sageSoft,
  },
  {
    eyebrow: 'Kendin için',
    title: 'Sıra sende',
    text: 'Odan toparlanınca spor ve günlükle kendine zaman ayır. Disiplin evden başlar, günlük yaşamına yayılır.',
    caption: 'Sen de değerlisin',
    scene: POSE_SCENES.reading!,
    deco: 'self',
    tint: c => c.lavenderSoft,
  },
];

/** İlk açılış: yana kaydırılan, Moka sahneli tanıtım. */
export default function Tanitim() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { finishIntro } = useAuth();
  const { state: appState, update } = useStore();
  const lang = appState.settings.language === 'tr' ? 'tr' : 'en';
  const [switching, setSwitching] = useState(false);
  const langTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => langTimers.current.forEach(clearTimeout), []);
  const pickLang = (l: 'tr' | 'en') => {
    if (l === lang || switching) return;
    setSwitching(true);
    // Önce yükleme ekranı çizilsin, sonra dil değişsin; çeviri oturunca kapat.
    langTimers.current.push(setTimeout(() => update(d => void (d.settings.language = l)), 80));
    langTimers.current.push(setTimeout(() => setSwitching(false), 900));
  };
  const reduce = useReduceMotion();
  const [{ w, h }, setSize] = useState({ w: 0, h: 0 });
  const [page, setPage] = useState(0);
  const [pop, setPop] = useState(0);
  const scroll = useRef<ComponentRef<typeof Animated.ScrollView>>(null);
  const [x] = useState(() => new Animated.Value(0));

  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { x } } }], {
    useNativeDriver: native,
    listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!w) return;
      const p = Math.max(0, Math.min(PAGES.length - 1, Math.round(e.nativeEvent.contentOffset.x / w)));
      setPage(cur => {
        if (cur !== p) sfx('tap');
        return p;
      });
    },
  });

  const last = page === PAGES.length - 1;
  const next = () => {
    if (last) finishIntro();
    else scroll.current?.scrollTo({ x: (page + 1) * w, animated: !reduce });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }} onLayout={onLayout}>
      {/* Zemin: sayfanın tonuna kayan yumuşak renk */}
      {w > 0 && PAGES.map((p, i) => (
        <Animated.View
          key={p.eyebrow}
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: p.tint(c), opacity: x.interpolate({ inputRange: [(i - 1) * w, i * w, (i + 1) * w], outputRange: [0, 1, 0], extrapolate: 'clamp' }) }]}
        />
      ))}

      {w > 0 && (
        <Animated.ScrollView
          ref={scroll}
          horizontal
          pagingEnabled
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          {PAGES.map((p, i) => (
            <PageView
              key={p.eyebrow}
              p={p}
              i={i}
              w={w}
              h={h}
              x={x}
              top={insets.top}
              c={c}
              onPoke={() => {
                sfx('pop');
                setPop(n => n + 1);
              }}
            />
          ))}
        </Animated.ScrollView>
      )}

      {/* Üst: logo ve "Atla" */}
      <View pointerEvents="box-none" style={[st.top, { top: insets.top + 10 }]}>
        <View style={[st.logoPill, { backgroundColor: brand.mint }]}>
          <Image source={require('../../assets/logo-yatay.png')} style={st.wordmark} resizeMode="contain" accessibilityLabel="Homezy" />
        </View>
        <View style={[st.langPill, { backgroundColor: c.surface }]} accessibilityRole="radiogroup">
          {(['tr', 'en'] as const).map(l => (
            <Pressable key={l} onPress={() => pickLang(l)} hitSlop={6} accessibilityRole="radio" accessibilityState={{ selected: lang === l }} accessibilityLabel={l === 'tr' ? 'Türkçe' : 'English'} style={[st.langOpt, lang === l && { backgroundColor: c.ink }]}>
              <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 13.5, color: lang === l ? c.bg : c.muted }}>{l.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
        {!last && (
          <Pressable onPress={finishIntro} accessibilityRole="button" hitSlop={10} style={({ pressed }) => [st.skip, { backgroundColor: c.surface }, pressed && { opacity: 0.6 }]}>
            <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 14, color: c.muted }}>Atla</Text>
          </Pressable>
        )}
      </View>

      {switching && (
        <View style={[StyleSheet.absoluteFill, st.langLoad, { backgroundColor: c.bg }]} accessibilityLiveRegion="polite">
          <Image source={MOKA_ASSETS.happy} style={{ width: 120, height: 120 }} resizeMode="contain" />
          <ActivityIndicator color={c.ink} style={{ marginTop: 14 }} />
        </View>
      )}
      <View pointerEvents="none" style={st.burst}><Burst fire={pop} /></View>

      {/* Alt: hap şeklinde sayfa göstergesi ve buton */}
      <View pointerEvents="box-none" style={[st.bottom, { paddingBottom: insets.bottom + 18 }]}>
        {w > 0 && (
          <View style={st.dots} accessibilityLabel={`Sayfa ${page + 1} / ${PAGES.length}`}>
            {PAGES.map((_, i) => {
              const r = [(i - 1) * w, i * w, (i + 1) * w];
              const scaleX = x.interpolate({ inputRange: r, outputRange: [1, 3, 1], extrapolate: 'clamp' });
              const opacity = x.interpolate({ inputRange: r, outputRange: [0.35, 1, 0.35], extrapolate: 'clamp' });
              return <Animated.View key={i} style={[st.dot, { backgroundColor: c.ink, opacity, transform: [{ scaleX }] }]} />;
            })}
          </View>
        )}
        <Btn
          label={last ? 'Hadi başlayalım' : 'Devam'}
          kind="primary"
          onPress={next}
          style={{ alignSelf: 'stretch', paddingVertical: 16 }}
          accessibilityHint={last ? 'Hesap ekranına geçer' : 'Sonraki tanıtım sayfasına geçer'}
        />
      </View>
    </View>
  );
}

function PageView({ p, i, w, h, x, top, c, onPoke }: { p: Page; i: number; w: number; h: number; x: Animated.Value; top: number; c: Colors; onPoke: () => void }) {
  const r = [(i - 1) * w, i * w, (i + 1) * w];
  // Kaydırırken sahne metinden yavaş kayar (parallax) ve hafifçe döner; gelen sayfa büyüyerek belirir.
  const sceneX = x.interpolate({ inputRange: r, outputRange: [w * 0.35, 0, -w * 0.35], extrapolate: 'clamp' });
  const rotate = x.interpolate({ inputRange: r, outputRange: ['6deg', i % 2 ? '1.5deg' : '-1.5deg', '-6deg'], extrapolate: 'clamp' });
  const scale = x.interpolate({ inputRange: r, outputRange: [0.82, 1, 0.82], extrapolate: 'clamp' });
  const textY = x.interpolate({ inputRange: r, outputRange: [40, 0, 40], extrapolate: 'clamp' });
  const fade = x.interpolate({ inputRange: [r[0] + w * 0.3, r[1], r[2] - w * 0.3], outputRange: [0, 1, 0], extrapolate: 'clamp' });
  // Küçük ekranda metne ve alttaki düğmeye yer kalsın diye kart yüksekliğe göre de küçülür.
  const card = Math.max(200, Math.min(w - 56, 400, ((h - top - 70 - 150 - 260) * 4) / 3 + 60));

  return (
    <View style={{ width: w, paddingTop: top + 70, paddingBottom: 150, paddingHorizontal: 24, alignItems: 'center' }} accessible accessibilityLabel={`${p.eyebrow}. ${p.title}. ${p.text}`}>
      <Animated.View style={{ transform: [{ translateX: sceneX }, { rotate }, { scale }, { rotate: i % 2 ? '2.5deg' : '-2.5deg' }] }}>
        <Squish quiet onPress={onPoke} accessibilityLabel="Moka'ya dokun" style={[st.polaroid, { width: card, backgroundColor: PAPER, shadowColor: c.shadow }]}>
          <View style={[st.tape, { backgroundColor: p.tint(c) }]} />
          <Image source={p.scene} style={{ width: card - 28, height: ((card - 28) * 3) / 4, borderRadius: 6 }} resizeMode="cover" accessibilityIgnoresInvertColors />
          <View style={st.strip}>
            <Text style={[st.caption, { color: brand.navy }]} numberOfLines={1}>{p.caption}</Text>
          </View>
        </Squish>
      </Animated.View>

      <Animated.View style={{ opacity: fade, transform: [{ translateY: textY }], maxWidth: 440, width: '100%', marginTop: 26 }}>
        <Text style={[st.eyebrow, { color: c.warm }]}>{`${i + 1} / ${PAGES.length} · ${tx(p.eyebrow)}`.toLocaleUpperCase(dateLocale())}</Text>
        <Text style={[st.title, { color: c.ink }]}>{p.title}</Text>
        <Text style={[st.text, { color: c.muted }]}>{p.text}</Text>
      </Animated.View>
      <Animated.View style={{ flex: 1, width: '100%', opacity: fade }}>
        <IntroDeco kind={p.deco} />
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  top: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoPill: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  wordmark: { width: 96, height: 32 },
  langLoad: { alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  langPill: { flexDirection: 'row', borderRadius: radius.pill, padding: 3 },
  langOpt: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill },
  skip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill },
  burst: { position: 'absolute', top: '35%', alignSelf: 'center' },
  bottom: { position: 'absolute', left: 24, right: 24, bottom: 0, gap: 16, alignItems: 'center', maxWidth: 440, alignSelf: 'center' },
  dots: { flexDirection: 'row', gap: 14, height: 8, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  polaroid: {
    borderRadius: 6, padding: 14, paddingBottom: 12,
    shadowOffset: { width: 0, height: 14 }, shadowOpacity: 1, shadowRadius: 24, elevation: 8,
  },
  strip: { gap: 8, paddingTop: 12, paddingBottom: 2, alignItems: 'center' },
  caption: { fontFamily: fonts.displayBold, fontSize: 19, lineHeight: 24 },
  tape: { position: 'absolute', top: -9, alignSelf: 'center', width: 70, height: 20, borderRadius: 7, zIndex: 2, opacity: 0.95, transform: [{ rotate: '-3deg' }] },
  badge: { position: 'absolute', top: 14, right: 14, zIndex: 3, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  badgeT: { fontFamily: fonts.bodyBlack, fontSize: 12, color: '#fff' },
  eyebrow: { fontFamily: fonts.bodyBlack, fontSize: 12, letterSpacing: 1.1, marginBottom: 6, textAlign: 'center' },
  title: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 33, letterSpacing: -0.2, textAlign: 'center' },
  text: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, marginTop: 8, textAlign: 'center' },
});
