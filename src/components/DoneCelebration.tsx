import { useEffect } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MOKA_ASSETS } from '@/constants/moka';
import { sfx } from '@/lib/sfx';
import { fonts, radius, useColors } from '@/theme';

import { Appear, Float, Squish } from './motion';

/**
 * İş bitince koyu kutlama ekranı: üstte gece sahnesinde neşeli Moka, "Harika iş!", kazanılan puan
 * hapı, Moka'nın sözü ve "Devam Et". Sadece görünüm; puanı iş satırı / iş ekranı zaten verdi.
 */
export function DoneCelebration({ open, text, points, quote, onClose }: { open: boolean; text: string; points: number; quote: string; onClose: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (open) sfx('party');
  }, [open]);
  return (
    <Modal visible={open} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <ScrollView style={{ backgroundColor: c.night }} contentContainerStyle={[st.page, { paddingBottom: insets.bottom + 28 }]} bounces={false}>
        <View style={[st.hero, { paddingTop: insets.top }]}>
          <Float amp={5} dur={2200}>
            <Image source={MOKA_ASSETS.party} style={st.heroMoka} resizeMode="contain" accessibilityIgnoresInvertColors />
          </Float>
          {[[0.18, 0.2, 0], [0.72, 0.12, 300], [0.86, 0.38, 600], [0.1, 0.5, 900]].map(([x, y, d], i) => (
            <Float key={i} amp={5} dur={1800 + i * 300} delay={d} style={[st.star, { left: `${x * 100}%`, top: `${y * 100}%` }]}>
              <Text style={{ fontSize: 22 + (i % 2) * 8 }}>⭐</Text>
            </Float>
          ))}
        </View>
        <View style={st.body}>
          <Appear style={{ alignItems: 'center', gap: 6 }}>
            <Text style={[st.h1, { color: c.onNight }]}>Harika iş!</Text>
            <Text style={[st.sub, { color: c.onNight }]}>{text}</Text>
          </Appear>
          {points > 0 && (
            <Appear index={1} style={[st.points, { backgroundColor: c.cream }]}>
              <Text style={{ fontSize: 24 }}>⭐</Text>
              <Text style={[st.pointsT, { color: c.night }]}>+{points} puan</Text>
            </Appear>
          )}
          <Appear index={2} style={[st.quote, { backgroundColor: c.nightCard }]}>
            <Text style={[st.mark, { color: c.onNight }]}>“</Text>
            <Text style={[st.quoteT, { color: c.onNight }]}>{quote}</Text>
          </Appear>
          <Squish onPress={onClose} accessibilityLabel="Devam et" style={[st.btn, { backgroundColor: c.cream }]}>
            <Text style={[st.btnT, { color: c.night }]}>Devam Et</Text>
          </Squish>
        </View>
      </ScrollView>
    </Modal>
  );
}

const st = StyleSheet.create({
  page: { flexGrow: 1, width: '100%', maxWidth: 520, alignSelf: 'center' },
  hero: { height: 300, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  heroMoka: { width: 220, height: 220 },
  star: { position: 'absolute' },
  body: { flex: 1, paddingHorizontal: 24, gap: 26, alignItems: 'center', marginTop: -8, paddingTop: 8 },
  h1: { fontFamily: fonts.displayBold, fontSize: 40, lineHeight: 46, letterSpacing: -0.6, textAlign: 'center' },
  sub: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 24, textAlign: 'center', opacity: 0.9 },
  points: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.pill, paddingVertical: 14, paddingHorizontal: 40 },
  pointsT: { fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 28 },
  quote: { alignSelf: 'stretch', flexDirection: 'row', gap: 14, borderRadius: radius.tile, paddingVertical: 20, paddingHorizontal: 20 },
  mark: { fontFamily: fonts.displayBold, fontSize: 46, lineHeight: 46, opacity: 0.35 },
  quoteT: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 24 },
  btn: { alignSelf: 'stretch', alignItems: 'center', borderRadius: radius.pill, paddingVertical: 18, marginTop: 'auto' },
  btnT: { fontFamily: fonts.bodyBlack, fontSize: 17 },
});
