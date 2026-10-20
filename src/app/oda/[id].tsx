import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Fridge, Plants, Stock, Wardrobe } from '@/components/RoomModules';
import { MiniShape } from '@/components/Plan';
import { AddTaskForm, TaskRow } from '@/components/TaskRow';
import { Card, EmptyMsg, Screen, SecHead, T } from '@/components/ui';
import { TYPES } from '@/domain/constants';
import { cellCount, sortByDue } from '@/domain/logic';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

export default function RoomScreen() {
  const c = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state: S } = useStore();
  const r = id ? S.rooms[id] : undefined;
  if (!r) return <Redirect href="/" />;

  const type = TYPES[r.type];
  const n = cellCount(S, r.id);
  const tasks = sortByDue(S.tasks[r.id] || []);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <Screen header={false}>
      <Pressable onPress={back} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'flex-start', paddingVertical: 6 }}>
        <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 15, color: c.muted }}>‹ Ev</Text>
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.card, backgroundColor: c.room[r.type] }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="eyebrow">{type.label}</T>
          <T v="h1">{r.name}</T>
          <T v="small" style={{ color: c.ink, opacity: 0.75 }}>{n} blok · ~{n * 2} m²</T>
        </View>
        <MiniShape state={S} id={r.id} />
      </View>

      <Card>
        <SecHead title="Rutinler" right={`${tasks.length} iş`} />
        <View>
          {tasks.map((t, i) => <TaskRow key={t.id} t={t} rid={r.id} list="tasks" first={i === 0} />)}
          {!tasks.length && <EmptyMsg>Henüz rutin yok. Aşağıdan ekle.</EmptyMsg>}
        </View>
        <AddTaskForm rid={r.id} list="tasks" placeholder="Yeni rutin, ör. Perde yıkama" />
      </Card>

      {type.mod === 'gardirop' && <Wardrobe rid={r.id} />}
      {type.mod === 'buzdolabi' && (
        <>
          <Fridge rid={r.id} />
          <Stock rid={r.id} title="Ne var, ne eksik?" placeholder="Ürün ekle, ör. Zeytin" />
        </>
      )}
      {type.mod === 'stok' && (
        <Stock rid={r.id} title={r.type === 'banyo' ? 'Banyo malzemeleri' : 'Malzemeler'} placeholder="Malzeme ekle, ör. Diş fırçası" />
      )}
      {type.mod === 'bitki' && <Plants rid={r.id} />}
    </Screen>
  );
}
