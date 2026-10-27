import { useEffect, useRef, useState, type ComponentRef, type ComponentType } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useAuth } from '@/auth/AuthProvider';
import { MokaMascot } from '@/components/MokaMascot';
import { FridgeArt, MorningArt, PlanArt, RoutineArt, WardrobeArt } from '@/components/onboarding/Illustrations';
import { Btn } from '@/components/ui';
import { MOKA_ASSETS, type MokaPose } from '@/constants/moka';
import { brand, fonts, radius, useColors, type Colors } from '@/theme';

// Web önizlemesinde yerel sürücü yok; orada döngüler JS ile döner.
const native = Platform.OS !== 'web';

type Page = {
  eyebrow: string;
  title: string;
  text: string;
  Art: ComponentType<{ t: Animated.Value }>;
  blob: (c: Colors) => string;
  /** Metni konuşma balonunda anlatan Moka'nın pozu. İlk sayfada Moka zaten çizimin kendisi. */
  pose?: MokaPose;
  mokaTitle?: string;
};

/** İlk sayfanın çizimi: kendini tanıtan Moka, hafifçe süzülür. */
function MokaArt({ t }: { t: Animated.Value }) {
  const bob = t.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -8, 0, -8, 0] });
  const tilt = t.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: ['0deg', '-3deg', '0deg', '3deg', '0deg'] });
  return (
    <Animated.Image
      source={MOKA_ASSETS.happy}
      style={{ width: 240, height: 240, transform: [{ translateY: bob }, { rotate: tilt }] }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}

// Moka önce kendini tanıtır, sonraki sayfaları kendi ağzından anlatır.
const PAGES: Page[] = [
  {
    eyebrow: 'Tanışalım',
    title: 'Merhaba, ben Moka!',
    text: 'Kahveye bayılan, biraz tombul bir kakapoyum. Evinin işlerini seninle birlikte takip edeceğim. Hadi sana etrafı gezdireyim!',
    Art: MokaArt,
    blob: c => c.room.salon,
  },
  {
    eyebrow: 'Evini çiz',
    title: 'Önce evini birlikte çizelim',
    text: 'Oda türünü seç, bloklara dokunup parmağını sürükle. Her blok yaklaşık 2 m². Ben de her odayı tek tek öğreneyim.',
    Art: PlanArt,
    blob: c => c.accentSoft,
    pose: 'analyzing',
    mokaTitle: 'Önce evini tanıyalım',
  },
  {
    eyebrow: 'Rutinler',
    title: 'Ne zaman ne yapılacak, ben hatırlarım',
    text: 'Her iş kendi aralığıyla tekrar eder. Sen "Tamamladım"a bas, puanını kap; ben de saymaya yeniden başlarım.',
    Art: RoutineArt,
    blob: c => c.todaySoft,
    pose: 'checklist',
    mokaTitle: 'Sen yap, ben hatırlatayım',
  },
  {
    eyebrow: 'Akıllı gardırop',
    title: 'Dolabındaki parçalarla harika kombinler',
    text: 'Kıyafetlerini fotoğraftan yapay zekâyla tanıyıp dolabına eklerim. Temiz, kirli ve ütülenecekleri takip eder; mevsime ve ortama göre parçalarını eşleştiririm.',
    Art: WardrobeArt,
    blob: c => c.fashion,
    pose: 'analyzing',
    mokaTitle: 'Stilini birlikte bulalım',
  },
  {
    eyebrow: 'Buzdolabı takibi',
    title: 'Eksikleri fark edelim',
    text: 'Fotoğraftaki ürünleri ve kalan miktarları tahmin ederim. Sen onayla; azalanlarla bitenleri alışveriş listene ekleyelim.',
    Art: FridgeArt,
    blob: c => c.room.mutfak,
    pose: 'checklist',
    mokaTitle: 'Alışverişi kolaylaştıralım',
  },
  {
    eyebrow: 'Sabah özeti',
    title: 'Her sabah tek bir mesaj',
    text: 'Saatini sen seç, kahvemi alıp gelirim. Geciken işleri, eksik ürünleri ve çamaşırı tek mesajda anlatırım.',
    Art: MorningArt,
    blob: c => c.room.salon,
    pose: 'cozy_plant',
    mokaTitle: 'Her sabah yanındayım',
  },
];

/** İlk açılış: aşağı kaydırılan, Moka'nın anlattığı tanıtım. */
export default function Tanitim() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { finishIntro } = useAuth();
  const [h, setH] = useState(0);
  const [page, setPage] = useState(0);
  const scroll = useRef<ComponentRef<typeof Animated.ScrollView>>(null);
  const [y] = useState(() => new Animated.Value(0));
  const [t] = useState(() => new Animated.Value(0));
  const [hint] = useState(() => new Animated.Value(0));

  // Çizimleri ve "kaydır" okunu döndüren saatler. Hareketi azalt açıksa durur.
  useEffect(() => {
    let loops: Animated.CompositeAnimation[] = [];
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (!alive) return;
      if (reduce) {
        t.setValue(0.6);
        return;
      }
      loops = [
        Animated.loop(Animated.timing(t, { toValue: 1, duration: 5200, easing: Easing.linear, useNativeDriver: native })),
        Animated.loop(
          Animated.sequence([
            Animated.timing(hint, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: native }),
            Animated.timing(hint, { toValue: 0, duration: 650, easing: Easing.in(Easing.quad), useNativeDriver: native }),
          ]),
        ),
      ];
      loops.forEach(l => l.start());
    });
    return () => {
      alive = false;
      loops.forEach(l => l.stop());
    };
  }, [t, hint]);

  const onLayout = (e: LayoutChangeEvent) => setH(e.nativeEvent.layout.height);
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y } } }], {
    useNativeDriver: native,
    listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!h) return;
      const p = Math.round(e.nativeEvent.contentOffset.y / h);
      setPage(cur => (cur === p ? cur : Math.max(0, Math.min(PAGES.length - 1, p))));
    },
  });

  const last = page === PAGES.length - 1;
  const next = () => {
    if (last) finishIntro();
    else scroll.current?.scrollTo({ y: (page + 1) * h, animated: true });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }} onLayout={onLayout}>
      {h > 0 && (
        <Animated.ScrollView
          ref={scroll}
          onScroll={onScroll}
          scrollEventThrottle={16}
          snapToInterval={h}
          decelerationRate="fast"
          disableIntervalMomentum
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          {PAGES.map((p, i) => (
            <PageView key={p.eyebrow} p={p} i={i} h={h} y={y} t={t} top={insets.top} c={c} />
          ))}
        </Animated.ScrollView>
      )}

      {/* Üst: logo ve "Atla" */}
      <View pointerEvents="box-none" style={[st.top, { top: insets.top + 10 }]}>
        <View style={[st.logoPill, { backgroundColor: brand.mint }]}>
          <Image source={require('../../assets/logo-yatay.png')} style={st.wordmark} resizeMode="contain" accessibilityLabel="Homezy" />
        </View>
        {!last && (
          <Pressable onPress={finishIntro} accessibilityRole="button" hitSlop={10} style={({ pressed }) => [st.skip, pressed && { opacity: 0.6 }]}>
            <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 14, color: c.muted }}>Atla</Text>
          </Pressable>
        )}
      </View>

      {/* Sağ: sayfa noktaları */}
      {h > 0 && (
        <View pointerEvents="none" style={st.dots}>
          {PAGES.map((_, i) => {
            const r = [(i - 1) * h, i * h, (i + 1) * h];
            // Yerel animasyon sürücüsü yükseklik animasyonunu desteklemiyor; büyütme (scale) kullanıyoruz.
            const scale = y.interpolate({ inputRange: r, outputRange: [1, 1.6, 1], extrapolate: 'clamp' });
            const opacity = y.interpolate({ inputRange: r, outputRange: [0.35, 1, 0.35], extrapolate: 'clamp' });
            return <Animated.View key={i} style={[st.dot, { backgroundColor: c.accent, opacity, transform: [{ scale }] }]} />;
          })}
        </View>
      )}

      {/* Alt: kaydırma ipucu ve buton */}
      <View pointerEvents="box-none" style={[st.bottom, { paddingBottom: insets.bottom + 18 }]}>
        {!last && (
          <Animated.View pointerEvents="none" style={{ alignItems: 'center', opacity: 0.8, transform: [{ translateY: hint.interpolate({ inputRange: [0, 1], outputRange: [0, 7] }) }] }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: c.muted }}>Aşağı kaydır</Text>
            <Svg width={22} height={22} viewBox="0 0 24 24">
              <Path d="M6 9l6 6 6-6" stroke={c.muted} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Animated.View>
        )}
        <Btn
          label={last ? 'Hadi başlayalım' : 'Devam'}
          kind="primary"
          onPress={next}
          style={{ alignSelf: 'stretch', paddingVertical: 15 }}
          accessibilityHint={last ? 'Hesap ekranına geçer' : 'Sonraki tanıtım sayfasına geçer'}
        />
      </View>
    </View>
  );
}

