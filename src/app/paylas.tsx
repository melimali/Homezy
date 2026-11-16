import { useRef, type ComponentRef } from 'react';
import { View } from 'react-native';

import { HouseShareCard } from '@/components/HouseShareCard';
import { BackLink, Btn, Screen, T } from '@/components/ui';
import { useNow } from '@/hooks/useNow';
import { shareCard } from '@/lib/share';
import { useStore } from '@/store/AppStore';
import { ForceScheme } from '@/theme';

/** "Evimi paylaş": ev kartı (her zaman açık temada, görsel olarak hep aynı görünsün) ve paylaş düğmesi. */
export default function Paylas() {
  const { state } = useStore();
  const now = useNow();
  const card = useRef<ComponentRef<typeof View>>(null);
  return (
    <Screen header={false}>
      <BackLink />
      <T v="h1">Evimi paylaş 📤</T>
      <T v="lead">Arkadaşlarına evinin kartını gönder.</T>
      <ForceScheme scheme="light">
        <HouseShareCard ref={card} state={state} now={now} />
      </ForceScheme>
      <Btn kind="primary" block label="Evimi paylaş 📤" onPress={() => void shareCard(card, "Moka'yla evim büyüyor 🏡 Homezy ile her gün minik bir iş, evin büyüsün.")} />
    </Screen>
  );
}
