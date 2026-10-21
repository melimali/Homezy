import { Redirect, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { MiniShape } from '@/components/Plan';
import { RoomBody } from '@/components/RoomBody';
import { BackLink, Screen, T } from '@/components/ui';
import { ROOM_EMOJI, TYPES } from '@/domain/constants';
import { cellCount } from '@/domain/logic';
import { useStore } from '@/store/AppStore';
import { radius, useColors } from '@/theme';

export default function RoomScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state: S } = useStore();
  const r = id ? S.rooms[id] : undefined;
  if (!r) return <Redirect href="/" />;

  const n = cellCount(S, r.id);

  return (
    <Screen header={false}>
      <BackLink />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.card, backgroundColor: c.room[r.type] }}>
        <Text style={{ fontSize: 40 }}>{ROOM_EMOJI[r.type]}</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="eyebrow">{TYPES[r.type].label}</T>
          <T v="h1">{r.name}</T>
          <T v="small" style={{ color: c.ink, opacity: 0.75 }}>{n} blok · ~{n * 2} m²</T>
        </View>
        <MiniShape state={S} id={r.id} />
      </View>

      <RoomBody rid={r.id} />
    </Screen>
  );
}
