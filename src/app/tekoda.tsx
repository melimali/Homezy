import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Appear, Squish } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { BackLink, Btn, Card, Screen, T } from '@/components/ui';
import { ROOM_EMOJI } from '@/domain/constants';
import { soloRoom } from '@/domain/logic';
import { useStore } from '@/store/AppStore';
import { radius, useColors } from '@/theme';

/** Tek oda modu: sadece seçilen odanın işleri görünür (genç, yurt, kiralık oda). Kapatınca bütün ev geri gelir. */
export default function TekOda() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const { state: S, update } = useStore();
  const cur = soloRoom(S);

  const pick = (id: string | null) => {
    update(D => {
      D.settings.solo = id;
    });
    toast(id ? 'Tek oda modu açık 🚪' : 'Bütün ev geri geldi 🏡');
    router.back();
  };

  return (
    <Screen header={false}>
      <BackLink label="Geri" />
      <T v="h1">Tek oda modu</T>
      <T v="small">Sadece kendi odanın işlerini görürsün. Diğer odalar ve ev işleri gizlenir, silinmez.</T>
      <View style={{ gap: 10 }}>
        {S.order.filter(id => S.rooms[id]).map((id, i) => {
          const r = S.rooms[id];
          const on = cur === id;
          return (
            <Appear key={id} index={i}>
              <Squish
                onPress={() => pick(id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.tile, backgroundColor: on ? c.accent : c.surface, borderWidth: 1, borderColor: c.line }}
              >
                <T v="h2">{ROOM_EMOJI[r.type]}</T>
                <T v="h3" style={{ flex: 1 }}>{r.name}</T>
                {on && <T v="h3">✓</T>}
              </Squish>
            </Appear>
          );
        })}
      </View>
      {cur && <Btn label="Modu kapat, bütün evi göster" onPress={() => pick(null)} />}
    </Screen>
  );
}
