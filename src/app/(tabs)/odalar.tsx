import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { RoomGrid } from '@/components/RoomGrid';
import { BackLink, Btn, IconBtn, Screen, TitleBar } from '@/components/ui';
import { homeScore } from '@/domain/logic';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { useColors } from '@/theme';

/**
 * Odalar: alt menüde yok (docs/skeleton-v3.md, odalar Ev sekmesinde). Eski bağlantılar ve
 * plan kaydından sonra buraya gelinir.
 */
export default function Odalar() {
  const c = useColors();
  const router = useRouter();
  const { state: S } = useStore();
  const now = useNow();
  const score = homeScore(S, now);

  return (
    <Screen header={false} tab tone="sage">
      <BackLink label="Ev" />
      <TitleBar title="Odalar" sub={`Ev puanı %${score}`} right={<IconBtn icon={<GridIcon color={c.ink} />} label="Ev planını düzenle" onPress={() => router.push('/plan')} />} />
      <RoomGrid state={S} now={now} />
      <Btn kind="ghost" label="Evimin planını düzenle" onPress={() => router.push('/plan')} block />
    </Screen>
  );
}

function GridIcon({ color }: { color: string }) {
  return (
    <View style={styles.gIcon}>
      {[0, 1, 2, 3].map(i => <View key={i} style={[styles.gCell, { borderColor: color }]} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  gIcon: { width: 18, height: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  gCell: { width: 7.5, height: 7.5, borderRadius: 2, borderWidth: 1.8 },
});
