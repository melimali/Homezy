import { useRouter } from 'expo-router';

import { PlanEditor } from '@/components/PlanEditor';
import { useToast } from '@/components/Toast';
import { Btn } from '@/components/ui';
import { cancelNewHome } from '@/domain/homes';
import { requestPermission, rescheduleMorningSummaries } from '@/notifications/schedule';
import { useStore } from '@/store/AppStore';

/** İlk açılış: evini bloklarla kur. Premium'da yeni bir ev eklerken de burası açılır. */
export default function Kurulum() {
  const router = useRouter();
  const toast = useToast();
  const { state: S, update } = useStore();
  const extra = S.others.length > 0;
  return (
    <PlanEditor
      onSaved={(_first, next) => {
        router.replace('/');
        toast(extra ? `${next.homeName} hazır 🏡 Evler arasında Hesabım > Evlerim'den geçebilirsin.` : 'Evin hazır. Odalara dokunarak işleri gör.');
        // Sabah özeti için izni ev kurulduktan hemen sonra istiyoruz.
        requestPermission()
          .then(ok => (ok ? rescheduleMorningSummaries(next) : undefined))
          .catch(() => {});
      }}
      footer={
        extra ? (
          <Btn
            kind="ghost"
            label="Vazgeç, önceki evime dön"
            onPress={() => {
              update(cancelNewHome);
              setTimeout(() => router.replace('/'), 0);
            }}
          />
        ) : undefined
      }
    />
  );
}
