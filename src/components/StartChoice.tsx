import { StyleSheet, Text, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, radius, useColors } from '@/theme';

import { MokaMascot } from './MokaMascot';
import { Appear, Float, Squish } from './motion';
import { T } from './ui';

export type StartKind = 'aile' | 'kisisel' | 'oda' | 'yurt';

const CHOICES: { k: StartKind; emoji: string; title: string }[] = [
  { k: 'aile', emoji: '🏡', title: 'Aile evi' },
  { k: 'kisisel', emoji: '🛋️', title: 'Kişisel ev' },
  { k: 'oda', emoji: '🛏️', title: 'Sadece odam' },
  { k: 'yurt', emoji: '🎓', title: 'Yurt' },
];

/** İlk ekran: küçük Moka, tek satır ve dört sade seçim. */
export function StartChoice({ onPick }: { onPick: (k: StartKind) => void }) {
  const c = useColors();
  const ins = useSafeAreaInsets();
  return (
    <View style={{ gap: 28, paddingBottom: ins.bottom + 96 }}>
      <Appear index={0} style={st.head}>
        <Float amp={3}>
          <MokaMascot pose="happy" size="md" showBubble={false} />
        </Float>
        <T v="h2" style={{ textAlign: 'center' }}>Nerede yaşıyorsun?</T>
      </Appear>

      <View style={st.grid}>
        {CHOICES.map((o, i) => (
          <Appear key={o.k} index={i + 1} style={st.cell}>
            <Squish
              onPress={() => onPick(o.k)}
              accessibilityRole="button"
              accessibilityLabel={o.title}
              style={[st.tile, { backgroundColor: c.surface, borderColor: c.line }]}
            >
              <Text style={st.emoji}>{o.emoji}</Text>
              <Text style={[st.title, { color: c.ink }]}>{o.title}</Text>
            </Squish>
          </Appear>
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  head: { alignItems: 'center', gap: 4, paddingTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  cell: { width: '48%', flexGrow: 1 },
  tile: { minHeight: 120, borderRadius: radius.card, padding: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emoji: { fontSize: 36, lineHeight: 44 },
  title: { fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 22, textAlign: 'center' },
});
