import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Appear } from '@/components/motion';
import { BackLink, EmptyMsg, Field, ListRow, Screen, SecHead, T } from '@/components/ui';
import { searchAll, type Hit } from '@/domain/search';
import { useRouter } from '@/lib/nav';
import { useStore } from '@/store/AppStore';

/** Genel arama: rutinler, ürünler, kıyafetler, bitkiler, evcil hayvanlar, alışveriş ve odalar tek yerde. */
export default function Ara() {
  const router = useRouter();
  const { state: S } = useStore();
  const [q, setQ] = useState('');
  const hits = useMemo(() => searchAll(S, q), [S, q]);
  const groups = useMemo(() => {
    const m = new Map<Hit['group'], Hit[]>();
    for (const h of hits) m.set(h.group, [...(m.get(h.group) ?? []), h]);
    return [...m];
  }, [hits]);
  const typed = q.trim().length >= 2;

  return (
    <Screen header={false}>
      <BackLink />
      <T v="h1">Ara 🔎</T>
      <Field
        value={q}
        onChangeText={setQ}
        placeholder="İş, ürün, kıyafet, bitki, evcil hayvan…"
        accessibilityLabel="Ara"
        autoFocus
        returnKeyType="search"
        autoCorrect={false}
        maxLength={40}
      />
      {!typed && <T v="small">En az iki harf yaz. Telefondaki bütün kayıtlarda aranır.</T>}
      {typed && hits.length === 0 && <EmptyMsg>Bir şey bulunamadı.</EmptyMsg>}
      {groups.map(([g, xs]) => (
        <View key={g}>
          <SecHead title={g} right={String(xs.length)} h="h3" />
          {xs.map((h, i) => (
            <Appear key={h.id} index={i}>
              <ListRow icon={h.emoji} title={h.title} sub={h.sub} onPress={() => router.push(h.url as never)} />
            </Appear>
          ))}
        </View>
      ))}
    </Screen>
  );
}
