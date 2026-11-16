import { StyleSheet, Text, View } from 'react-native';

import { Btn, Card, SecHead, T } from '@/components/ui';
import { markPetDone, petEmoji, petsDue, stateText } from '@/domain/pets';
import { useNow } from '@/hooks/useNow';
import { useRouter } from '@/lib/nav';
import { useStore } from '@/store/AppStore';
import { fonts, useColors } from '@/theme';

/** Bugün sekmesinde vakti gelen ya da geçen evcil hayvan işleri: "Yaptım" ile kaydedilir. Hiçbiri yoksa kart görünmez. */
export function PetsToday() {
  const c = useColors();
  const now = useNow();
  const router = useRouter();
  const { state: S, update } = useStore();
  const due = petsDue(S, now);
  if (!due.length) return null;
  return (
    <Card>
      <SecHead title="🐾 Evcil hayvanlar" right={`${due.length}`} />
      <View style={{ gap: 10 }}>
        {due.slice(0, 6).map(({ pet, item, s }) => (
          <View key={`${pet.id}${item.id}`} style={[st.row, { backgroundColor: s.k === 'late' ? c.todaySoft : c.surface2 }]}>
            <Text style={{ lineHeight: 29, fontSize: 22 }}>{item.emoji}</Text>
            <View style={{ flex: 1 }}>
              <T v="bold" style={{ fontSize: 15 }}>{petEmoji(pet)} {pet.name} · {item.name}</T>
              <T v="small" style={{ color: s.k === 'late' ? c.late : c.muted, fontFamily: fonts.bodyBold }}>{stateText(s)}</T>
            </View>
            <Btn small kind="primary" label="Yaptım" accessibilityLabel={`${pet.name} ${item.name} yaptım`} onPress={() => update(D => void markPetDone(D, pet.id, item.id))} />
          </View>
        ))}
      </View>
      <Btn small kind="ghost" label="Tümü ›" onPress={() => router.push('/evcil' as never)} />
    </Card>
  );
}

const st = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 12 } });
