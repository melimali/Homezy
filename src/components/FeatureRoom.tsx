import { useStore } from '@/store/AppStore';
import { Btn, Card, T } from '@/components/ui';
import { RoomBody } from '@/components/RoomBody';
import { useToast } from '@/components/Toast';
import { findRoom, roomFor } from '@/domain/logic';

/** Ben sekmesinden açılan gardırop / buzdolabı: odadakiyle aynı bölümler (RoomBody), oda çizilmemişse tek tıkla açılır. */
export function FeatureRoom({ mod }: { mod: 'gardirop' | 'buzdolabi' }) {
  const { state: S, update } = useStore();
  const toast = useToast();
  const rid = findRoom(S, mod);
  if (rid) return <RoomBody key={rid} rid={rid} initial={mod === 'gardirop' ? 'dolap' : 'buzdolabi'} />;
  const open = () => {
    let ok = true;
    update(D => { ok = !!roomFor(D, mod); });
    if (!ok) toast('Açılamadı, tekrar dene.');
  };
  return (
    <Card>
      <T v="h3">{mod === 'gardirop' ? 'Gardırop için oda çizmedin' : 'Buzdolabı için mutfak çizmedin'}</T>
      <T v="small">Sorun değil, senin için bir bölge açalım. Yurt ya da tek odalı evde de kullanabilirsin.</T>
      <Btn kind="primary" label={mod === 'gardirop' ? '👕 Gardırobu aç' : '🧊 Buzdolabını aç'} onPress={open} block />
    </Card>
  );
}
