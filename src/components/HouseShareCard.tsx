import type { ComponentRef, Ref } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { MOKA_ASSETS } from '@/constants/moka';
import { achievements } from '@/domain/achievements';
import { progressOf, stageFor } from '@/domain/play';
import type { AppState } from '@/domain/types';
import { brand, fonts, radius, useColors } from '@/theme';

/** Paylaşılabilir "Evim" kartı: ev seviyesi, seri, rozet sayısı ve Moka. */
export function HouseShareCard({ state: S, now, ref }: { state: AppState; now: number; ref?: Ref<ComponentRef<typeof View>> }) {
  const c = useColors();
  const hp = progressOf(S.play, now);
  const stage = stageFor(hp.level);
  const list = achievements(S, now);
  const got = list.filter(a => a.on).length;
  return (
    <View ref={ref} collapsable={false} style={[st.card, { backgroundColor: c.peachSoft, borderColor: c.surface }]}>
      <View style={[st.logo, { backgroundColor: brand.mint }]}>
        <Image source={require('../../assets/logo-yatay.png')} style={st.wordmark} resizeMode="contain" accessibilityLabel="Homezy" />
      </View>
      <Text style={st.house}>{stage?.emoji ?? '🏗️'}</Text>
      <Image source={MOKA_ASSETS.party} style={st.moka} resizeMode="contain" accessibilityIgnoresInvertColors />
      <Text style={[st.big, { color: c.ink }]}>Evim seviye {hp.level}</Text>
      {stage && <Text style={[st.sub, { color: c.muted }]}>{stage.name}</Text>}
      <View style={st.row}>
        <Text style={[st.pill, { color: c.ink, backgroundColor: c.surface }]}>🔥 {hp.streak} gün seri</Text>
        <Text style={[st.pill, { color: c.ink, backgroundColor: c.surface }]}>🏆 {got} rozet</Text>
      </View>
      <Text style={[st.slogan, { color: c.muted }]}>Küçük işler, büyük huzur 🏡 homezy</Text>
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderRadius: radius.card, borderWidth: 3, padding: 20, alignItems: 'center', gap: 6, alignSelf: 'stretch' },
  logo: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  wordmark: { width: 96, height: 24 },
  house: { fontSize: 44, marginTop: 4 },
  moka: { width: 150, height: 150 },
  big: { fontFamily: fonts.displayBold, fontSize: 24, textAlign: 'center' },
  sub: { fontFamily: fonts.bodyBold, fontSize: 14, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 8, marginVertical: 6 },
  pill: { fontFamily: fonts.bodyBold, fontSize: 14, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12, overflow: 'hidden' },
  slogan: { fontFamily: fonts.bodyBold, fontSize: 12, marginTop: 4 },
});
