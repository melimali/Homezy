import { useRouter } from 'expo-router';

import { PlanEditor } from '@/components/PlanEditor';
import { useToast } from '@/components/Toast';
import { Btn } from '@/components/ui';
import { cancelNewHome } from '@/domain/homes';
import { track } from '@/lib/events';
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
        // 7 soru ilk değeri geciktirmesin: doğrudan eve gidilir, sorular Bugün'deki karttan (ya da Plan'dan) cevaplanır.
        router.replace('/');
        if (!extra) track('onboarding_done');
        if (!extra) toast('Evin hazır 🏡 Bugün sekmesinden ilk işini yap, Moka sevinsin!');
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
