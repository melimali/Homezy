import { useRef, type ComponentRef } from 'react';
import type { View } from 'react-native';

import { displayName, useAuth } from '@/auth/AuthProvider';
import { DayCard } from '@/components/DayCard';
import { BackLink, Btn, Screen, T } from '@/components/ui';
import { useNow } from '@/hooks/useNow';
import { shareCard } from '@/lib/share';
import { useStore } from '@/store/AppStore';

/** "Moka ile günüm": günün kartı, tek dokunuşla görsel olarak paylaşılır. */
export default function Gunum() {
  const now = useNow();
  const { state: S } = useStore();
  const { user } = useAuth();
  const name = displayName(user);
  const card = useRef<ComponentRef<typeof View>>(null);
  return (
    <Screen header={false}>
      <BackLink />
      <T v="h1">Günüm 🌤️</T>
      <DayCard ref={card} state={S} now={now} name={name === 'Misafir' ? undefined : name} />
      <Btn kind="primary" label="📤 Paylaş" onPress={() => void shareCard(card, 'Moka ile günüm 🏡 Homezy ile her gün minik bir iş, evin büyüsün.')} block />
    </Screen>
  );
}
