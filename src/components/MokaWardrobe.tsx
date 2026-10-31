import { Image, StyleSheet, Text, View } from 'react-native';

import { Squish } from '@/components/motion';
import { MokaWearLayer } from '@/components/MokaWearLayer';
import { T } from '@/components/ui';
import { MOKA_ASSETS } from '@/constants/moka';
import { WEARS, wearOpen } from '@/domain/mokaWear';
import { progressOf } from '@/domain/play';
import { useNow } from '@/hooks/useNow';
import { sfx } from '@/lib/sfx';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

/** Hesap ekranı: Moka'ya aksesuar seç. Açılanlar seçilir, kilitliler hangi seviyede açılacağını söyler. */
export function MokaWardrobe() {
  const c = useColors();
  const now = useNow();
  const { state: S, update } = useStore();
  const { premium: sub } = usePurchases();
  const premium = sub.active;
  const level = progressOf(S.play, now).level;
  const pick = (id: string | undefined) => {
    sfx('tap');
    update(d => { d.play.wear = id; });
  };
  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.stage, { backgroundColor: c.peachSoft }]}>
        <View style={styles.moka}>
          <Image source={MOKA_ASSETS.happy} style={styles.img} resizeMode="contain" accessibilityIgnoresInvertColors />
          <MokaWearLayer size={120} />
        </View>
        <T v="small" style={{ flex: 1 }}>Moka&apos;ya bir şey tak. Yeni aksesuarlar evin büyüdükçe açılır.</T>
      </View>
      <View style={styles.grid}>
        <Squish onPress={() => pick(undefined)} accessibilityLabel="Aksesuarsız" style={[styles.item, { backgroundColor: !S.play.wear ? c.accentSoft : c.surface }]}>
          <Text style={{ fontSize: 26 }}>🚫</Text>
          <Text style={[styles.lbl, { color: c.ink }]}>Yok</Text>
        </Squish>
        {WEARS.map(w => {
          const open = wearOpen(w, level, premium);
          const on = S.play.wear === w.id;
          return (
            <Squish
              key={w.id}
              onPress={open ? () => pick(w.id) : undefined}
              accessibilityLabel={open ? w.name : `${w.name}, ${w.premium && !premium ? 'Premium' : `seviye ${w.level}`} ile açılır`}
              accessibilityState={{ selected: on, disabled: !open }}
              style={[styles.item, { backgroundColor: on ? c.accentSoft : c.surface }, !open && { opacity: 0.5 }]}
            >
              <Text style={{ fontSize: 26 }}>{open ? w.emoji : '🔒'}</Text>
              <Text style={[styles.lbl, { color: c.ink }]} numberOfLines={1}>{w.name}</Text>
              {!open && <Text style={[styles.sub, { color: c.muted }]}>{w.premium && !premium ? 'Premium' : `Sv. ${w.level}`}</Text>}
            </Squish>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.card, padding: 14 },
  moka: { width: 120, height: 120 },
  img: { width: 120, height: 120 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  item: { width: '22%', flexGrow: 1, minWidth: 72, alignItems: 'center', gap: 2, borderRadius: radius.tile, paddingVertical: 12, paddingHorizontal: 6 },
  lbl: { fontFamily: fonts.bodyBlack, fontSize: 12 },
  sub: { fontFamily: fonts.bodyBold, fontSize: 10.5 },
});
