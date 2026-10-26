import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Appear, Float, Squish } from '@/components/motion';
import { Btn, Screen, T } from '@/components/ui';
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
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <T v="h1">Odalar</T>
          <T v="lead" style={{ marginTop: 2 }}>Bir odaya dokun, içine gir.</T>
        </View>
        <Float amp={4}>
          <View style={[styles.score, { backgroundColor: c.surface, boxShadow: `0 4px 0 ${c.line}` }]}>
            <Text style={{ fontSize: 22 }}>{score >= 90 ? '🌟' : score >= 60 ? '😊' : '🫧'}</Text>
            <Text style={[styles.scoreN, { color: c.ink }]}>%{score}</Text>
          </View>
        </Float>
      </View>

      {groups.map(([emoji, title, arr]) =>
        arr.length ? (
          <View key={title} style={{ gap: 10 }}>
            <View style={styles.groupHead}>
              <Text style={{ fontSize: 20 }}>{emoji}</Text>
              <T v="h2" style={{ flex: 1 }}>{title}</T>
              <View style={[styles.count, { backgroundColor: c.surface2 }]}>
                <T v="small" style={{ color: c.ink }}>{arr.length}</T>
              </View>
            </View>
            <View style={styles.grid}>
              {arr.map(({ id, r, rc, clean }) => {
                const i = n++;
                const tag = rc.late ? { bg: c.late, fg: '#fff', text: `${rc.late + rc.today}` } : rc.today ? { bg: c.today, fg: c.onBadge, text: `${rc.today}` } : null;
                return (
                  <Appear key={id} index={i} style={styles.cell}>
                    <Squish
                      onPress={() => open(id)}
                      accessibilityLabel={`${r.name}. ${rc.late ? `${rc.late} gecikmiş, ` : ''}${rc.today ? `${rc.today} bugün, ` : ''}%${clean} temiz`}
                      style={[styles.tile, { backgroundColor: c.room[r.type], boxShadow: `0 5px 0 ${c.line}` }]}
                    >
                      <Float amp={rc.late || rc.today ? 4 : 2} dur={1700 + (i % 3) * 250} delay={i * 120}>
                        <View style={[styles.emoji, { backgroundColor: c.surface }]}>
                          <Text style={{ fontSize: 30 }}>{ROOM_EMOJI[r.type]}</Text>
                        </View>
                      </Float>
                      <T v="h3" numberOfLines={1} style={{ fontSize: 16 }}>{r.name}</T>
                      <View style={[styles.bar, { backgroundColor: c.surface }]}>
                        <View style={[styles.fill, { width: `${clean}%`, backgroundColor: clean >= 80 ? c.ok : clean >= 50 ? c.today : c.late }]} />
                      </View>
                      <T v="tiny" style={{ color: c.ink, opacity: 0.8 }}>{cleanWord(clean)}</T>
                      {tag ? (
                        <View style={[styles.badge, { backgroundColor: tag.bg }]}>
                          <Text style={[styles.badgeT, { color: tag.fg }]}>{tag.text}</Text>
                        </View>
                      ) : (
                        <Text style={styles.ok}>✓</Text>
                      )}
                    </Squish>
                  </Appear>
                );
              })}
            </View>
          </View>
        ) : null,
      )}

      <Btn label="🏗️ Evimin planını düzenle" onPress={() => router.push('/plan')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  score: { alignItems: 'center', justifyContent: 'center', width: 70, height: 70, borderRadius: 35 },
  scoreN: { fontFamily: fonts.displayBold, fontSize: 16, lineHeight: 18 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  count: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  cell: { width: '48.3%' },
  tile: { borderRadius: radius.card, alignItems: 'center', gap: 5, paddingVertical: 13, paddingHorizontal: 12 },
  emoji: { width: 56, height: 56, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  bar: { height: 8, borderRadius: radius.pill, overflow: 'hidden', alignSelf: 'stretch', marginHorizontal: 8 },
  fill: { height: '100%', borderRadius: radius.pill },
  badge: { position: 'absolute', top: 10, right: 10, minWidth: 26, height: 26, paddingHorizontal: 6, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  badgeT: { fontFamily: fonts.bodyBlack, fontSize: 13 },
  ok: { position: 'absolute', top: 10, right: 14, fontSize: 16, opacity: 0.6 },
});
