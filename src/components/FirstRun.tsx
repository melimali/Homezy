import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MokaMascot } from '@/components/MokaMascot';
import { StepModal } from '@/components/StepModal';
import { Btn, T } from '@/components/ui';
import { progressOf } from '@/domain/play';
import { useNow } from '@/hooks/useNow';
import { flag, useStep } from '@/lib/firstRun';
import { getPermission, requestPermission, rescheduleMorningSummaries } from '@/notifications/schedule';
import { useStore } from '@/store/AppStore';
import { radius, useColors } from '@/theme';

/** Evi kurduktan sonra ana ekranda Moka'nın tek seferlik karşılaması. Sıradaki ilk pencere. */
export function FirstWelcome() {
  const c = useColors();
  const { state: S } = useStore();
  // Zaten gün geçirmiş (güncelleme sonrası) kullanıcıya karşılama gösterilmez.
  const fresh = S.setup && S.play.days.length === 0 && !flag.has('welcome');
  useEffect(() => {
    if (S.setup && S.play.days.length > 0) flag.set('welcome');
  }, [S.setup, S.play.days.length]);
  const [done, setDone] = useState(false);
  const shown = useStep('welcome', fresh && !done);
  if (!shown) return null;
  return (
    <StepModal onClose={() => { flag.set('welcome'); setDone(true); }}>
      {dismiss => (
        <View style={[styles.box, { backgroundColor: c.surface }]}>
          <MokaMascot pose="happy" size="lg" showBubble={false} style={styles.moka} />
          <T v="h1" style={{ textAlign: 'center' }}>Hoş geldin! 🏡</T>
          <T v="lead" style={{ textAlign: 'center', marginTop: 0 }}>
            Ben Moka. Evin hazır; her gün birkaç minik işle onu birlikte güzelleştireceğiz.
          </T>
          <Btn kind="primary" label="Başlayalım" onPress={dismiss} block />
        </View>
      )}
    </StepModal>
  );
}

/** Sabah özeti izni: ilk iş yapılınca, neden istediğimizi anlatarak sorulur (kurulumda sorulmaz). */
export function NotifAsk() {
  const c = useColors();
  const now = useNow();
  const { state: S } = useStore();
  const [perm, setPerm] = useState<string | null>(null);
  const [done, setDone] = useState(() => flag.has('notif'));
  const yes = useRef(false);
  const earned = progressOf(S.play, now).today;
  useEffect(() => {
    if (done || !earned) return;
    getPermission()
      .then(p => {
        if (p === 'undetermined') setPerm(p);
        else {
          flag.set('notif');
          setDone(true);
        }
      })
      .catch(() => {});
  }, [done, earned]);
  const shown = useStep('notif', !done && earned && perm === 'undetermined');
  if (!shown) return null;
  const finish = () => {
    flag.set('notif');
    setDone(true);
    if (yes.current)
      requestPermission()
        .then(ok => (ok ? rescheduleMorningSummaries(S) : undefined))
        .catch(() => {});
  };
  return (
    <StepModal onClose={finish}>
      {dismiss => (
        <View style={[styles.box, { backgroundColor: c.surface }]}>
          <MokaMascot pose="happy" size="lg" showBubble={false} style={styles.moka} />
          <T v="h1" style={{ textAlign: 'center' }}>Sabah özeti göndereyim mi? ☀️</T>
          <T v="lead" style={{ textAlign: 'center', marginTop: 0 }}>
            Her sabah o günün işlerini tek bildirimle hatırlatırım. Saati ve türleri Bildirimler sekmesinden değiştirebilirsin.
          </T>
          <Btn kind="primary" label="Olur" onPress={() => { yes.current = true; dismiss(); }} block />
          <Btn kind="ghost" label="Şimdi değil" onPress={dismiss} block />
        </View>
      )}
    </StepModal>
  );
}

const styles = StyleSheet.create({
  moka: { marginTop: -90 },
  box: { borderRadius: radius.card, padding: 24, paddingTop: 0, marginTop: 80, gap: 14, alignItems: 'center', maxWidth: 420, width: '100%' },
});
