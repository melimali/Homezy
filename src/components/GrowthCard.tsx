import { useRouter } from '@/lib/nav';
import { StyleSheet, View } from 'react-native';

import { Squish } from '@/components/motion';
import { T } from '@/components/ui';
import { gKey, goalMet, kindEmoji, readMin, suggest, suggestionById } from '@/domain/growth';
import { answered, checkinOf } from '@/domain/mood';
import { useNow } from '@/hooks/useNow';
import { usePersona } from '@/profile/usePersona';
import { useStore } from '@/store/AppStore';
import { radius, useColors } from '@/theme';

/** Bugün sekmesinde: Moka'nın günlük gelişim önerisi ve okuma hedefi. Dokununca Kendini geliştir ekranı. */
export function GrowthCard() {
  const c = useColors();
  const router = useRouter();
  const now = useNow();
  const { state: S } = useStore();
  const { persona } = usePersona();
  const G = S.play.growth;
  const day = gKey(now);
  const ci = checkinOf(S.play, now);
  const sug = (G.pick && G.pick.day === day && suggestionById(G.pick.id)) || suggest(G, persona, answered(ci) ? ci.feel : null, day);
  const met = goalMet(G, day);
  return (
    <Squish onPress={() => router.push('/buyume')} accessibilityRole="link" accessibilityLabel={`Moka'nın önerisi: ${sug.title}`} style={[st.card, { backgroundColor: c.lavenderSoft }]}>
      <T style={{ lineHeight: 39, fontSize: 30 }}>{met ? '🌷' : kindEmoji(sug.kind)}</T>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="tiny">{met ? 'OKUMA HEDEFİ TAMAM' : 'MOKA ÖNERİYOR'}</T>
        <T v="bold" numberOfLines={1}>{sug.title}</T>
        <T v="tiny" numberOfLines={1}>{readMin(G, day)}/{G.goalMin} dk okuma · {sug.by}</T>
      </View>
    </Squish>
  );
}

const st = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.tile, padding: 16 },
});
