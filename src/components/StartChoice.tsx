import { StyleSheet, Text, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, radius, useColors } from '@/theme';

import { MokaMascot } from './MokaMascot';
import { Appear, Float, Squish } from './motion';
import { T } from './ui';

export type StartKind = 'aile' | 'kisisel' | 'oda' | 'yurt';

const CHOICES: { k: StartKind; emoji: string; title: string; sub: string }[] = [
  { k: 'aile', emoji: '🏡', title: 'Aile evi', sub: 'Bütün evin işleri, birlikte' },
  { k: 'kisisel', emoji: '🛋️', title: 'Kişisel ev', sub: 'Kendi evin, kendi düzenin' },
  { k: 'oda', emoji: '🛏️', title: 'Sadece odam', sub: 'Yalnızca kendi odan' },
  { k: 'yurt', emoji: '🎓', title: 'Yurt', sub: 'Yurt ya da kiralık oda' },
];

/** İlk ekran: slogan, Moka ve dört büyük seçim. Tek dokunuşla ilerler. */
export function StartChoice({ onPick }: { onPick: (k: StartKind) => void }) {
  const c = useColors();
  const ins = useSafeAreaInsets();
  return (
    <View style={{ gap: 20, paddingBottom: ins.bottom + 96 }}>
      <Appear index={0} style={[st.hero, { backgroundColor: c.peachSoft }]}>
        <Float amp={4}>
          <MokaMascot pose="happy" size="lg" showBubble={false} />
        </Float>
        <T v="h1" style={{ textAlign: 'center' }}>Küçük adımlar, uzun soluklu disiplin.</T>
        <T v="small" style={{ textAlign: 'center' }}>Bugün tek bir işle başla, gün gün alışkanlık kazan.</T>
      </Appear>

      <View style={{ gap: 4 }}>
        <T v="eyebrow">Başlayalım</T>
        <T v="h2">Nerede yaşıyorsun?</T>
      </View>

      <View style={st.grid}>
        {CHOICES.map((o, i) => (
          <Appear key={o.k} index={i + 1} style={st.cell}>
            <Squish
              onPress={() => onPick(o.k)}
              accessibilityRole="button"
              accessibilityLabel={`${o.title}. ${o.sub}`}
              style={[st.tile, { backgroundColor: c.surface, borderColor: c.line }]}
            >
              <View style={[st.badge, { backgroundColor: c.accentSoft }]}>
                <Text style={st.emoji}>{o.emoji}</Text>
              </View>
              <Text style={[st.title, { color: c.ink }]}>{o.title}</Text>
              <Text style={[st.sub, { color: c.ink }]}>{o.sub}</Text>
            </Squish>
          </Appear>
        ))}
      </View>
      <T v="tiny" style={{ textAlign: 'center' }}>Oda ve Yurt seçersen sadece kendi odanın işleri görünür. Sonra değiştirebilirsin.</T>
    </View>
  );
}

const st = StyleSheet.create({
  hero: { alignItems: 'center', gap: 8, borderRadius: radius.card, paddingVertical: 20, paddingHorizontal: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { width: '48%', flexGrow: 1 },
  tile: { minHeight: 168, borderRadius: radius.card, padding: 16, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', gap: 4 },
  badge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emoji: { fontSize: 32, lineHeight: 40 },
  title: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 24, textAlign: 'center' },
  sub: { fontFamily: fonts.bodyBold, fontSize: 13.5, lineHeight: 17, textAlign: 'center', opacity: 0.8 },
});
