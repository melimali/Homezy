import { View } from 'react-native';

import { OutfitPlan, Recipes } from '@/components/PremiumExtras';
import { Fridge, Plants, Stock, Wardrobe } from '@/components/RoomModules';
import { AddTaskForm, TaskRow } from '@/components/TaskRow';
import { Card, EmptyMsg, SecHead } from '@/components/ui';
import { TYPES } from '@/domain/constants';
import { sortByDue } from '@/domain/logic';
import { useStore } from '@/store/AppStore';

/** Bir odanın içindekiler: rutinler ve odaya özel bölüm (gardırop, buzdolabı, malzemeler, bitkiler). */
export function RoomBody({ rid }: { rid: string }) {
  const { state: S } = useStore();
  const r = S.rooms[rid];
  if (!r) return null;
  const type = TYPES[r.type];
  const tasks = sortByDue(S.tasks[r.id] || []);

  return (
    <View style={{ gap: 18 }}>
      <Card>
        <SecHead title="Rutinler" right={`${tasks.length} iş`} />
        <View>
          {tasks.map((t, i) => <TaskRow key={t.id} t={t} rid={r.id} list="tasks" first={i === 0} />)}
          {!tasks.length && <EmptyMsg>Henüz rutin yok. Aşağıdan ekle.</EmptyMsg>}
        </View>
        <AddTaskForm rid={r.id} list="tasks" placeholder="Yeni rutin, ör. Perde yıkama" />
      </Card>

      {type.mod === 'gardirop' && (
        <>
          <Wardrobe rid={r.id} />
          <OutfitPlan rid={r.id} />
        </>
      )}
      {type.mod === 'buzdolabi' && (
        <>
          <Fridge rid={r.id} />
          <Stock rid={r.id} title="Ne var, ne eksik?" placeholder="Ürün ekle, ör. Zeytin" />
          <Recipes rid={r.id} />
        </>
      )}
      {type.mod === 'stok' && (
        <Stock rid={r.id} title={r.type === 'banyo' ? 'Banyo malzemeleri' : 'Malzemeler'} placeholder="Malzeme ekle, ör. Diş fırçası" />
      )}
      {type.mod === 'bitki' && <Plants rid={r.id} />}
    </View>
  );
}
