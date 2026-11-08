import { Text, View } from 'react-native';

import { Btn, Card, SecHead, T } from '@/components/ui';
import { tx } from '@/i18n/runtime';
import { itemState, petEmoji, petsDue } from '@/domain/pets';
import { useNow } from '@/hooks/useNow';
import { useRouter } from '@/lib/nav';
import { useActs } from '@/profile/useActs';
import { useStore } from '@/store/AppStore';
import { useColors } from '@/theme';

/**
 * Ev sekmesinde evcil hayvan kartı. "Evde neler yaparsın?" sorusunda evcil hayvanı seçenlerde (ya da hayvan eklemiş
 * olanlarda) görünür: hayvanlar, bekleyen bakım işi sayısı ve ekleme düğmesi.
 */
export function PetsCard() {
  const c = useColors();
  const now = useNow();
  const router = useRouter();
  const acts = useActs();
  const { state: S } = useStore();
  if (!S.pets.length && !acts.includes('pet')) return null;
  const due = petsDue(S, now);
  const late = due.filter(d => d.s.k === 'late').length;
  return (
    <Card>
      <SecHead title="🐾 Evcil hayvanlarım" right={due.length ? `${due.length} ${tx('bekliyor')}` : undefined} />
      {!S.pets.length ? (
        <T v="small">Hayvanını ekle; mama, yıkama, aşı gibi işleri sen seç, vaktinde hatırlatayım.</T>
      ) : (
        <View style={{ gap: 8 }}>
          {S.pets.map(p => {
            const n = due.filter(d => d.pet.id === p.id);
            const nl = p.items.filter(i => itemState(i, now).k === 'late').length;
            return (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 24 }}>{petEmoji(p)}</Text>
                <T v="bold" style={{ flex: 1 }}>{p.name}</T>
                <T v="small" style={{ color: nl ? c.late : c.muted }}>{n.length ? `${n.length} iş${nl ? ' · gecikti' : ''}` : p.items.length ? 'Hepsi tamam ✓' : 'İş ekle'}</T>
              </View>
            );
          })}
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn small kind={S.pets.length ? 'soft' : 'primary'} label="+ Evcil hayvan ekle" onPress={() => router.push('/evcil?add=1' as never)} />
        {S.pets.length > 0 && <Btn small kind="ghost" label={late ? 'Bakım işleri ›' : 'Aç ›'} onPress={() => router.push('/evcil' as never)} />}
      </View>
    </Card>
  );
}
