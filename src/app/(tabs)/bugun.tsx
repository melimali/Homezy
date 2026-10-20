import { View } from 'react-native';

import { ShopList } from '@/components/ShopList';
import { TaskRow } from '@/components/TaskRow';
import { Card, EmptyMsg, Screen, SecHead, T } from '@/components/ui';
import { allTasks, fmtLong, shopItems } from '@/domain/logic';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';

export default function Bugun() {
  const { state: S } = useStore();
  const now = useNow();
  const all = allTasks(S, now).sort((a, b) => a.s.diff - b.s.diff);
  const groups: [string, typeof all][] = [
    ['Gecikenler', all.filter(x => x.s.k === 'late')],
    ['Bugün', all.filter(x => x.s.k === 'today')],
    ['Bu hafta', all.filter(x => x.s.k === 'ok' && x.s.diff <= 7)],
  ];
  const later = all.filter(x => x.s.k === 'ok' && x.s.diff > 7).length;
  const shop = shopItems(S).map(s => s.x);
  const visible = groups.filter(g => g[1].length);

  return (
    <Screen>
      <View>
        <T v="eyebrow">{fmtLong(now)}</T>
        <T v="h1">Yapılacaklar</T>
      </View>
      {visible.map(([label, arr]) => (
        <Card key={label}>
          <SecHead title={label} right={String(arr.length)} />
          <View>
            {arr.map((x, i) => (
              <TaskRow key={x.t.id} t={x.t} rid={x.rid} list={x.list} showRoom first={i === 0} />
            ))}
          </View>
        </Card>
      ))}
      {!visible.length && (
        <Card>
          <EmptyMsg>Önümüzdeki hafta için iş yok.</EmptyMsg>
        </Card>
      )}
      {later > 0 && <T v="small" style={{ textAlign: 'center' }}>Bir haftadan sonra {later} iş daha var.</T>}
      {shop.length > 0 && (
        <Card>
          <ShopList items={shop} title="Alınacaklar" h="h2" />
        </Card>
      )}
    </Screen>
  );
}
