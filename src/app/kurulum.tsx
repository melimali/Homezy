import { useRouter } from 'expo-router';

import { PlanEditor } from '@/components/PlanEditor';
import { useToast } from '@/components/Toast';
import { requestPermission, rescheduleMorningSummaries } from '@/notifications/schedule';

/** İlk açılış: evini bloklarla kur. */
export default function Kurulum() {
  const router = useRouter();
  const toast = useToast();
  return (
    <PlanEditor
      onSaved={(_first, next) => {
        router.replace('/');
        toast('Evin hazır. Odalara dokunarak işleri gör.');
        // Sabah özeti için izni ev kurulduktan hemen sonra istiyoruz.
        requestPermission()
          .then(ok => (ok ? rescheduleMorningSummaries(next) : undefined))
          .catch(() => {});
      }}
    />
  );
}
