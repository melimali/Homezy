import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Appear, Float, Squish } from '@/components/motion';
import { MiniShape } from '@/components/Plan';
import { RoomBody } from '@/components/RoomBody';
import { BackLink, Screen, T } from '@/components/ui';
import { ROOM_EMOJI, TYPES } from '@/domain/constants';
import { cellCount, cleanWord, roomClean, roomCounts } from '@/domain/logic';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

export default function RoomScreen() {
  const c = useColors();
  const router = useRouter();
  const now = useNow();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state: S } = useStore();
  const r = id ? S.rooms[id] : undefined;
  if (!r) return <Redirect href="/" />;

  const n = cellCount(S, r.id);
  const clean = roomClean(S, r.id, now);

  return (
    <Screen header={false}>
      {/* Geri düğmesi ve yanında odalar arasında geri dönmeden geçmek için emoji şeridi. */}
      <View style={styles.topRow}>
        <BackLink label="" />
        {S.order.length > 1 && (
          <ScrollView style={{ flex: 1 }} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
            {S.order.map(rid => {
              const x = S.rooms[rid];
              if (!x) return null;
              const on = rid === r.id;
              const rc = roomCounts(S, rid, now);
              const dot = rc.late ? c.late : rc.today ? c.today : null;
              return (
                <Squish
                  key={rid}
                  onPress={() => !on && router.setParams({ id: rid })}
                  accessibilityLabel={x.name}
                  accessibilityState={{ selected: on }}
                  style={[styles.hop, { backgroundColor: on ? c.room[x.type] : c.surface, borderColor: on ? c.wall : 'transparent' }]}
                >
                  <Text style={{ fontSize: 22 }}>{ROOM_EMOJI[x.type]}</Text>
                  {dot && <View style={[styles.dot, { backgroundColor: dot, borderColor: c.bg }]} />}
                </Squish>
              );
            })}
          </ScrollView>
        )}
      </View>

      <Appear key={`hero-${r.id}`} style={[styles.hero, { backgroundColor: c.room[r.type], boxShadow: `0 5px 0 ${c.line}` }]}>
        <Float amp={4}>
          <View style={[styles.emoji, { backgroundColor: c.surface }]}>
            <Text style={{ fontSize: 38 }}>{ROOM_EMOJI[r.type]}</Text>
          </View>
        </Float>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <T v="eyebrow" style={{ marginBottom: 0 }}>{TYPES[r.type].label}</T>
          <T v="h1" numberOfLines={1} style={{ fontSize: 26, lineHeight: 30 }}>{r.name}</T>
          <View style={[styles.bar, { backgroundColor: c.surface }]}>
            <View style={[styles.fill, { width: `${clean}%`, backgroundColor: clean >= 80 ? c.ok : clean >= 50 ? c.today : c.late }]} />
          </View>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: c.ink, opacity: 0.8 }}>
            {cleanWord(clean)} · %{clean} · ~{n * 2} m²
          </Text>
        </View>
        <MiniShape state={S} id={r.id} />
      </Appear>

      <RoomBody key={r.id} rid={r.id} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  strip: { gap: 8, paddingVertical: 4, paddingHorizontal: 2 },
  hop: { width: 46, height: 46, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: -2, right: -2, width: 13, height: 13, borderRadius: 7, borderWidth: 2 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.card },
  emoji: { width: 64, height: 64, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  bar: { height: 8, borderRadius: radius.pill, overflow: 'hidden', marginTop: 4 },
  fill: { height: '100%', borderRadius: radius.pill },
});
