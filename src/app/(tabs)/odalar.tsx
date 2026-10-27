import { useRouter } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Appear, Float, Squish } from '@/components/motion';
import { Btn, MokaHero, Screen, T } from '@/components/ui';
import { ROOM_SCENES } from '@/constants/scenes';
import { ROOM_EMOJI } from '@/domain/constants';
import { cleanWord, homeScore, roomClean, roomCounts } from '@/domain/logic';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

/**
 * Odalar sekmesi: odalar iki grupta, büyük kareler hâlinde. Üstte işi olanlar ("Seni bekleyenler"),
 * altta keyfi yerinde olanlar. Kareye dokununca oda açılır; içeride işler sekme sekme durur.
 */
export default function Odalar() {
  const c = useColors();
  const router = useRouter();
  const { state: S } = useStore();
  const now = useNow();
  const rooms = S.order.map(id => ({ id, r: S.rooms[id], rc: roomCounts(S, id, now), clean: roomClean(S, id, now) })).filter(x => x.r);
  const busy = rooms.filter(x => x.rc.late || x.rc.today).sort((a, b) => b.rc.late - a.rc.late || b.rc.today - a.rc.today);
  const calm = rooms.filter(x => !x.rc.late && !x.rc.today);
  const score = homeScore(S, now);
  const open = (id: string) => router.push({ pathname: '/oda/[id]', params: { id } });

  const groups: [string, string, typeof rooms][] = [
    ['🧹', 'Seni bekleyenler', busy],
    ['✨', 'Keyfi yerinde', calm],
  ];
  let n = 0;

  return (
    <Screen>
      <MokaHero
        title="Odalar"
        pose={score >= 90 ? 'sparkling_complete' : score >= 60 ? 'dusting' : 'sweeping'}
        right={
          <View style={[styles.score, { backgroundColor: c.surface }]}>
            <Text style={[styles.scoreN, { color: c.ink }]}>%{score}</Text>
            <T v="small">ev puanı</T>
          </View>
        }
      />

      {groups.map(([emoji, title, arr]) =>
        arr.length ? (
          <View key={title} style={{ gap: 14 }}>
            <View style={styles.groupHead}>
              <T v="h2" style={{ flex: 1 }}>{emoji}  {title}</T>
              <T v="small">{arr.length}</T>
            </View>
            <View style={styles.grid}>
              {arr.map(({ id, r, rc, clean }) => {
                const i = n++;
                const tag = rc.late ? { bg: c.late, fg: '#fff', text: `${rc.late + rc.today}` } : rc.today ? { bg: c.today, fg: c.onBadge, text: `${rc.today}` } : null;
                const scene = ROOM_SCENES[r.type];
                const label = `${r.name}. ${rc.late ? `${rc.late} gecikmiş, ` : ''}${rc.today ? `${rc.today} bugün, ` : ''}%${clean} temiz`;
                const badge = tag ? (
                  <View style={[styles.badge, { backgroundColor: tag.bg }]}>
                    <Text style={[styles.badgeT, { color: tag.fg }]}>{tag.text}</Text>
                  </View>
                ) : null;
                const bar = (
                  <View style={[styles.bar, scene ? styles.barRow : null, { backgroundColor: scene ? c.surface2 : c.surface }]}>
                    <View style={[styles.fill, { width: `${clean}%`, backgroundColor: clean >= 80 ? c.ok : clean >= 50 ? c.today : c.late }]} />
                  </View>
                );
                // Oda sahnesi (arka plan + Moka) varsa resimli kart; yoksa emojili kare.
                if (scene)
                  return (
                    <Appear key={id} index={i} style={styles.cell}>
                      <Squish onPress={() => open(id)} accessibilityLabel={label} style={[styles.card, { backgroundColor: c.surface }]}>
                        <Image source={scene} style={styles.scene} resizeMode="cover" accessibilityIgnoresInvertColors />
                        <View style={styles.cardBody}>
                          <T v="h3" numberOfLines={1}>{r.name}</T>
                          <View style={styles.cardFoot}>
                            {bar}
                            <T v="tiny">%{clean}</T>
                          </View>
                        </View>
                        {badge ?? (
                          <View style={[styles.okDot, { backgroundColor: c.surface }]}>
                            <Text style={{ fontSize: 13, color: c.ok }}>✓</Text>
                          </View>
                        )}
                      </Squish>
                    </Appear>
                  );
                return (
                  <Appear key={id} index={i} style={styles.cell}>
                    <Squish onPress={() => open(id)} accessibilityLabel={label} style={[styles.tile, { backgroundColor: c.room[r.type] }]}>
                      <Float amp={rc.late || rc.today ? 4 : 2} dur={1700 + (i % 3) * 250} delay={i * 120}>
                        <Text style={{ fontSize: 42, lineHeight: 50 }}>{ROOM_EMOJI[r.type]}</Text>
                      </Float>
                      <T v="h3" numberOfLines={1}>{r.name}</T>
                      {bar}
                      <T v="tiny" style={{ color: c.ink, opacity: 0.8 }}>{cleanWord(clean)}</T>
                      {badge ?? <Text style={styles.ok}>✓</Text>}
                    </Squish>
                  </Appear>
                );
              })}
            </View>
          </View>
        ) : null,
      )}

      <Btn kind="ghost" label="Evimin planını düzenle" onPress={() => router.push('/plan')} block />
    </Screen>
  );
}

const styles = StyleSheet.create({
  score: { flexDirection: 'row', alignItems: 'baseline', gap: 6, alignSelf: 'flex-start', borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 14, marginTop: 12 },
  scoreN: { fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 22 },
  groupHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  cell: { width: '48%' },
  tile: { borderRadius: radius.card, alignItems: 'center', gap: 8, paddingTop: 22, paddingBottom: 18, paddingHorizontal: 14 },
  bar: { height: 6, borderRadius: radius.pill, overflow: 'hidden', alignSelf: 'stretch', marginHorizontal: 12 },
  barRow: { flex: 1, alignSelf: 'center', marginHorizontal: 0 },
  fill: { height: '100%', borderRadius: radius.pill },
  badge: { position: 'absolute', top: 12, right: 12, minWidth: 26, height: 26, paddingHorizontal: 6, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  badgeT: { fontFamily: fonts.bodyBlack, fontSize: 13 },
  ok: { position: 'absolute', top: 12, right: 16, fontSize: 15, opacity: 0.5 },
  card: { borderRadius: radius.tile, overflow: 'hidden' },
  scene: { width: '100%', aspectRatio: 4 / 3 },
  cardBody: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14, gap: 8 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  okDot: { position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', opacity: 0.9 },
});
