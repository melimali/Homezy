import { StyleSheet, Text, View } from 'react-native';

import { MoodWeekCard } from '@/components/MokaReport';
import { BackLink, Card, EmptyMsg, Screen, SecHead, T } from '@/components/ui';
import { feelOf, moodHistory } from '@/domain/mood';
import { dayTs } from '@/domain/play';
import { dateLocale } from '@/i18n/runtime';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { useColors } from '@/theme';

/** Ruh hali geçmişi: son 30 günün check-in'leri ve notları. */
export default function RuhHali() {
  const c = useColors();
  const now = useNow();
  const { state: S } = useStore();
  const hist = moodHistory(S.play, now, 30);
  return (
    <Screen header={false}>
      <BackLink />
      <T v="h1">Ruh halim 💭</T>
      <MoodWeekCard />
      <Card>
        <SecHead title="Geçmiş" h="h3" right="son 30 gün" />
        {!hist.length && <EmptyMsg>Sabah sorusuna cevap verdikçe geçmişin burada birikir.</EmptyMsg>}
        {hist.map(h => {
          const f = feelOf(h.feel);
          return (
            <View key={h.key} style={[st.row, { borderColor: c.line }]}>
              <Text style={st.emoji}>{f.emoji}</Text>
              <View style={{ flex: 1 }}>
                <T v="bold">{f.label}</T>
                {!!h.note && <T v="small">{h.note}</T>}
              </View>
              <T v="tiny">{new Date(dayTs(h.key)).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' })}</T>
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  emoji: { lineHeight: 34, fontSize: 26 },
});
