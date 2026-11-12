import { useState } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useRouter } from '@/lib/nav';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Appear, Float } from '@/components/motion';
import { MiniShape } from '@/components/Plan';
import { RoomSwitcher } from '@/components/RoomSwitcher';
import { RenameRoom } from '@/components/RenameRoom';
import { RoomBody } from '@/components/RoomBody';
import { SceneImage } from '@/components/SceneImage';
import { BackLink, Screen, T } from '@/components/ui';
import { ROOM_SCENES } from '@/constants/scenes';
import { roomMokaScene } from '@/constants/curated-scenes';
import { ROOM_EMOJI, TYPES } from '@/domain/constants';
import { cellCount, cleanWord, roomClean } from '@/domain/logic';
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

  const n = cellCount(S, r.id);
  const clean = roomClean(S, r.id, now);

  return (
    <Screen header={false}>
      <RenameRoom id={renaming ? r.id : null} onClose={() => setRenaming(false)} />
      <BackLink label="" />
      <RoomSwitcher state={S} id={r.id} now={now} onGo={rid => router.setParams({ id: rid })} />
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
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 20, paddingHorizontal: 18, borderRadius: radius.card },
  emoji: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  bar: { height: 6, borderRadius: radius.pill, overflow: 'hidden', marginTop: 8 },
  fill: { height: '100%', borderRadius: radius.pill },
});
