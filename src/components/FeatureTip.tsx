import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import type { Href } from 'expo-router';

import { MokaMascot } from '@/components/MokaMascot';
import { StepModal } from '@/components/StepModal';
import { Btn, T } from '@/components/ui';
import { EMPTY_MEM, mayShow, parseMem, pickTip, remember } from '@/domain/featureTips';
import { dayKey } from '@/domain/play';
import { extrasUnlocked } from '@/lib/events';
import { sessionNo, useStep } from '@/lib/firstRun';
import { router } from '@/lib/nav';
import { prefs } from '@/lib/supabase';
import { useStore } from '@/store/AppStore';
import { radius, useColors } from '@/theme';

const KEY = 'tips';
const OPEN_KEY = 'tipOpenDay';
const WAIT_MS = 3500;

// Bu açılışta günün ilk açılışı mı? Modül yüklenirken bir kere okunur ve bugün olarak yazılır.
const today0 = dayKey();
const firstOfDay = prefs.get(OPEN_KEY) !== today0;
prefs.set(OPEN_KEY, today0);
// Zar bu açılış için bir kere atılır.
const roll = Math.random();

/**
 * Ara sıra özellik tanıtan pencere: günün ilk açılışında, ilk kurulumda, günde ikinciyi ve art arda açılışta çıkmaz.
 * Diğer pencerelerin (karşılama, ruh hali, Premium, bildirim) hepsinden sonra gelir; onlar bekliyorsa sıra onlarındır.
 */
export function FeatureTip() {
  const c = useColors();
  const { state: S } = useStore();
  const [ready, setReady] = useState(false);
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), WAIT_MS);
    return () => clearTimeout(t);
  }, []);

  const tip = useMemo(() => {
    if (!ready || !S.setup) return null;
    const mem = parseMem(prefs.get(KEY));
    if (!mayShow({ today: today0, firstOfDay, sessionNo, mem, roll })) return null;
    return pickTip(S, mem, { android: Platform.OS === 'android', sportOpen: extrasUnlocked(S.play.days.length) }, Math.random);
    // Bir kere seçilir; sonra ev verisi değişse de ipucu değişmez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, S.setup]);

  const shown = useStep('tip', !!tip && !closed);
  useEffect(() => {
    if (shown && tip) prefs.set(KEY, JSON.stringify(remember(parseMem(prefs.get(KEY) ?? JSON.stringify(EMPTY_MEM)), tip.id, today0, sessionNo)));
  }, [shown, tip]);
  if (!shown || !tip) return null;

  return (
    <StepModal onClose={() => setClosed(true)}>
      {dismiss => (
        <View style={[styles.box, { backgroundColor: c.surface }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Kapat" hitSlop={12} onPress={dismiss} style={[styles.x, { backgroundColor: c.surface2 }]}>
            <T v="h3" style={{ color: c.muted }}>✕</T>
          </Pressable>
          <MokaMascot pose="happy" size="md" showBubble={false} style={styles.moka} />
          <T v="h1" style={{ textAlign: 'center' }}>{`${tip.emoji} ${tip.title}`}</T>
          <T v="lead" style={{ textAlign: 'center', marginTop: 0 }}>{tip.text}</T>
          <Btn kind="primary" label={tip.cta} block onPress={() => { dismiss(); setTimeout(() => router.push(tip.href as Href), 300); }} />
        </View>
      )}
    </StepModal>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.card, padding: 24, paddingTop: 0, marginTop: 60, gap: 14, alignItems: 'center', maxWidth: 420, width: '100%' },
  moka: { marginTop: -60 },
  x: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
});
