import { useRouter } from '@/lib/nav';
import { View } from 'react-native';

import { MokaSprite } from '@/components/MokaSprite';
import { Btn, Card, SecHead, T } from '@/components/ui';
import { DAILY_PLAYS, playsToday } from '@/domain/flap';
import { dayKey } from '@/domain/play';
import { useStore } from '@/store/AppStore';

/** Bugünün işleri bitince görünen "Biraz eğlenelim" kartı. */
export function FunCard() {
  const router = useRouter();
  const { state: S } = useStore();
  const fun = S.play.growth.fun;
  const left = DAILY_PLAYS - playsToday(fun, dayKey());
  return (
    <Card bare>
      <SecHead title="Biraz eğlenelim 🎮" h="h3" />
      <View style={{ alignItems: 'center', gap: 6 }}>
        <MokaSprite anim="party" size={90} />
        <T v="small" style={{ textAlign: 'center' }}>Moka Uçuş: fincan sütunlarının arasından geç. En iyi: {fun?.best ?? 0}</T>
        <Btn kind="primary" label={left > 0 ? 'Oyna' : 'Yarın tekrar'} disabled={left <= 0} onPress={() => router.push('/eglence' as never)} />
      </View>
    </Card>
  );
}
