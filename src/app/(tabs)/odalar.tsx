import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Appear, Float, Squish } from '@/components/motion';
import { SceneImage } from '@/components/SceneImage';
import { Bar, Btn, IconBtn, Screen, T, TitleBar } from '@/components/ui';
import { ROOM_SCENES } from '@/constants/scenes';
import { roomMokaScene } from '@/constants/curated-scenes';
import { ROOM_EMOJI } from '@/domain/constants';
import { allTasks, homeScore, roomClean, roomCounts } from '@/domain/logic';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

/**
 * Odalar sekmesi: iki sütun resimli kartlar (oda sahnesi, ad, temizlik çubuğu, yapılan/toplam iş).
 * İşi olan odalar önde. Sahnesi olmayan oda türü emojili kartla görünür.
 */
export default function Odalar() {
  const c = useColors();
  const router = useRouter();
  const { state: S } = useStore();
  const now = useNow();
  const refs = allTasks(S, now);
  const rooms = S.order
    .map(id => ({ id, r: S.rooms[id], rc: roomCounts(S, id, now), clean: roomClean(S, id, now), mine: refs.filter(x => x.rid === id) }))
    .filter(x => x.r)
    .sort((a, b) => b.rc.late - a.rc.late || b.rc.today - a.rc.today);
  const score = homeScore(S, now);
  const open = (id: string) => router.push({ pathname: '/oda/[id]', params: { id } });

  return (
    <Screen header={false}>
      <TitleBar title="Odalar" sub={`Ev puanı %${score}`} right={<IconBtn icon={<GridIcon color={c.ink} />} label="Ev planını düzenle" onPress={() => router.push('/plan')} />} />

      <View style={styles.grid}>
        {rooms.map(({ id, r, rc, clean, mine }, i) => {
          const scene = roomMokaScene(r.type, ROOM_SCENES[r.type]);
          const okN = mine.filter(x => x.s.k === 'ok').length;
          const n = rc.late + rc.today;
          return (
            <Appear key={id} index={i} style={styles.cell}>
              <Squish
                onPress={() => open(id)}
                accessibilityLabel={`${r.name}. ${rc.late ? `${rc.late} gecikmiş, ` : ''}${rc.today ? `${rc.today} bugün, ` : ''}%${clean} temiz`}
                style={[styles.card, { backgroundColor: c.surface }]}
              >
                {scene ? (
                  <SceneImage source={scene} height={124} />
                ) : (
                  <View style={[styles.noScene, { backgroundColor: c.room[r.type] }]}>
                    <Float amp={n ? 4 : 2} dur={1700 + (i % 3) * 250} delay={i * 120}>
                      <Text style={{ fontSize: 46, lineHeight: 56 }}>{ROOM_EMOJI[r.type]}</Text>
                    </Float>
                  </View>
                )}
                <View style={styles.body}>
                  <T v="h3" numberOfLines={1}>{r.name}</T>
                  <View style={styles.foot}>
                    <Bar value={mine.length ? okN / mine.length : 1} color={rc.late ? c.late : c.hi} height={6} style={{ flex: 1 }} />
                    <T v="tiny">{okN}/{mine.length}</T>
                  </View>
                </View>
                {n > 0 && (
                  <View style={[styles.badge, { backgroundColor: rc.late ? c.late : c.today }]}>
                    <Text style={[styles.badgeT, { color: c.onBadge }]}>{n}</Text>
                  </View>
                )}
              </Squish>
            </Appear>
          );
        })}
      </View>

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
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14, marginTop: -10 },
  cell: { width: '48%' },
  card: { borderRadius: radius.tile, overflow: 'hidden' },
  noScene: { height: 124, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14, gap: 8 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { position: 'absolute', top: 10, right: 10, minWidth: 26, height: 26, paddingHorizontal: 6, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  badgeT: { fontFamily: fonts.bodyBlack, fontSize: 13 },
  gIcon: { width: 18, height: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  gCell: { width: 7.5, height: 7.5, borderRadius: 2, borderWidth: 1.8 },
});
