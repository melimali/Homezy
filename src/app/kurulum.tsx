import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { PlanEditor } from '@/components/PlanEditor';
import { useToast } from '@/components/Toast';
import { Btn } from '@/components/ui';
import { cancelNewHome } from '@/domain/homes';
import { track } from '@/lib/events';
import { getPermission, requestPermission, rescheduleMorningSummaries } from '@/notifications/schedule';
import { useStore } from '@/store/AppStore';
import { useTranslation } from '@/i18n/i18n';

/** İlk açılış: evini bloklarla kur, sonra evle ilgili soruları cevapla (`/evim`). */
export default function Kurulum() {
  const router = useRouter();
  const toast = useToast();
  const { t: tr } = useTranslation();
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
        // Sabah özeti için izin: önce neden istediğimizi anlat, sonra sistem penceresi.
        const enable = () =>
          requestPermission()
            .then(ok => (ok ? rescheduleMorningSummaries(next) : undefined))
            .catch(() => {});
        getPermission()
          .then(p => {
            if (p === 'granted') return enable();
            if (p !== 'undetermined') return;
            setTimeout(
              () =>
                Alert.alert(
                  tr('Sabah özeti göndereyim mi? ☀️'),
                  tr('Her sabah o günün işlerini tek bildirimle hatırlatırım. Saati ve türleri Bildirimler sekmesinden değiştirebilirsin.'),
                  [
                    { text: tr('Şimdi değil'), style: 'cancel' },
                    { text: tr('Olur'), onPress: () => void enable() },
                  ],
                ),
              1500,
            );
          })
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
