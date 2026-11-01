import type { ComponentRef, Ref } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { MOKA_ASSETS } from '@/constants/moka';
import { allTasks, doneToday } from '@/domain/logic';
import { pickMoka, mokaStatus } from '@/domain/moka';
import { progressOf } from '@/domain/play';
import type { AppState } from '@/domain/types';
import { brand, fonts, radius, useColors } from '@/theme';

/** "Moka ile günüm": bugünün özeti, paylaşılabilir. Kendi zemini ve sloganı var. */
export function DayCard({ state: S, now, name, ref }: { state: AppState; now: number; name?: string; ref?: Ref<ComponentRef<typeof View>> }) {
  const c = useColors();
  const done = allTasks(S, now).filter(x => doneToday(x.t, now)).length;
  const streak = progressOf(S.play, now).streak;
  const m = pickMoka(mokaStatus(S, now));
  const pose = done > 0 ? 'sparkling_complete' : m.pose;
  return (
    <View ref={ref} collapsable={false} style={[styles.card, { backgroundColor: c.peachSoft, borderColor: c.surface }]}>
      <View style={[styles.logo, { backgroundColor: brand.mint }]}>
        <Image source={require('../../assets/logo-yatay.png')} style={styles.wordmark} resizeMode="contain" accessibilityLabel="Homezy" />
      </View>
      <Text style={[styles.title, { color: c.ink }]}>{name ? `${name} ve Moka'nın günü` : 'Moka ile günüm'}</Text>
      <Image source={MOKA_ASSETS[pose]} style={styles.moka} resizeMode="contain" accessibilityIgnoresInvertColors />
      <Text style={[styles.big, { color: c.ink }]}>{done ? `Bugün ${done} iş yaptım ✨` : 'Bugün dinlenme günü 🌙'}</Text>
      {streak > 1 && <Text style={[styles.sub, { color: c.warm }]}>🔥 {streak} günlük seri</Text>}
      <Text style={[styles.sub, { color: c.muted }]}>{m.message}</Text>
      <Text style={[styles.slogan, { color: c.muted }]}>Küçük işler, büyük huzur 🏡 homezy</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, borderWidth: 3, padding: 20, alignItems: 'center', gap: 8 },
  logo: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  wordmark: { width: 96, height: 24 },
  title: { fontFamily: fonts.displayBold, fontSize: 20, textAlign: 'center' },
  moka: { width: 200, height: 200 },
  big: { fontFamily: fonts.displayBold, fontSize: 22, textAlign: 'center' },
  sub: { fontFamily: fonts.bodyBold, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  slogan: { fontFamily: fonts.bodyBold, fontSize: 12, marginTop: 6 },
});
