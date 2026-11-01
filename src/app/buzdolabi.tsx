import { FeatureRoom } from '@/components/FeatureRoom';
import { BackLink, Screen, T } from '@/components/ui';

export default function BuzdolabiScreen() {
  return (
    <Screen header={false}>
      <BackLink />
      <T v="eyebrow">Buzdolabı</T>
      <T v="h1">Ürünler, eksikler ve tarifler burada 🧊</T>
      <FeatureRoom mod="buzdolabi" />
    </Screen>
  );
}
