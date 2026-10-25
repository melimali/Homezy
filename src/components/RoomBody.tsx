import { useState } from 'react';
import { View } from 'react-native';

import { Outfits, type PhotoLook } from '@/components/Outfits';
import { OutfitPlan, Recipes } from '@/components/PremiumExtras';
import { Fridge, Plants, Stock, Wardrobe } from '@/components/RoomModules';
import { AddTaskForm, TaskGrid } from '@/components/TaskRow';
import { Btn, Card, EmptyMsg, SecHead, T, Tabs } from '@/components/ui';
import { TYPES } from '@/domain/constants';
import { doneToday, sortByDue, statusIn } from '@/domain/logic';
import type { Task } from '@/domain/types';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';

type Tab = 'isler' | 'dolap' | 'kombin' | 'buzdolabi' | 'eksik' | 'tarif' | 'malzeme' | 'bitki';

/**
 * Bir odanın içindekiler, sekme sekme: önce işler (kare kare), sonra odaya özel bölümler
 * (dolap, kombin, buzdolabı, eksikler, tarif, malzemeler, bitkiler). Bir anda tek bölüm görünür,
 * böylece uzun bir sayfayı aşağı kaydırmak gerekmez.
 */
export function RoomBody({ rid }: { rid: string }) {
  const { state: S } = useStore();
  const now = useNow();
  const [tab, setTab] = useState<Tab>('isler');
  // Kombin önerisi: son fotoğraftaki parçalar ya da seçilen parça. Dolap ve Kombin sekmeleri paylaşır.
  const [look, setLook] = useState<PhotoLook | null>(null);
  const [anchor, setAnchor] = useState<string[]>([]);
  const r = S.rooms[rid];
  if (!r) return null;
  const mod = TYPES[r.type].mod;
  const tasks = sortByDue(S.tasks[r.id] || []);
  const waiting = (arr: Task[]) => arr.filter(t => statusIn(S, t, now).k !== 'ok' && !doneToday(t, now)).length;
  const stock = S.mod[r.id]?.stock ?? [];
  const missing = stock.filter(x => x.lvl !== 'var').length;
  const dirty = (S.mod[r.id]?.wardrobe ?? []).filter(x => x.state === 'kirli').length;

  const tabs: { k: Tab; emoji: string; label: string; badge?: number }[] = [{ k: 'isler', emoji: '🧹', label: 'İşler', badge: waiting(tasks) }];
  if (mod === 'gardirop')
    tabs.push({ k: 'dolap', emoji: '👕', label: 'Dolap', badge: dirty >= 3 ? dirty : undefined }, { k: 'kombin', emoji: '✨', label: 'Kombin' });
  if (mod === 'buzdolabi')
    tabs.push({ k: 'buzdolabi', emoji: '🧊', label: 'Buzdolabı' }, { k: 'eksik', emoji: '🛒', label: 'Eksikler', badge: missing }, { k: 'tarif', emoji: '🍲', label: 'Tarif' });
  if (mod === 'stok') tabs.push({ k: 'malzeme', emoji: '🧴', label: 'Malzeme', badge: missing });
  if (mod === 'bitki') tabs.push({ k: 'bitki', emoji: '🪴', label: 'Bitkiler', badge: waiting(S.mod[r.id]?.plants ?? []) });
  const cur = tabs.some(t => t.k === tab) ? tab : 'isler';
  const toKombin = (ids: string[], l: PhotoLook | null = null) => {
    setAnchor(ids);
    setLook(l);
    setTab('kombin');
  };

  return (
    <View style={{ gap: 14 }}>
      {tabs.length > 1 && <Tabs items={tabs} value={cur} onChange={setTab} />}

      {cur === 'isler' && (
        <Card key="isler">
          <SecHead title="🧹 Odanın işleri" right={tasks.length ? `${tasks.length} iş` : undefined} />
          <TaskGrid tasks={tasks} rid={r.id} list="tasks" />
          {!tasks.length && <EmptyMsg>Henüz iş yok. Aşağıdan ekle.</EmptyMsg>}
          {tasks.length > 0 && <T v="tiny">Bir işe dokun: tamamlandı ✨ Basılı tut: ertele, sıklık, sil.</T>}
          <AddTaskForm rid={r.id} list="tasks" placeholder="Yeni iş, ör. Perde yıkama" />
        </Card>
      )}
      {cur === 'dolap' && (
        <View key="dolap" style={{ gap: 14 }}>
          {anchor.length > 0 && <Btn kind="primary" label="✨ Seçtiğin parçayla kombinlere bak" onPress={() => setTab('kombin')} block />}
          <Wardrobe rid={r.id} anchor={anchor} onAnchor={ids => toKombin(ids)} onLook={l => toKombin(l.ids, l)} />
        </View>
      )}
      {cur === 'kombin' && (
        <View key="kombin" style={{ gap: 14 }}>
          <Outfits rid={r.id} look={look} anchor={anchor} onClear={() => { setAnchor([]); setLook(null); }} />
          <OutfitPlan rid={r.id} />
        </View>
      )}
      {cur === 'buzdolabi' && <Fridge key="buzdolabi" rid={r.id} />}
      {cur === 'eksik' && <Stock key="eksik" rid={r.id} title="🛒 Ne var, ne eksik?" placeholder="Ürün ekle, ör. Zeytin" />}
      {cur === 'tarif' && <Recipes key="tarif" rid={r.id} />}
      {cur === 'malzeme' && (
        <Stock key="malzeme" rid={r.id} title={r.type === 'banyo' ? '🧴 Banyo malzemeleri' : '🧴 Malzemeler'} placeholder="Malzeme ekle, ör. Diş fırçası" />
      )}
      {cur === 'bitki' && <Plants key="bitki" rid={r.id} />}
    </View>
  );
}
