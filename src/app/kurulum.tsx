import { useRouter } from 'expo-router';

import { PlanEditor } from '@/components/PlanEditor';
import { requestPermission, rescheduleMorningSummaries } from '@/notifications/schedule';

/** İlk açılış: evini bloklarla kur, sonra evle ilgili soruları cevapla (`/evim`). */
export default function Kurulum() {
  const router = useRouter();
  return (
    <PlanEditor
      onSaved={(_first, next) => {
        // Plandan sonra evle ilgili birkaç soru; cevaplara göre rutinler gelir.
        router.replace({ pathname: '/evim', params: { ilk: '1' } });
        // Sabah özeti için izni ev kurulduktan hemen sonra istiyoruz.
        requestPermission()
          .then(ok => (ok ? rescheduleMorningSummaries(next) : undefined))
          .catch(() => {});
      }}
    />
  );
}
