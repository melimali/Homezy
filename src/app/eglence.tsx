import { useState } from 'react';
import { View } from 'react-native';

import { FlapResult, MokaFlap } from '@/components/MokaFlap';
import { BackLink, Card, Screen, T } from '@/components/ui';
import { DAILY_PLAYS, playsToday } from '@/domain/flap';
import { dayKey } from '@/domain/play';
import { useStore } from '@/store/AppStore';

/** Biraz eğlenelim: Moka Uçuş. Puan, XP ya da seri vermez; günde 3 oyun. */
export default function Eglence() {
  const { state: S, update } = useStore();
  const day = dayKey();
  const fun = S.play.growth.fun;
  const best = fun?.best ?? 0;
  const used = playsToday(fun, day);
  const [round, setRound] = useState(0);
  const [res, setRes] = useState<number | null>(null);

  const over = (score: number) => {
    setRes(score);
    update(d => {
      const f = d.play.growth.fun;
      const p = playsToday(f, day) + 1;
      d.play.growth.fun = { best: Math.max(f?.best ?? 0, score), day, plays: p };
    });
  };

  return (
    <Screen header={false}>
      <BackLink />
      <T v="h1">Biraz eğlenelim 🎮</T>
      <T v="small">Moka Uçuş: dokun, Moka kanat çırpsın; kahve fincanı sütunlarının arasından geç. Puan vermez, sadece keyif.</T>
      <Card>
        {used >= DAILY_PLAYS && res === null ? (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <T v="bold" style={{ textAlign: 'center' }}>3 oyun yeter, yarın görüşürüz 🌙</T>
            <T v="small">En iyi: {best}</T>
          </View>
        ) : res === null ? (
          <MokaFlap key={round} best={best} onOver={over} />
        ) : (
          <FlapResult score={res} best={Math.max(best, res)} left={DAILY_PLAYS - used} onRetry={() => { setRes(null); setRound(r => r + 1); }} />
        )}
      </Card>
      {used < DAILY_PLAYS && <T v="tiny" style={{ textAlign: 'center' }}>Bugün {used}/{DAILY_PLAYS} oyun</T>}
    </Screen>
  );
}
