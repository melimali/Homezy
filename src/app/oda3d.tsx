import { Redirect, useLocalSearchParams } from 'expo-router';

import { Room3D } from '@/components/Room3D';
import { BackLink, Screen } from '@/components/ui';
import { useStore } from '@/store/AppStore';

export default function Oda3D() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state: S } = useStore();
  if (!id || !S.rooms[id]) return <Redirect href="/" />;
  return (
    <Screen header={false}>
      <BackLink />
      <Room3D state={S} roomId={id} />
    </Screen>
  );
}
