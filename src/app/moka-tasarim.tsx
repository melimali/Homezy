import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Appear, Squish } from '@/components/motion';
import { RoomMoka } from '@/components/RoomMoka';
import { useToast } from '@/components/Toast';
import { BackLink, Screen, T } from '@/components/ui';
import { FURS } from '@/constants/moka-look';
import { FUR_PRICE, furOwned } from '@/domain/items';
import { tx } from '@/i18n/runtime';
import { haptic, sfx } from '@/lib/sfx';
import { usePlay } from '@/play/usePlay';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

/**
 * Moka'nı tasarla: kürk rengi (docs/moka-oda-usta-plan.md §3.6). Denemek serbest, sahiplenmek puanla.
 * Orman bedava; puanla almadan önce seçilmiş renk de bedava kalır. Sayfadan çıkınca sahip olunmayan renk kaydedilmez.
 */
export default function MokaTasarim() {
  const c = useColors();
  const D = c.den;
  const router = useRouter();
  const toast = useToast();
  const { state, update } = useStore();
  const { buy } = usePlay();
  const P = state.play;
  const saved = P.mokaFur ?? 'orman';
  const [trying, setTrying] = useState(saved);
  const [busy, setBusy] = useState(false);
  // Eski kullanıcı: puanla almadan önce seçtiği renk onun kalır (bir kez yazılır).
  useEffect(() => {
    if (P.furGift === undefined) update(D0 => void (D0.play.furGift = D0.play.mokaFur ?? null));
  }, [P.furGift, update]);

  const own = furOwned(P, trying);
  const price = FUR_PRICE[trying] ?? 0;
  const short = Math.max(0, price - P.points);
  const pick = (id: string) => {
    sfx('tap');
    haptic('light');
    setTrying(id);
    if (furOwned(P, id)) update(D0 => void (D0.play.mokaFur = id === 'orman' ? null : id));
  };
  const purchase = async () => {
    if (busy || own || short) return;
    setBusy(true);
    const r = await buy(`kurk_${trying}`, null);
    setBusy(false);
    if (!r.ok) return toast(r.error);
    sfx('done');
    haptic('success');
    update(D0 => void (D0.play.mokaFur = trying === 'orman' ? null : trying));
    toast(tx('Bu renk artık senin 💛'));
  };
  const line = own ? null : short ? tx('Birkaç iş daha, sonra benim 💛') : null;

  return (
    <Screen header={false}>
      <View style={st.top}>
        <BackLink />
        <View style={[st.points, { backgroundColor: D.paper, shadowColor: D.shade }]} accessibilityLabel={tx('{} puan').replace('{}', String(P.points))}>
          <Text maxFontSizeMultiplier={1.3} style={[st.pointsN, { color: D.ink }]}>{P.points}</Text>
          <Text style={{ fontSize: 14 }}>⭐</Text>
        </View>
      </View>
      <T v="h1">{tx('Moka\'nı tasarla 🎨')}</T>
      <View style={[st.stage, { backgroundColor: D.paper }]}>
        <RoomMoka size={230} fur={trying === 'orman' ? null : trying} mood={own ? 'happy' : 'wow'} talking={false} thinking={false} />
        {!!line && (
          <Appear key={line}>
            <View style={[st.say, { backgroundColor: c.surface }]}>
              <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, color: D.ink }}>{line}</Text>
            </View>
          </Appear>
        )}
      </View>
      <T v="h3">{tx('Kürk rengi')}</T>
      <View style={st.row}>
        {FURS.map(f => {
          const on = trying === f.id;
          const mine = furOwned(P, f.id);
          return (
            <Pressable key={f.id} onPress={() => pick(f.id)} accessibilityRole="button" accessibilityLabel={`${tx(f.label)}${mine ? '' : `, ${FUR_PRICE[f.id]} ⭐`}`} accessibilityState={{ selected: on }} style={st.cell} hitSlop={2}>
              <View style={[st.dot, { backgroundColor: f.swatch, borderColor: on ? D.ink : 'transparent' }]}>
                {mine && saved === f.id && <Check />}
              </View>
              <Text maxFontSizeMultiplier={1.2} style={[st.price, { color: mine ? c.accent : D.soft }]}>{mine ? '✓' : `${FUR_PRICE[f.id]}⭐`}</Text>
            </Pressable>
          );
        })}
      </View>
      {!own && (
        <Squish onPress={purchase} disabled={busy || short > 0} accessibilityLabel={short ? tx('{} puan daha').replace('{}', String(short)) : tx('{} puana al').replace('{}', String(price))}
          style={[st.buy, { backgroundColor: c.accent, opacity: busy || short ? 0.5 : 1 }]}>
          <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.bodyBlack, fontSize: 16, color: c.onAccent }}>
            {short ? tx('{} puan daha').replace('{}', String(short)) : tx('{} puana al').replace('{}', String(price))}
          </Text>
        </Squish>
      )}
      {own && (
        <Squish onPress={() => router.back()} accessibilityLabel={tx('Tamam')} style={[st.buy, { backgroundColor: c.accent }]}>
          <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.bodyBlack, fontSize: 16, color: c.onAccent }}>{tx('Tamam')}</Text>
        </Squish>
      )}
    </Screen>
  );
}

function Check() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M5 12.5l4.5 4.5L19 7.5" stroke="#FFFFFF" strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  points: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 36, borderRadius: radius.pill, paddingHorizontal: 14, shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  pointsN: { fontFamily: fonts.displayBold, fontSize: 16, lineHeight: 20 },
  stage: { alignItems: 'center', borderRadius: 28, paddingTop: 18, paddingBottom: 14, marginVertical: 8, gap: 8 },
  say: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  cell: { width: '23%', alignItems: 'center', gap: 4, minHeight: 64 },
  dot: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  price: { fontFamily: fonts.bodyBold, fontSize: 12.5 },
  buy: { height: 56, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
});
