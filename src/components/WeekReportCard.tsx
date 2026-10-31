import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { premiumHref } from '@/components/PaywallMoments';
import { Btn, Card, T } from '@/components/ui';
import { weekReport } from '@/domain/report';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import { useColors } from '@/theme';

/**
 * Ayrıntılı haftalık rapor. Premium'da tam; ücretsizde soluk bir önizleme ve "Ayrıntıyı gör" düğmesi.
 * Özet kartı ve ısı haritası her zaman ücretsiz, bu kart yalnızca ek içgörü verir.
 */
export function WeekReportCard({ now }: { now: number }) {
  const c = useColors();
  const router = useRouter();
  const { state: S } = useStore();
  const { premium } = usePurchases();
  const r = weekReport(S, now);
  const max = Math.max(1, ...r.days.map(d => d.n));
  return (
    <Card>
      <T v="bold">Ayrıntılı rapor {premium.active ? '' : '⭐'}</T>
      <View style={[styles.bars, !premium.active && { opacity: 0.35 }]}>
        {r.days.map(d => (
          <View key={d.key} style={styles.col}>
            <View style={[styles.bar, { height: 8 + (d.n / max) * 52, backgroundColor: d.n ? c.accent : c.line }]} />
            <T v="small">{d.label}</T>
          </View>
        ))}
      </View>
      <T v="small" style={!premium.active && { opacity: 0.35 }}>
        {r.total} iş{r.bestDay ? ` · en verimli gün ${r.bestDay}` : ''}{r.mood ? ` · ruh hali ${r.mood.emoji} ${r.mood.label}` : ''}
      </T>
      {!premium.active && (
        <Btn small kind="primary" label="Ayrıntıyı gör ⭐" onPress={() => router.push(premiumHref('report'))} style={{ alignSelf: 'flex-start' }} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6, height: 84 },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  bar: { width: '70%', borderRadius: 8 },
});
