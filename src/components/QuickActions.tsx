import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { Squish } from '@/components/motion';
import { AddSheet } from '@/components/TabBar';
import { Chevron } from '@/components/ui';
import { tx } from '@/i18n/runtime';
import { fonts, radius, useColors } from '@/theme';

/** Küçük, sakin "+" düğmesi: yeni iş ekle (oda, ad, sıklık). Başlık satırlarının yanına konur. */
export function AddTaskButton({ size = 34 }: { size?: number }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Squish onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={tx('İş ekle')} hitSlop={8}
        style={[st.add, { width: size, height: size, borderRadius: size / 2, backgroundColor: c.surface2 }]}>
        <Text style={{ fontFamily: fonts.bodyBlack, fontSize: size * 0.62, lineHeight: size * 0.8, color: c.ink }}>+</Text>
      </Squish>
      <AddSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** Tek satırlık sakin giriş: odayı seç, Moka sırayı seçsin. Renkli blok değil, krem kart. */
export function CleanLink() {
  const c = useColors();
  const router = useRouter();
  return (
    <Squish onPress={() => router.push('/temizlik' as Href)} accessibilityRole="button" accessibilityLabel={tx('Temizlik başlat')}
      style={[st.clean, { backgroundColor: c.surface }]}>
      <Text style={st.emoji}>🧹</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[st.title, { color: c.ink }]}>{tx('Temizlik başlat')}</Text>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[st.sub, { color: c.muted }]}>{tx('Tek dokunuş, Moka işleri sıralar')}</Text>
      </View>
      <Chevron color={c.muted} size={14} dir="right" />
    </Squish>
  );
}

const st = StyleSheet.create({
  add: { alignItems: 'center', justifyContent: 'center' },
  clean: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.card, paddingVertical: 12, paddingHorizontal: 16 },
  emoji: { fontSize: 20, lineHeight: 26 },
  title: { fontFamily: fonts.bodyBlack, fontSize: 15 },
  sub: { fontFamily: fonts.bodyBold, fontSize: 12.5 },
});
