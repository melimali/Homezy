import { useRef, useState, type ComponentRef } from 'react';
import {
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

import { useAuth } from '@/auth/AuthProvider';
import { Burst, Float, Squish, useReduceMotion } from '@/components/motion';
import { Btn } from '@/components/ui';
import { LIMITS } from '@/domain/premium';
import { POSE_SCENES } from '@/constants/scenes';
import { sfx } from '@/lib/sfx';
import { brand, fonts, radius, useColors, type Colors } from '@/theme';

// Web önizlemesinde yerel sürücü yok; orada kaydırma JS ile izlenir.
const native = Platform.OS !== 'web';

type Page = {
  eyebrow: string;
  title: string;
  text: string;
  scene: ImageSourcePropType;
  tint: (c: Colors) => string;
  /** Sahnenin altındaki küçük çıkartmalar: neyi anlattığını bir bakışta gösterir. */
  chips: string[];
  /** Sayfada Premium'a özel bir parça var: köşede rozet çıkar. */
  premium?: boolean;
};

// Moka kendini tanıtır, sonra her sayfayı tek cümleyle kendi anlatır (docs/skeleton-v3.md).
const PAGES: Page[] = [
  {
    eyebrow: 'Tanışalım',
    title: 'Merhaba, ben Moka!',
    text: 'Kahveye bayılan tombul bir kakapoyum. Evinin işlerini seninle, kendi hızında takip edeceğim.',
    scene: POSE_SCENES.happy!,
    tint: c => c.peachSoft,
    chips: ['☕ Sakin', '🤍 Yargısız', '🏡 Senin hızında'],
  },
  {
    eyebrow: 'Evini çiz',
    title: 'Önce evini birlikte çizelim',
    text: 'Hazır bir plan seç ya da odaları parmağınla boya. Her odaya kendi işlerini ben eklerim.',
    scene: POSE_SCENES.handyman!,
    tint: c => c.sageSoft,
    chips: ['🛏️ Yatak odası', '🍳 Mutfak', '🛁 Banyo'],
  },
  {
    eyebrow: 'Küçük işler',
    title: 'Her iş evine bir iyilik',
    text: 'Bir işi bitir, puan kazan; serin uzadıkça evin büyür. Kaçırdığın gün sorun değil.',
    scene: POSE_SCENES.sweeping!,
    tint: c => c.roseSoft,
    chips: ['✅ Tamamladım', '⭐ +10 puan', '🔥 Seri'],
  },
  {
    eyebrow: 'Her odanın kendi işi',
    title: 'Dolap, buzdolabı, bitkiler',
    text: 'Kirli çamaşırı, biten ürünü, sulanacak bitkiyi odası takip eder. Alışveriş listesi kendiliğinden çıkar.',
    scene: POSE_SCENES.plants!,
    tint: c => c.sageSoft,
    chips: ['👕 Gardırop', '🥛 Stok', '🪴 Bitkiler', '🛒 Alışveriş'],
  },
  {
    eyebrow: 'Fotoğrafla tara',
    title: 'Buzdolabı ve dolap tek fotoğrafta',
    text: 'Fotoğrafı çek, eksik ürünleri ve kıyafetlerini ben tanıyayım. Kombin önerisi de internetsiz çalışır.',
    scene: POSE_SCENES.analyzing!,
    tint: c => c.lavenderSoft,
    chips: ['🥛 Süt azaldı', '👕 3 kirli', '🧥 Kombin'],
  },
  {
    eyebrow: '3D evin',
    title: 'Evin gerçekten canlanır',
    text: 'Çevir, yakınlaştır; hava durumu ve saate göre gökyüzü değişir. Puanınla eşya al, evi kendin döşe.',
    scene: POSE_SCENES.amazed!,
    tint: c => c.peachSoft,
    chips: ['🏡 3D ev', '🛋️ Eşyalar', '🌦️ Gökyüzü', '✨ 2. kat'],
    premium: true,
  },
  {
    eyebrow: 'Moka ile sohbet',
    title: 'Takıldığında bana sor',
    text: 'Bugün nereden başlasam? de, planını birlikte yapalım. Odaklanırken lofi müziği de ben açarım.',
    scene: POSE_SCENES.laptop!,
    tint: c => c.lavenderSoft,
    chips: ['💬 Sohbet', '🎧 Lofi', '🎯 Odak'],
  },
  {
    eyebrow: 'Bahçe ve mağaza',
    title: 'Puanlar eşyaya, çiçeğe dönüşür',
    text: 'Moka’nın bahçesine bak, mağazadan evine yeni eşyalar al. Akvaryum, şömine ve piyano Premium’da.',
    scene: POSE_SCENES.cozy_plant!,
    tint: c => c.sageSoft,
    chips: ['🌱 Bahçe', '🛍️ Mağaza', '🐠 Akvaryum', '🎹 Piyano'],
    premium: true,
  },
  {
    eyebrow: 'Kendin için',
    title: 'Günlük, spor, ruh halin',
    text: 'Günün nasıldı, yaz ve işaretle. Antrenmanını kaydet. Premium’da fotoğraf, grafikler ve “geçen yıl bugün” de var.',
    scene: POSE_SCENES.reading!,
    tint: c => c.roseSoft,
    chips: ['📔 Günlük', '💛 Ruh hali', '🏃 Spor'],
    premium: true,
  },
  {
    eyebrow: 'Gelişimin',
    title: 'Ne kadar yol aldığını gör',
    text: 'Haftalık grafikler ve seri takvimi. Her sabah da tek nazik bir özet bildirimi getiririm, saatini sen seçersin.',
    scene: POSE_SCENES.cheers!,
    tint: c => c.peachSoft,
    chips: ['📊 Haftan', '🌤️ Sabah özeti', '🔔 Hatırlatma'],
  },
  {
    eyebrow: 'Zor günler',
    title: 'Yoğunsan, hastaysan, tatildeysen',
    text: 'Misafir, tatil ve hasta modları işleri hafifletir. Seri dondurma ile bir gün kaçırsan da evin yıkılmaz. Aile ile paylaşabilirsin.',
    scene: POSE_SCENES.blanket!,
    tint: c => c.lavenderSoft,
    chips: ['🛋️ Modlar', '❄️ Seri dondur', '👨‍👩‍👧 Aile', '🔧 Ev bakımı'],
  },
  {
    eyebrow: 'Premium',
    title: 'Evinin tadını çıkar',
    text: 'Daha çok tarama ve sohbet, 2. kat, Premium eşyalar, ev temaları, 5 ev, aile paylaşımı, tarif ve kombin planı, reklamsız. İlk ay indirimli, istediğin zaman iptal.',
    scene: POSE_SCENES.party!,
    tint: c => c.peachSoft,
    chips: [`📸 Günde ${LIMITS.premium.scans} tarama`, `💬 ${LIMITS.premium.chats} mesaj`, `❄️ Ayda ${LIMITS.premium.freezes} dondurma`, '⭐ 1,5 kat puan'],
    premium: true,
  },
];

/** İlk açılış: yana kaydırılan, Moka sahneli tanıtım. */
export default function Tanitim() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { finishIntro } = useAuth();
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
        {!last && (
          <Pressable onPress={finishIntro} accessibilityRole="button" hitSlop={10} style={({ pressed }) => [st.skip, { backgroundColor: c.surface }, pressed && { opacity: 0.6 }]}>
            <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 14, color: c.muted }}>Atla</Text>
          </Pressable>
        )}
      </View>

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
  const card = Math.max(200, Math.min(w - 48, 420, ((h - top - 70 - 150 - 250) * 4) / 3 + 20));

  return (
    <View style={{ width: w, paddingTop: top + 70, paddingBottom: 150, paddingHorizontal: 24, alignItems: 'center' }} accessible accessibilityLabel={`${p.eyebrow}. ${p.title}. ${p.text}`}>
      <Animated.View style={{ transform: [{ translateX: sceneX }, { rotate }, { scale }] }}>
        <Squish quiet onPress={onPoke} accessibilityLabel="Moka'ya dokun" style={[st.polaroid, { width: card, backgroundColor: c.surface, shadowColor: c.shadow }]}>
          <View style={[st.tape, { backgroundColor: p.tint(c) }]} />
          {p.premium && (
            <View style={[st.badge, { backgroundColor: brand.navy }]}>
              <Text style={st.badgeT}>✨ Premium</Text>
            </View>
          )}
          <Image source={p.scene} style={{ width: card - 20, height: ((card - 20) * 3) / 4, borderRadius: 22 }} resizeMode="cover" accessibilityIgnoresInvertColors />
          <View style={st.chips}>
            {p.chips.map((ch, k) => (
              <Float key={ch} amp={2.5} dur={1900 + k * 300} delay={k * 200}>
                <View style={[st.chip, { backgroundColor: p.tint(c) }]}>
                  <Text style={[st.chipT, { color: c.ink }]}>{ch}</Text>
                </View>
              </Float>
            ))}
          </View>
        </Squish>
      </Animated.View>

      <Animated.View style={{ opacity: fade, transform: [{ translateY: textY }], maxWidth: 440, width: '100%', marginTop: 26 }}>
        <Text style={[st.eyebrow, { color: c.warm }]}>{`${i + 1} / ${PAGES.length} · ${p.eyebrow}`.toLocaleUpperCase('tr-TR')}</Text>
        <Text style={[st.title, { color: c.ink }]}>{p.title}</Text>
        <Text style={[st.text, { color: c.muted }]}>{p.text}</Text>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  top: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoPill: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  wordmark: { width: 96, height: 32 },
  skip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill },
  burst: { position: 'absolute', top: '35%', alignSelf: 'center' },
  bottom: { position: 'absolute', left: 24, right: 24, bottom: 0, gap: 16, alignItems: 'center', maxWidth: 440, alignSelf: 'center' },
  dots: { flexDirection: 'row', gap: 14, height: 8, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  polaroid: {
    borderRadius: radius.card + 4, padding: 10, paddingBottom: 14, gap: 12,
    shadowOffset: { width: 0, height: 14 }, shadowOpacity: 1, shadowRadius: 24, elevation: 6,
  },
  tape: { position: 'absolute', top: -9, alignSelf: 'center', width: 70, height: 20, borderRadius: 7, zIndex: 2, opacity: 0.95, transform: [{ rotate: '-3deg' }] },
  badge: { position: 'absolute', top: 14, right: 14, zIndex: 3, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  badgeT: { fontFamily: fonts.bodyBlack, fontSize: 12, color: '#fff' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  chip: { borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 6 },
  chipT: { fontFamily: fonts.bodyBlack, fontSize: 12.5 },
  eyebrow: { fontFamily: fonts.bodyBlack, fontSize: 11.5, letterSpacing: 1.1, marginBottom: 6, textAlign: 'center' },
  title: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 33, letterSpacing: -0.2, textAlign: 'center' },
  text: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, marginTop: 8, textAlign: 'center' },
});
