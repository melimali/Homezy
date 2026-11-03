import { useRouter } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Squish } from '@/components/motion';
import { Card, SecHead, T } from '@/components/ui';
import { MOKA_ASSETS } from '@/constants/moka';
import { FEELS } from '@/domain/mood';
import { mokaWeek } from '@/domain/report';
import { moodSeries } from '@/domain/stats';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { radius, useColors } from '@/theme';

/** Moka'nın haftalık raporu: iş, seri, ruh hali, okuma. Gelişim'de ve Haftam'da. */
export function MokaWeekCard({ index }: { index?: number }) {
  const c = useColors();
  const now = useNow();
  const { state: S } = useStore();
  const w = mokaWeek(S, now);
  const quiet = !w.chores && !w.readMin;
  const cells: { e: string; n: string; l: string }[] = [
    { e: '🧹', n: String(w.chores), l: 'iş' },
    { e: '🔥', n: String(w.streak), l: 'seri' },
    { e: w.mood?.emoji ?? '💭', n: w.mood?.label ?? '-', l: 'ruh hali' },
    { e: '📖', n: String(w.readMin), l: 'dk okuma' },
  ];
  return (
    <Card index={index}>
      <SecHead title="Moka’nın haftalık raporu" h="h3" right="son 7 gün" />
      <View style={st.row}>
        <Image source={MOKA_ASSETS[quiet ? 'sipping' : 'party']} style={st.moka} resizeMode="contain" accessibilityIgnoresInvertColors />
        <T v="small" style={{ flex: 1, color: c.ink }}>{w.line}</T>
      </View>
      <View style={st.cells}>
        {cells.map(x => (
          <View key={x.l} style={[st.cell, { backgroundColor: c.surface2 }]}>
            <Text style={st.emoji}>{x.e}</Text>
            <T v="bold" style={st.center}>{x.n}</T>
            <T v="tiny" style={st.center}>{x.l}</T>
          </View>
        ))}
      </View>
    </Card>
  );
}

/** Son 7 günün ruh hali: gün gün emoji şeridi + not varsa küçük nokta. Dokununca geçmiş ekranı. */
export function MoodWeekCard({ index }: { index?: number }) {
  const c = useColors();
  const router = useRouter();
  const now = useNow();
  const { state: S } = useStore();
  const pts = moodSeries(S.play, now, 7);
  return (
    <Card index={index}>
      <SecHead title="Haftalık ruh hali" h="h3" right="geçmiş ›" />
      <Squish onPress={() => router.push('/ruhhali')} accessibilityLabel="Ruh hali geçmişi" style={st.week}>
        {pts.map(p => (
          <View key={p.key} style={st.day}>
            <View style={[st.bubble, { backgroundColor: p.score ? c.surface2 : 'transparent', borderColor: c.line, borderWidth: p.score ? 0 : 1, borderStyle: 'dashed' }]}>
              <Text style={st.emoji}>{p.emoji ?? ''}</Text>
              {!!S.play.checkins?.[p.key] && 'note' in S.play.checkins[p.key] && !!(S.play.checkins[p.key] as { note?: string }).note && <View style={[st.dot, { backgroundColor: c.accent }]} />}
            </View>
            <T v="tiny">{p.label}</T>
          </View>
        ))}
      </Squish>
      <T v="tiny" style={st.center}>{FEELS.map(f => f.emoji).join(' ')} · sabah sorusunda seçtiklerin</T>
    </Card>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  moka: { width: 64, height: 64 },
  cells: { flexDirection: 'row', gap: 8 },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.card, gap: 2 },
  emoji: { fontSize: 22 },
  center: { textAlign: 'center' },
  week: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  day: { flex: 1, alignItems: 'center', gap: 4 },
  bubble: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 1, right: 1, width: 8, height: 8, borderRadius: 4 },
});
