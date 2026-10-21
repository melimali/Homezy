import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RoomBody } from '@/components/RoomBody';
import { Btn, Pill, Screen, T } from '@/components/ui';
import { ROOM_EMOJI } from '@/domain/constants';
import { roomCounts } from '@/domain/logic';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { radius, useColors } from '@/theme';

/** Odalar sekmesi: her oda bir başlık. Başlığa dokununca odanın içindekiler hemen altında açılır. */
export default function Odalar() {
  const c = useColors();
  const router = useRouter();
  const { state: S } = useStore();
  const now = useNow();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Screen>
      <View>
        <T v="h1">Odalar</T>
        <T v="lead">Bir odaya dokun, içindeki işler açılsın.</T>
      </View>

      <View style={{ gap: 12 }}>
        {S.order.map(id => {
          const r = S.rooms[id];
          const rc = roomCounts(S, id, now);
          const isOpen = open === id;
          return (
            <View key={id} style={{ gap: 12 }}>
              <Pressable
                onPress={() => setOpen(isOpen ? null : id)}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                style={({ pressed }) => [
                  styles.head,
                  { backgroundColor: c.room[r.type], boxShadow: `0 4px 0 ${c.line}` },
                  pressed && { transform: [{ translateY: 2 }], boxShadow: `0 2px 0 ${c.line}` },
                ]}
              >
                <View style={[styles.emoji, { backgroundColor: c.surface }]}>
                  <Text style={{ fontSize: 28 }}>{ROOM_EMOJI[r.type]}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <T v="h2" numberOfLines={1}>{r.name}</T>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {rc.late > 0 && <Pill k="late" label={`${rc.late} gecikti`} />}
                    {rc.today > 0 && <Pill k="today" label={`${rc.today} bugün`} />}
                    {!rc.late && !rc.today && <Pill k="ok" label="Her şey yolunda ✓" />}
                  </View>
                </View>
                <Text style={{ color: c.ink, fontSize: 26, transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}>›</Text>
              </Pressable>
              {isOpen && <RoomBody rid={id} />}
            </View>
          );
        })}
      </View>

      <Btn label="Evimin planını düzenle" onPress={() => router.push('/plan')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 14, borderRadius: radius.card },
  emoji: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
