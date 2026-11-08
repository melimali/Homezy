import { View } from 'react-native';

import { Btn, Card, SecHead, T } from '@/components/ui';
import { shopLeft } from '@/domain/shopping';
import { useRouter } from '@/lib/nav';
import { useStore } from '@/store/AppStore';

/** Ev sekmesinde alışveriş listesi kartı: kaç ürün bekliyor, listeyi aç. */
export function ShopCard() {
  const router = useRouter();
  const { state: S } = useStore();
  const left = shopLeft(S);
  return (
    <Card>
      <SecHead title="🛒 Alışveriş listem" right={left ? `${left} ürün` : undefined} />
      <T v="small">{left ? S.shop.filter(i => !i.done).slice(0, 4).map(i => i.name).join(', ') + (left > 4 ? '…' : '') : 'Liste boş. Eksikleri buraya yaz, markette unutma.'}</T>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn small kind={left ? 'soft' : 'primary'} label={left ? 'Listeyi aç ›' : '+ Ürün ekle'} onPress={() => router.push('/alisveris' as never)} />
      </View>
    </Card>
  );
}
