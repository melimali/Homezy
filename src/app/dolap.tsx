import { FeatureRoom } from '@/components/FeatureRoom';
import { BackLink, Screen, T } from '@/components/ui';

export default function DolapScreen() {
  return (
    <Screen header={false}>
      <BackLink />
      <T v="eyebrow">Gardırop</T>
      <T v="h1">Kıyafetlerin, çamaşır ve kombin burada 👕</T>
      <FeatureRoom mod="gardirop" />
    </Screen>
  );
}
