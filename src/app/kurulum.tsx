import { useRouter } from 'expo-router';

import { PlanEditor } from '@/components/PlanEditor';
import { useToast } from '@/components/Toast';
import { Btn } from '@/components/ui';
import { cancelNewHome } from '@/domain/homes';
import { requestPermission, rescheduleMorningSummaries } from '@/notifications/schedule';
import { useStore } from '@/store/AppStore';

/** İlk açılış: evini bloklarla kur, sonra evle ilgili soruları cevapla (`/evim`). */
export default function Kurulum() {
  const router = useRouter();
  const toast = useToast();
  const { state: S, update } = useStore();
  const extra = S.others.length > 0;
  return (
    <PlanEditor
      onSaved={(_first, next) => {
        // Plandan sonra evle ilgili birkaç soru; cevaplara göre rutinler gelir. Yeni bir ek evde de aynı sorular sorulur.
        router.replace({ pathname: '/evim', params: { ilk: '1' } });
        if (extra) toast(`${next.homeName} hazır 🏡 Evler arasında Hesabım > Evlerim'den geçebilirsin.`);
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
