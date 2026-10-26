import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { House3D } from '@/components/House3D';
import { BackLink, Btn, Callout, T } from '@/components/ui';
import { BUILT, progressOf } from '@/domain/play';
import { themeFor } from '@/domain/premium';
import { useNow } from '@/hooks/useNow';
import { shareCard } from '@/lib/share';
import { sfx } from '@/lib/sfx';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import { brand, fonts, radius, useColors } from '@/theme';

type Frame = { level: number; idle: number; cap: string; shake?: boolean; ms?: number };

/** Kaç milisaniyede bir kare. */
const STEP = 1300;

/**
 * Evin hikâyesi: kişinin evi tozlanır, çatlar, çöker, sonra tek bir işle yeniden yapılır.
 * 9:16 çerçevede oynar; TikTok / Reels için telefonun ekran kaydıyla video yapılır.
 * Oynarken çerçeve dışında hiçbir düğme görünmez, böylece kayıt temiz çıkar.
 */
function story(top: number): Frame[] {
  // Çöküşte ev iskelete kadar iner (2: iskelet), sonra adım adım geri gelir.
  const low = 2;
  return [
    { level: top, idle: 0, cap: 'Her gün minik bir iş…\nevim böyle oldu ✨', ms: 1800 },
    { level: top, idle: 1, cap: 'Bir gün unuttum…\nev tozlandı 🌫️' },
    { level: top, idle: 2, cap: 'İki gün…\nduvarlar çatladı 😟' },
    { level: Math.min(top - 1, 6), idle: 3, cap: 'Üçüncü gün evim\nçökmeye başladı 😱', shake: true },
    { level: 4, idle: 3, cap: 'Üçüncü gün evim\nçökmeye başladı 😱', shake: true, ms: 800 },
    { level: low, idle: 3, cap: 'Evim çöktü! 🏚️', shake: true, ms: 1800 },
    { level: low, idle: 0, cap: 'Tek bir iş yaptım…\ntamir başladı 🔨' },
    { level: 4, idle: 0, cap: 'Her gün bir parça daha 🧱', ms: 900 },
    { level: 6, idle: 0, cap: 'Her gün bir parça daha 🧱', ms: 900 },
    { level: top, idle: 0, cap: 'Evim geri geldi! 🏡💪', ms: 1800 },
  ];
}

export default function Hikaye() {
  const c = useColors();
  const now = useNow();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { state: S } = useStore();
  const { premium } = usePurchases();
  const frameRef = useRef<ComponentRef<typeof View>>(null);
  const hp = progressOf(S.play, now);
  // Hikâye bitmiş bir evle başlasın; inşaatı sürenlerde de ev bitmiş hâliyle gösterilir.
  const frames = story(Math.max(hp.level, BUILT));
  const [phase, setPhase] = useState<'ready' | 'count' | 'play' | 'end'>('ready');
  const [count, setCount] = useState(3);
  const [i, setI] = useState(0);
  const [shake] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));

  // Çerçeve 9:16, ekrana sığacak kadar büyük.
  const playing = phase === 'count' || phase === 'play';
  const room = playing ? height - insets.top - insets.bottom - 24 : height * 0.62;
  const w = Math.min(width - 32, 420, (room * 9) / 16);

  useEffect(() => {
    if (phase !== 'count') return;
    sfx('tap');
    const t = setTimeout(() => {
      if (count > 1) return setCount(n => n - 1);
      setI(0);
      setPhase('play');
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, count]);

  useEffect(() => {
    if (phase !== 'play') return;
    const f = frames[i];
    fade.setValue(0.2);
    Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    if (f.shake) {
      sfx('tap');
      Animated.sequence(
        [8, -8, 6, -6, 3, 0].map(x => Animated.timing(shake, { toValue: x, duration: 50, useNativeDriver: true })),
      ).start();
    }
    if (i === frames.length - 1) sfx('party');
    const last = i === frames.length - 1;
    const t = setTimeout(() => (last ? setPhase('end') : setI(n => n + 1)), f.ms ?? STEP);
    return () => clearTimeout(t);
    // frames her çizimde yeniden oluşuyor ama içeriği aynı; sadece kare değişince ilerle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, i]);

  const start = () => {
    setCount(3);
    setPhase('count');
  };
  const f = phase === 'play' ? frames[i] ?? frames[frames.length - 1] : frames[0];
  const end = phase === 'end';

  const frame = (
    <View ref={frameRef} collapsable={false} style={[styles.frame, { width: w, height: (w * 16) / 9, backgroundColor: c.bg, borderColor: c.line }]}>
      <View style={[styles.logo, { backgroundColor: brand.navy }]}>
        <Image source={require('../../assets/logo-yatay.png')} style={styles.wordmark} resizeMode="contain" accessibilityLabel="Layfapp" />
      </View>
      {end ? (
        <View style={styles.endBox}>
          <Text style={[styles.cap, { color: c.ink }]}>Evini topla,{'\n'}evin büyüsün 🏡</Text>
          <Text style={[styles.sub, { color: c.muted }]}>Her gün minik bir iş. Seri bozulursa evin çöker!</Text>
        </View>
      ) : (
        <Animated.Text style={[styles.cap, { color: f.idle >= 3 ? c.late : c.ink, opacity: fade }]}>{f.cap}</Animated.Text>
      )}
      <Animated.View style={{ width: '100%', transform: [{ translateX: shake }] }}>
        <House3D state={S} now={now} build={end ? { level: frames[0].level, idle: 0 } : f} theme={themeFor(S.settings.theme, premium.active)} labels={false} />
      </Animated.View>
      <Text style={[styles.foot, { color: c.muted }]}>{end ? 'Layfapp · App Store ve Google Play' : ' '}</Text>
      {phase === 'count' && (
        <View style={[StyleSheet.absoluteFill, styles.countBox]}>
          <Text style={[styles.count, { color: c.ink }]}>{count}</Text>
        </View>
      )}
    </View>
  );

  if (playing)
    return (
      <View style={[styles.full, { backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>{frame}</View>
    );

  return (
    <View style={[styles.full, { backgroundColor: c.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12, justifyContent: 'flex-start', gap: 12 }]}>
      <View style={{ alignSelf: 'stretch', paddingHorizontal: 16 }}>
        <BackLink />
      </View>
      {frame}
      <View style={{ alignSelf: 'stretch', paddingHorizontal: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn kind="primary" label={end ? '▶ Tekrar oynat' : '▶ Oynat'} onPress={start} style={{ flex: 1 }} />
          {end && <Btn label="📤 Paylaş" onPress={() => void shareCard(frameRef, 'Seri bozulunca evim çöktü 😱 Layfapp ile her gün minik bir iş, evin büyüsün 🏡')} style={{ flex: 1 }} />}
        </View>
        <Callout>
          <T v="small">🎬 Video yapmak için: telefonunun ekran kaydını aç, sonra Oynat’a bas. 3 saniyelik geri sayım var, oynarken düğmeler gizlenir.</T>
        </Callout>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { borderRadius: radius.card, borderWidth: 1.5, padding: 18, alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
  logo: { borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 6 },
  wordmark: { width: 110, height: 30 },
  cap: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 34, textAlign: 'center', minHeight: 70 },
  sub: { fontFamily: fonts.bodyBold, fontSize: 15, textAlign: 'center', marginTop: 8 },
  endBox: { alignItems: 'center' },
  foot: { fontFamily: fonts.bodyBold, fontSize: 12 },
  countBox: { alignItems: 'center', justifyContent: 'center' },
  count: { fontFamily: fonts.displayBold, fontSize: 120, lineHeight: 130, opacity: 0.85 },
});
