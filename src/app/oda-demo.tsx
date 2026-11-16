import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { odaOfHour, RoomBackdrop } from '@/components/RoomBackdrop';
import type { OdaVariant } from '@/constants/oda';

/** Geçici önizleme: canlı oda arka planı. Dokununca gündüz/gece değişir, sol üstteki ok geri döner. */
export default function OdaDemo() {
  const router = useRouter();
  const [v, setV] = useState<OdaVariant>(odaOfHour());
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <RoomBackdrop mix={v === 'gece' ? 1 : 0} style={StyleSheet.absoluteFill} />
      <Pressable style={StyleSheet.absoluteFill} onPress={() => setV(x => (x === 'gece' ? 'gunduz' : 'gece'))} accessibilityLabel="Gündüz / gece değiştir" />
      <Pressable onPress={() => router.back()} style={st.back} accessibilityLabel="Geri"><Text style={st.t}>‹</Text></Pressable>
    </View>
  );
}
const st = StyleSheet.create({
  back: { position: 'absolute', top: 54, left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  t: { color: '#fff', fontSize: 28, lineHeight: 32 },
});
