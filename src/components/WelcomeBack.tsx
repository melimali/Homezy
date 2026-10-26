import { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { TaskRow } from '@/components/TaskRow';
import { Btn, T } from '@/components/ui';
import { allTasks, quickPick } from '@/domain/logic';
import { taskMin } from '@/domain/home';
import { AWAY_DAYS, awayAhead, dayKey, progressOf } from '@/domain/play';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { radius, useColors } from '@/theme';

/**
 * Birkaç gün gelmeyene açılışta "tekrar hoş geldin". Ceza dili yok: tek bir minik iş önerilir,
 * o yapılınca tamirin başladığı söylenir. Günde en fazla bir kez çıkar.
 */
export function WelcomeBack() {
  const c = useColors();
  const now = useNow();
  const { state: S, update } = useStore();
  const today = dayKey(now);
  const hp = progressOf(S.play, now);
  // Açıldığı andaki durum ve önerilen iş bir kere alınır: iş yapılınca kart kapanmasın, "tamir başladı" desin.
  const [first] = useState(() => {
    const away = awayAhead(S.play, 0, now);
    const open = !hp.today && away != null && away >= AWAY_DAYS && S.play.welcomed !== today;
    const pick = quickPick(S, 15, now)[0] ?? [...allTasks(S, now)].sort((a, b) => taskMin(a.t) - taskMin(b.t))[0] ?? null;
    return { open, away, hurt: hp.idle >= 3, pick };
  });
  const { open, away, hurt, pick } = first;
  if (!open || S.play.welcomed === today) return null;

  const close = () => void update(D => void (D.play.welcomed = today));
  return (
    <Modal transparent animationType="fade" onRequestClose={close}>
      <View style={[styles.bg, { backgroundColor: c.shadow }]}>
        <View style={[styles.box, { backgroundColor: c.surface }]}>
          <Text style={{ fontSize: 52, textAlign: 'center' }}>{hp.today ? '🔨🏡' : '🤗'}</Text>
          <T v="h1" style={{ textAlign: 'center' }}>{hp.today ? 'Onarım başladı!' : 'Hayattasın, hoş geldin!'}</T>
          <T v="lead" style={{ textAlign: 'center', marginTop: 0 }}>
            {hp.today
              ? 'Harika bir dönüş 💛 Sığınak her gün bir parça daha onarılacak. Yarın da minik bir görevle devam edelim.'
              : hurt
                ? `${away} gündür telsizden ses yoktu, barikatlar biraz yıprandı. Dert etme, ceza yok: kaldığın yerden devam ediyoruz.`
                : `${away} gündür yoktun, sığınak seni bekliyordu. Kaldığın yerden devam edelim.`}
          </T>
          {!hp.today && pick && (
            <View style={{ alignSelf: 'stretch', gap: 6 }}>
              <T v="eyebrow" style={{ textAlign: 'center', marginBottom: 0 }}>Bugün sadece bunu yap</T>
              <TaskRow t={pick.t} rid={pick.rid} list={pick.list} showRoom first />
            </View>
          )}
          <Btn kind={hp.today ? 'primary' : 'ghost'} label={hp.today ? 'Hayatta kalıyoruz!' : 'Sonra'} onPress={close} block />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  box: { borderRadius: radius.card, padding: 22, gap: 14, alignItems: 'center', maxWidth: 420, width: '100%' },
});
