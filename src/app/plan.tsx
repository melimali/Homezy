import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { PlanEditor } from '@/components/PlanEditor';
import { useToast } from '@/components/Toast';
import { Btn, Card, T } from '@/components/ui';
import { PROFILE } from '@/domain/home';
import { emptyState } from '@/domain/logic';
import { rescheduleMorningSummaries } from '@/notifications/schedule';
import { useStore } from '@/store/AppStore';
import { deleteHome } from '@/sync/cloud';

/** Plan sekmesi: ev planını düzenle. */
export default function PlanTab() {
  const router = useRouter();
  const toast = useToast();
  return (
    <PlanEditor
      onSaved={() => {
        router.navigate('/odalar');
        toast('Plan kaydedildi.');
      }}
      footer={
        <>
          <HomeInfo />
          <DeleteHome />
        </>
      }
    />
  );
}

/** Kurulum sorularının cevapları ve ev bakımı; buradan değiştirilir. */
function HomeInfo() {
  const router = useRouter();
  const { state: S } = useStore();
  const yes = PROFILE.filter(p => S.home[p.k]);
  return (
    <Card>
      <T v="bold">Evim hakkında 🏡</T>
      <T style={{ fontSize: 14 }}>
        {S.home.asked
          ? yes.length ? yes.map(p => `${p.emoji} ${p.short}`).join(' · ') : 'Hiçbirine "evet" demedin.'
          : 'Evcil hayvan, bulaşık makinesi, halı, kombi, klima, su arıtma, bitki: cevaplarına göre rutinler gelir.'}
      </T>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Btn small kind="primary" label={S.home.asked ? 'Cevapları değiştir' : 'Soruları cevapla'} onPress={() => router.push('/evim')} />
        <Btn small label="Ev bakımı ve faturalar" onPress={() => router.push('/bakim')} />
      </View>
    </Card>
  );
}

/**
 * Evi tamamen siler: odalar, rutinler, gardırop, stoklar gider; bildirim ayarları, puan, seri ve günlük kalır.
 * Ev kurulmamış sayıldığı için uygulama "Evini bloklarla kur" ekranına döner.
 */
function DeleteHome() {
  const router = useRouter();
  const { state: S, replace } = useStore();
  const { status, user } = useAuth();
  const toast = useToast();
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(t);
  }, [armed]);

  const del = () => {
    if (!armed) return setArmed(true);
    // Diğer evler (Premium) ve açık evin adı yerinde kalır; sadece bu evin içi silinir.
    const fresh = {
      ...emptyState(), cols: S.cols, rows: S.rows, cells: Array(S.cols * S.rows).fill(null), settings: S.settings, play: { ...S.play, placed: {} },
      homeId: S.homeId, homeName: S.homeName, others: S.others,
    };
    deleteHome(status === 'account' ? user?.id : undefined, fresh).catch(e => console.warn('Homezy: buluttaki ev silinemedi', e));
    rescheduleMorningSummaries(fresh).catch(() => {});
    replace(fresh);
    // Ekranlar yeni duruma göre açılıp kapandıktan sonra kurulum ekranına geç.
    setTimeout(() => router.replace('/kurulum'), 0);
    toast('Evin silindi. Yenisini birlikte çizelim 🏡');
  };

  return (
    <Card>
      <T v="bold">Evi sil ve baştan kur 🏚️</T>
      <T style={{ fontSize: 14 }}>
        Bütün odalar, rutinler, gardırop ve stoklar silinir. Hesabında tek bir ev durur; yenisini çizdiğinde onun yerine geçer.
      </T>
      <View>
        <Btn label={armed ? 'Emin misin? Tekrar dokun' : 'Evi sil'} kind={armed ? 'danger' : 'soft'} onPress={del} />
      </View>
    </Card>
  );
}
