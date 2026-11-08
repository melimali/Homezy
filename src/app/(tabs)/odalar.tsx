import { useRouter } from '@/lib/nav';
import { StyleSheet, View } from 'react-native';

import { RoomGrid } from '@/components/RoomGrid';
import { BackLink, Btn, Card, Chip, SecHead, T, IconBtn, Screen, TitleBar } from '@/components/ui';
import { ROOM_EMOJI } from '@/domain/constants';
import { homeScore } from '@/domain/logic';
import { useNow } from '@/hooks/useNow';
import { useTranslation } from '@/i18n/i18n';
import { possessive, useName } from '@/profile/useName';
import { useStore } from '@/store/AppStore';
import { useColors } from '@/theme';

/**
 * Odalar: alt menüde yok (docs/skeleton-v3.md, odalar Ev sekmesinde). Eski bağlantılar ve
 * plan kaydından sonra buraya gelinir.
 */
export default function Odalar() {
  const c = useColors();
  const router = useRouter();
  const { state: S, update } = useStore();
  const now = useNow();
  const score = homeScore(S, now);
  const { lang } = useTranslation();
  const name = useName();

  return (
    <Screen header={false} tab tone="sage">
      <BackLink label="Ev" />
      <TitleBar title={name ? (lang === 'en' ? `${name}'s Rooms` : `${possessive(name)} Odaları`) : 'Odalar'} sub={`Ev puanı %${score}`} right={<IconBtn icon={<GridIcon color={c.ink} />} label="Ev planını düzenle" onPress={() => router.push('/plan')} />} />
      <Card>
        <SecHead title="Sadece kendi odam" />
        <T v="small">Evin diğer odalarını görmek istemezsen bir oda seç: işler, hatırlatmalar ve puan sadece o odaya göre olur. Kiralık, yurt ya da ailenle yaşıyorsan işine yarar.</T>
        <View style={styles.wrap}>
          <Chip label="Tüm ev" on={!S.settings.solo} onPress={() => update(D => void (D.settings.solo = null))} />
          {S.order.filter(id => S.rooms[id]).map(id => (
            <Chip key={id} label={`${ROOM_EMOJI[S.rooms[id].type]} ${S.rooms[id].name}`} on={S.settings.solo === id} onPress={() => update(D => void (D.settings.solo = id))} />
          ))}
        </View>
      </Card>
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
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gIcon: { width: 18, height: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  gCell: { width: 7.5, height: 7.5, borderRadius: 2, borderWidth: 1.8 },
});
