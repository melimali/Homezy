import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSegments } from 'expo-router';

import { MokaMascot } from '@/components/MokaMascot';
import { StepModal } from '@/components/StepModal';
import { Btn, T } from '@/components/ui';
import type { MokaPose } from '@/constants/moka';
import { flag, useStep } from '@/lib/firstRun';
import { radius, useColors } from '@/theme';

/** Sekmeye ilk girişte çıkan kısa tanıtım. Ben sekmesinin kendi turu var (BenTour). Metinler Türkçe; EN sözlükte. */
const INTRO: Record<string, { title: string; text: string; pose: MokaPose }> = {
  index: { title: 'Ev', text: 'Burası evin. Odalarına dokun, bekleyen işleri gör.', pose: 'happy' },
  bugun: { title: 'Bugün', text: 'Bugünün işleri burada. Dokun, yap, işaretle.', pose: 'cozy_plant' },
  gelisim: { title: 'Gelişim', text: 'Serini, puanını ve haftalık ilerlemeni buradan takip et.', pose: 'party' },
};

export function TabIntro() {
  const c = useColors();
  const seg = useSegments() as string[];
  const tab = seg[seg.length - 1] === '(tabs)' ? 'index' : seg[seg.length - 1];
  const info = INTRO[tab];
  const [, bump] = useState(0);
  const wants = !!info && !flag.has(`tab.${tab}`);
  const shown = useStep('tabIntro', wants);
  if (!shown || !info) return null;
  const close = () => {
    flag.set(`tab.${tab}`);
    bump(n => n + 1);
  };
  return (
    <StepModal onClose={close}>
      {dismiss => (
        <View style={[styles.box, { backgroundColor: c.surface }]}>
          <MokaMascot pose={info.pose} size="lg" showBubble={false} style={styles.moka} />
          <T v="h1" style={{ textAlign: 'center' }}>{info.title}</T>
          <T v="lead" style={{ textAlign: 'center', marginTop: 0 }}>{info.text}</T>
          <Btn kind="primary" label="Anladım" onPress={dismiss} block />
        </View>
      )}
    </StepModal>
  );
}

const styles = StyleSheet.create({
  moka: { marginTop: -90 },
  box: { borderRadius: radius.card, padding: 24, paddingTop: 0, marginTop: 80, gap: 14, alignItems: 'center', maxWidth: 420, width: '100%' },
});
