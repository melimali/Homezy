import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MokaMascot } from '@/components/MokaMascot';
import { Appear, Float } from '@/components/motion';
import { T } from '@/components/ui';
import { useColors, radius, fonts } from '@/theme';

/** Veri yüklenirken veya açılışta gösterilen, mevcut tema renklerinde zarif yükleme ekranı. */
export function AppLoading() {
  const c = useColors();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <Appear style={styles.wrap}>
        <MokaMascot pose="analyzing" title="Evin hazırlanıyor…" message="Moka verileri topluyor, her şey birazdan hazır olacak 🏡" size="md" />
        <View style={[styles.skeletonCard, { backgroundColor: c.surface, borderColor: c.line }]}>
          <View style={[styles.skeletonLine, { backgroundColor: c.surface2, width: '70%' }]} />
          <View style={[styles.skeletonLine, { backgroundColor: c.surface2, width: '45%' }]} />
        </View>
      </Appear>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wrap: { width: '100%', maxWidth: 400, paddingHorizontal: 24, alignItems: 'center', gap: 20 },
  skeletonCard: { width: '100%', borderRadius: radius.card, padding: 20, borderWidth: 1.5, gap: 12 },
  skeletonLine: { height: 14, borderRadius: 7 },
});
