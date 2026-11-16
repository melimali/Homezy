import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { MokaAvatar } from '@/components/MokaAcc';
import { BackLink, Btn, Card, Screen, SecHead, T } from '@/components/ui';
import { FURS } from '@/constants/moka-look';
import { MOKA_ASSETS } from '@/constants/moka';
import { useTranslation } from '@/i18n/i18n';
import { sfx } from '@/lib/sfx';
import { useStore } from '@/store/AppStore';
import { useColors } from '@/theme';

/** Moka'nı tasarla: kürk rengi. Ev, Ben ve odadaki Moka'da görünür. */
export default function MokaTasarim() {
  const c = useColors();
  const router = useRouter();
  const { t } = useTranslation();
  const { state, update } = useStore();
  const fur = state.play.mokaFur ?? 'orman';
  const set = (p: { mokaFur?: string | null }) => {
    sfx('tap');
    update(D => { Object.assign(D.play, p); });
  };
  return (
    <Screen header={false}>
      <BackLink />
      <T v="h1">{t('Moka\'nı tasarla 🎨')}</T>
      <View style={st.stage}>
        <MokaAvatar pose="happy" size={220} base={MOKA_ASSETS.happy} fur={fur} />
      </View>
      <Card>
        <SecHead title={t('Kürk rengi')} h="h3" />
        <View style={st.row}>
          {FURS.map(f => (
            <Pressable key={f.id} accessibilityRole="button" accessibilityLabel={t(f.label)} accessibilityState={{ selected: fur === f.id }} onPress={() => set({ mokaFur: f.id === 'orman' ? null : f.id })}
              style={[st.dot, { backgroundColor: f.swatch, borderColor: fur === f.id ? c.ink : 'transparent' }]} />
          ))}
        </View>
      </Card>
      <Btn label={t('Tamam')} kind="primary" onPress={() => router.back()} />
    </Screen>
  );
}

const st = StyleSheet.create({
  stage: { alignItems: 'center', paddingTop: 48, paddingBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  dot: { width: 44, height: 44, borderRadius: 22, borderWidth: 3 },
});
