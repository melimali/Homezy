import { Image, StyleSheet, View } from 'react-native';

import { Appear } from '@/components/motion';
import { BackLink, Card, Screen, SecHead, T } from '@/components/ui';
import { BADGE_ART } from '@/constants/badges';
import { ACH_GROUPS, achievements } from '@/domain/achievements';
import { useNow } from '@/hooks/useNow';
import { useTranslation } from '@/i18n/i18n';
import { useStore } from '@/store/AppStore';
import { radius, useColors } from '@/theme';

/** Tüm rozetler: kazanılanlar renkli, kilitliler soluk ve ipucu + ilerleme gösterir. */
export default function Rozetler() {
  const c = useColors();
  const { t } = useTranslation();
  const now = useNow();
  const { state } = useStore();
  const all = achievements(state, now);
  return (
    <Screen header={false}>
      <BackLink />
      <T v="h1">{t('Rozetlerin 🏆')}</T>
      <T v="tiny">{t('{} / {} rozet kazandın').replace('{}', String(all.filter(a => a.on).length)).replace('{}', String(all.length))}</T>
      {ACH_GROUPS.map((g, gi) => {
        const items = all.filter(a => a.group === g.id);
        return (
          <Card key={g.id}>
            <SecHead title={`${g.emoji} ${t(g.title)}`} h="h3" right={`${items.filter(a => a.on).length}/${items.length}`} />
            <Appear index={gi} style={st.wrap}>
              {items.map(a => (
                <View key={a.id} accessibilityLabel={`${t(a.name)}: ${a.on ? t('Kazanıldı ✓') : t(a.hint)}`} style={[st.badge, { backgroundColor: a.on ? c.sageSoft : c.surface2 }]}>
                  <View style={[st.icon, !a.on && { opacity: 0.35 }]}>
                    {a.art ? <Image source={BADGE_ART[a.art]} style={st.img} resizeMode="contain" accessibilityIgnoresInvertColors /> : <T style={{ fontSize: 38 }}>{a.emoji}</T>}
                  </View>
                  <T v="bold" style={[{ textAlign: 'center' }, !a.on && { opacity: 0.6 }]} numberOfLines={2}>{t(a.name)}</T>
                  <T v="tiny" style={{ textAlign: 'center' }} numberOfLines={2}>
                    {a.on ? t('Kazanıldı ✓') : a.prog ? `${t(a.hint)} (${Math.min(a.prog[0], a.prog[1])}/${a.prog[1]})` : t(a.hint)}
                  </T>
                </View>
              ))}
            </Appear>
          </Card>
        );
      })}
    </Screen>
  );
}

const st = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: { width: '31%', flexGrow: 1, minWidth: 96, borderRadius: radius.tile, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', gap: 4 },
  icon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  img: { width: 56, height: 56 },
});
