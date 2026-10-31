import { StyleSheet, Text, View } from 'react-native';

import { Squish } from '@/components/motion';
import { T } from '@/components/ui';
import { careDone, selfCareOf } from '@/domain/selfcare';
import { dayKey } from '@/domain/play';
import { useNow } from '@/hooks/useNow';
import { sfx } from '@/lib/sfx';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

/** "Sana bir şey": günlük, isteğe bağlı kendine bakım önerisi. Yapılınca Moka sevinir, puan yok. */
export function SelfCareCard() {
  const c = useColors();
  const now = useNow();
  const { state: S, update } = useStore();
  const item = selfCareOf(dayKey(now));
  const done = careDone(S.play.awarded, now);
  const finish = () => {
    if (done) return;
    sfx('tap');
    update(d => { d.play.awarded.bakim = dayKey(now); });
  };
  return (
    <Squish onPress={finish} accessibilityRole="button" accessibilityLabel={`Sana bir şey: ${item.text}`} style={[styles.card, { backgroundColor: done ? c.sageSoft : c.roseSoft }]}>
      <View style={[styles.icon, { backgroundColor: c.surface }]}>
        <Text style={{ fontSize: 24 }}>{done ? '🌸' : item.emoji}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="tiny" style={{ color: c.fashionAccent, fontFamily: fonts.bodyBlack, letterSpacing: 1 }}>SANA BİR ŞEY</T>
        <T v="bold" numberOfLines={2}>{done ? 'Kendine iyi baktın, Moka gurur duyuyor.' : item.text}</T>
      </View>
      <View style={[styles.check, { backgroundColor: done ? c.sage : c.surface }]}>
        <Text style={{ color: done ? c.onAccent : c.muted, fontFamily: fonts.bodyBlack }}>{done ? '✓' : ''}</Text>
      </View>
    </Squish>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.tile, padding: 16 },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  check: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
