import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { brand, fonts, radius, useColors } from '@/theme';

import { Btn, T } from './ui';

/** Premium'a özel bir bölümün yerinde duran kilitli kart: ne kazandıracağını söyler, ödeme ekranına götürür. */
export function PremiumLock({ title, text, emoji = '👑' }: { title: string; text: string; emoji?: string }) {
  const c = useColors();
  const router = useRouter();
  return (
    <View style={[styles.box, { backgroundColor: c.todaySoft, borderColor: c.line }]}>
      <View style={styles.head}>
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
        <T v="bold" style={{ flex: 1 }}>{title}</T>
        <View style={[styles.tag, { backgroundColor: brand.clay }]}>
          <Text style={styles.tagText}>PREMIUM</Text>
        </View>
      </View>
      <T v="small" style={{ fontSize: 13.5 }}>{text}</T>
      <Btn kind="primary" small label="Premium'a bak ⭐" onPress={() => router.push('/premium')} style={{ alignSelf: 'flex-start' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.card, borderWidth: 0, padding: 16, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tag: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontFamily: fonts.bodyBlack, fontSize: 10.5, color: brand.navy },
});
