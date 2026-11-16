import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { Squish } from '@/components/motion';
import { AddSheet } from '@/components/TabBar';
import { tx } from '@/i18n/runtime';
import { fonts, radius, useColors } from '@/theme';

/** Ev ve Bugün sekmesinde: "Temizlik başlat" (oda seç, Moka sırayı seçer) ve "İş ekle" (oda, ad, sıklık). */
export function QuickActions() {
  const c = useColors();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <View style={st.row}>
        <Squish onPress={() => router.push('/temizlik' as Href)} accessibilityRole="button" accessibilityLabel={tx('Temizlik başlat')} style={[st.btn, { backgroundColor: c.accent }]}>
          <Text style={st.emoji}>🧹</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.2} style={[st.label, { color: c.onAccent }]}>{tx('Temizlik başlat')}</Text>
        </Squish>
        <Squish onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={tx('İş ekle')} style={[st.btn, { backgroundColor: c.surface2 }]}>
          <Text style={st.emoji}>➕</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.2} style={[st.label, { color: c.ink }]}>{tx('İş ekle')}</Text>
        </Squish>
      </View>
      <AddSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14, borderRadius: radius.card },
  emoji: { fontSize: 20, lineHeight: 26 },
  label: { flexShrink: 1, fontFamily: fonts.bodyBlack, fontSize: 15 },
});
