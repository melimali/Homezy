import { useState } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useRouter } from '@/lib/nav';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Appear, Float, Squish } from '@/components/motion';
import { MiniShape } from '@/components/Plan';
import { RenameRoom } from '@/components/RenameRoom';
import { RoomBody } from '@/components/RoomBody';
import { SceneImage } from '@/components/SceneImage';
import { BackLink, Screen, T } from '@/components/ui';
import { ROOM_SCENES } from '@/constants/scenes';
import { roomMokaScene } from '@/constants/curated-scenes';
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
  const [renaming, setRenaming] = useState(false);
  const r = id && Object.hasOwn(S.rooms, id) ? S.rooms[id] : undefined;
  if (!r) return <Redirect href="/" />;

  const order = S.order.filter(x => S.rooms[x]);
  const idx = order.indexOf(r.id);
  const go = (d: number) => {
    if (order.length < 2) return;
    router.setParams({ id: order[(idx + d + order.length) % order.length] });
  };
  const n = cellCount(S, r.id);
  const clean = roomClean(S, r.id, now);

  return (
    <Screen header={false}>
      {/* Geri düğmesi ve yanında odalar arasında geri dönmeden geçmek için emoji şeridi. */}
      <View style={styles.topRow}>
        <BackLink label="" />
        {order.length > 1 && (
          <Squish onPress={() => go(-1)} accessibilityRole="button" accessibilityLabel="Önceki oda" style={[styles.arrow, { backgroundColor: c.surface }]}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 24, lineHeight: 28, color: c.ink }}>‹</Text>
          </Squish>
        )}
        {S.order.length > 1 && (
          <ScrollView style={{ flex: 1 }} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
            {S.order.map(rid => {
              const x = S.rooms[rid];
              if (!x) return null;
              const on = rid === r.id;
              const rc = roomCounts(S, rid, now);
              const dot = rc.late || rc.today ? c.today : null;
              return (
                <Squish
                  key={rid}
                  onPress={() => !on && router.setParams({ id: rid })}
                  accessibilityLabel={x.name}
                  accessibilityState={{ selected: on }}
                  style={[styles.hop, { backgroundColor: on ? c.room[x.type] : c.surface }, on && { transform: [{ scale: 1.08 }] }]}
                >
                  <Text style={{ lineHeight: 29, fontSize: 22 }}>{ROOM_EMOJI[x.type]}</Text>
                  {dot && <View style={[styles.dot, { backgroundColor: dot, borderColor: c.bg }]} />}
                </Squish>
              );
            })}
          </ScrollView>
        )}
        {order.length > 1 && (
          <Squish onPress={() => go(1)} accessibilityRole="button" accessibilityLabel="Sonraki oda" style={[styles.arrow, { backgroundColor: c.surface }]}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 24, lineHeight: 28, color: c.ink }}>›</Text>
          </Squish>
        )}
      </View>

      {ROOM_SCENES[r.type] && (
        <Appear key={`scene-${r.id}`}>
          <SceneImage source={roomMokaScene(r.type, ROOM_SCENES[r.type])!} ratio={16 / 10} radius={radius.card} />
        </Appear>
      )}

      <Appear key={`hero-${r.id}`} style={[styles.hero, { backgroundColor: c.room[r.type] }]}>
        <Float amp={4}>
          <View style={[styles.emoji, { backgroundColor: c.surface }]}>
            <Text style={{ lineHeight: 44, fontSize: 34 }}>{ROOM_EMOJI[r.type]}</Text>
          </View>
        </Float>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <T v="eyebrow" style={{ marginBottom: 0 }}>{TYPES[r.type].label}</T>
          <Pressable onPress={() => setRenaming(true)} accessibilityRole="button" accessibilityLabel={`${r.name} ✏️`}>
            <T v="h1" numberOfLines={1} style={{ fontSize: 26, lineHeight: 30 }}>{r.name} ✏️</T>
          </Pressable>
          <View style={[styles.bar, { backgroundColor: c.surface }]}>
            <View style={[styles.fill, { width: `${clean}%`, backgroundColor: clean >= 80 ? c.ok : clean >= 50 ? c.today : c.late }]} />
          </View>
          <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: c.ink, opacity: 0.85 }}>
            {cleanWord(clean)} · %{clean} · ~{n * 2} m²
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
  arrow: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  hop: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: -2, right: -2, width: 13, height: 13, borderRadius: 7, borderWidth: 2 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 20, paddingHorizontal: 18, borderRadius: radius.card },
  emoji: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  bar: { height: 6, borderRadius: radius.pill, overflow: 'hidden', marginTop: 8 },
  fill: { height: '100%', borderRadius: radius.pill },
});
