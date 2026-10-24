import { useRouter } from 'expo-router';
import { useEffect, useRef, type ComponentRef } from 'react';
import type { View } from 'react-native';

import { BackLink, Btn, Screen, T } from '@/components/ui';
import { WeekCard } from '@/components/WeekCard';
import { weekSummary } from '@/domain/logic';
import { weekShareText } from '@/domain/messages';
import { dayKey, progressOf } from '@/domain/play';
import { themeFor } from '@/domain/premium';
import { useNow } from '@/hooks/useNow';
import { shareCard } from '@/lib/share';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';

/** Haftalık özet: son 7 günün kartı, tek dokunuşla görsel olarak paylaşılır. */
export default function Hafta() {
  const router = useRouter();
  const now = useNow();
  const { state: S, update } = useStore();
  const { premium } = usePurchases();
  const card = useRef<ComponentRef<typeof View>>(null);
  const today = dayKey(now);
  const seen = S.play.weekSeen;

  // Açılınca ana ekrandaki "özetin hazır" şeridi kalksın.
  useEffect(() => {
    if (seen !== today) update(D => void (D.play.weekSeen = today));
  }, [seen, today, update]);

  const share = () => {
    const sum = weekSummary(S, now);
    void shareCard(card, weekShareText({ done: sum.done, days: sum.days, streak: progressOf(S.play, now).streak }));
  };

  return (
    <Screen header={false}>
      <BackLink />
      <T v="h1">Haftan 📅</T>
      <WeekCard ref={card} state={S} now={now} theme={themeFor(S.settings.theme, premium.active)} />
      <Btn kind="primary" label="📤 Paylaş" onPress={share} block />
      <Btn label="🎬 Evimin hikâyesi" onPress={() => router.push('/hikaye')} block />
      <T v="small" style={{ textAlign: 'center' }}>Kartı Instagram hikâyende ya da WhatsApp’ta paylaş, arkadaşların da evini toplasın 🏡</T>
    </Screen>
  );
}