function PageView({ p, i, h, y, t, top, c }: { p: Page; i: number; h: number; y: Animated.Value; t: Animated.Value; top: number; c: Colors }) {
  const r = [(i - 1) * h, i * h, (i + 1) * h];
  // Kaydırırken çizim metinden yavaş hareket eder (parallax), gelen sayfa büyüyerek belirir.
  const artY = y.interpolate({ inputRange: r, outputRange: [h * 0.32, 0, -h * 0.32], extrapolate: 'clamp' });
  const artScale = y.interpolate({ inputRange: r, outputRange: [0.72, 1, 0.82], extrapolate: 'clamp' });
  const artOpacity = y.interpolate({ inputRange: r, outputRange: [0, 1, 0], extrapolate: 'clamp' });
  const textY = y.interpolate({ inputRange: r, outputRange: [70, 0, -40], extrapolate: 'clamp' });
  const textOpacity = y.interpolate({ inputRange: [r[0] + h * 0.4, r[1], r[2] - h * 0.5], outputRange: [0, 1, 0], extrapolate: 'clamp' });
  const blobRotate = y.interpolate({ inputRange: r, outputRange: ['-25deg', '0deg', '25deg'] });
  // Küçük ekranlarda çizim metne yer bıraksın diye küçülür.
  const fit = Math.max(0.55, Math.min(1, (h - top - 64 - 150 - (p.pose ? 236 : 180)) / 290));

  return (
    <View style={{ height: h, paddingTop: top + 64, paddingBottom: 150, paddingHorizontal: 28 }} accessible accessibilityLabel={`${p.eyebrow}. ${p.title}. ${p.text}`}>
      <View style={st.artArea}>
        <Animated.View style={[st.blob, { backgroundColor: p.blob(c), transform: [{ rotate: blobRotate }, { scale: artScale }, { scale: fit }] }]} />
        <Animated.View style={{ opacity: artOpacity, transform: [{ translateY: artY }, { scale: artScale }, { scale: fit }] }}>
          <p.Art t={t} />
        </Animated.View>
      </View>
      <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textY }], maxWidth: 440, alignSelf: 'center', width: '100%' }}>
        <Text style={[st.eyebrow, { color: c.warm }]}>{`${i + 1} / ${PAGES.length} · ${p.eyebrow}`.toLocaleUpperCase('tr-TR')}</Text>
        <Text style={[st.title, { color: c.ink }]}>{p.title}</Text>
        {p.pose ? (
          <MokaMascot pose={p.pose} title={p.mokaTitle} message={p.text} size="sm" style={{ marginTop: 12 }} />
        ) : (
          <Text style={[st.text, { color: c.muted }]}>{p.text}</Text>
        )}
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  top: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoPill: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  wordmark: { width: 96, height: 32 },
  skip: { paddingHorizontal: 12, paddingVertical: 6 },
  dots: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  bottom: { position: 'absolute', left: 24, right: 24, bottom: 0, gap: 12, alignItems: 'center', maxWidth: 440, alignSelf: 'center' },
  artArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  blob: { position: 'absolute', width: 300, height: 290, borderRadius: 140, borderTopLeftRadius: 170, borderBottomRightRadius: 120 },
  eyebrow: { fontFamily: fonts.bodyBlack, fontSize: 11.5, letterSpacing: 1.1, marginBottom: 8 },
  title: { fontFamily: fonts.displayBold, fontSize: 29, lineHeight: 33, letterSpacing: -0.2 },
  text: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, marginTop: 10 },
});
