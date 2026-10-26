import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { uid } from '@/domain/logic';
import { weekOutfits } from '@/domain/outfits';
import { dayTs } from '@/domain/play';
import { suggestRecipes, titleCase } from '@/domain/recipes';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import { fonts, useColors } from '@/theme';

import { PremiumLock } from './PremiumLock';
import { useToast } from './Toast';
import { Btn, Card, EmptyMsg, SecHead, T } from './ui';

/** Premium: mutfaktaki ürünlerle (Var / Az) yapılabilecek tarifler. Eksikler tek dokunuşla listeye eklenir. */
export function Recipes({ rid }: { rid: string }) {
  const c = useColors();
  const toast = useToast();
  const { state, update } = useStore();
  const { premium } = usePurchases();
  const [open, setOpen] = useState<string | null>(null);
  if (!premium.active)
    return (
      <PremiumLock emoji="🍳" title="Bugün ne pişirsem?" text="Buzdolabında olanlara göre tarif önereyim, eksik malzemeleri alışveriş listene ekleyeyim." />
    );
  const stock = state.mod[rid]?.stock ?? [];
  const list = suggestRecipes(stock);

  const addMissing = (missing: string[]) => {
    update(D => {
      const st = (D.mod[rid].stock ||= []);
      for (const m of missing) {
        const name = titleCase(m);
        const ex = st.find(x => x.name.toLocaleLowerCase('tr-TR') === m);
        if (ex) ex.lvl = 'yok';
        else st.push({ id: uid(), name, lvl: 'yok' });
      }
    });
    toast(`${missing.map(titleCase).join(', ')} alışveriş listesine eklendi.`);
  };

  return (
    <Card>
      <SecHead title="Bugün ne pişirsem? 🍳" />
      {list.map(({ r, missing }, i) => (
        <View key={r.name} style={[styles.item, i > 0 && { borderTopWidth: 1.5, borderTopColor: c.line }]}>
          <Pressable onPress={() => setOpen(open === r.name ? null : r.name)} accessibilityRole="button" style={styles.head}>
            <Text style={{ fontSize: 24 }}>{r.emoji}</Text>
            <View style={{ flex: 1 }}>
              <T v="bold">{r.name}</T>
              <T v="small" style={{ color: missing.length ? c.warm : c.ok }}>
                {missing.length ? `Eksik: ${missing.map(titleCase).join(', ')}` : 'Her şey var ✓'} · {r.min} dk
              </T>
            </View>
            <Text style={{ color: c.muted, fontSize: 18 }}>{open === r.name ? '⌃' : '⌄'}</Text>
          </Pressable>
          {open === r.name && (
            <View style={{ gap: 8 }}>
              <T style={{ fontSize: 14 }}>{r.steps}</T>
              {missing.length > 0 && <Btn small label="Eksikleri listeye ekle 🛒" onPress={() => addMissing(missing)} style={{ alignSelf: 'flex-start' }} />}
            </View>
          )}
        </View>
      ))}
      {!list.length && <EmptyMsg>Elindeki ürünleri “Var” olarak işaretle, onlara göre tarif önereyim.</EmptyMsg>}
    </Card>
  );
}

/** Premium: dolaptaki temiz parçalarla önümüzdeki 7 günün kombin planı. */
export function OutfitPlan({ rid }: { rid: string }) {
  const c = useColors();
  const { state } = useStore();
  const { premium } = usePurchases();
  if (!premium.active)
    return <PremiumLock emoji="🧥" title="Haftalık kombin planı" text="Dolabındaki temiz kıyafetlerle her gün için kombin hazırlayayım; sabah ne giysem diye düşünme." />;
  const plan = weekOutfits(state.mod[rid]?.wardrobe ?? []);
  return (
    <Card>
      <SecHead title="Haftalık kombin planı 🧥" />
      {plan.map((d, i) => (
        <View key={d.day} style={[styles.day, i > 0 && { borderTopWidth: 1.5, borderTopColor: c.line }]}>
          <Text style={[styles.dayName, { color: i === 0 ? c.ok : c.muted }]}>
            {i === 0 ? 'Bugün' : new Date(dayTs(d.day)).toLocaleDateString('tr-TR', { weekday: 'short' })}
          </Text>
          <T style={{ flex: 1, fontSize: 14 }}>{d.pieces.map(p => p.name).join(' + ')}</T>
        </View>
      ))}
      {!plan.length && <EmptyMsg>Plan için dolapta temiz en az bir üst ve bir alt (ya da elbise) olmalı.</EmptyMsg>}
      <T v="tiny">Kirli ya da ütülenecek parçalar plana girmez; durumları değişince plan yenilenir.</T>
    </Card>
  );
}

const styles = StyleSheet.create({
  item: { paddingVertical: 10, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  day: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  dayName: { width: 48, fontFamily: fonts.bodyBlack, fontSize: 13 },
});
