import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { MokaRig } from '@/components/MokaRig';
import { Appear, Float, Squish } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { BackLink, Screen, T } from '@/components/ui';
import { FURS } from '@/constants/moka-look';
import { FUR_PRICE, furOwned } from '@/domain/items';
import { COSMETICS, SLOTS, cosmeticKey, cosmeticOwned, type Cosmetic, type SlotId } from '@/domain/kozmetik';
import { tx } from '@/i18n/runtime';
import { haptic, sfx } from '@/lib/sfx';
import { usePlay } from '@/play/usePlay';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

type Tab = 'kurk' | SlotId;
type Worn = Partial<Record<SlotId, string>>;

/**
 * Moka Dolabı (docs/moka-kozmetik-plani.md §13): canlı katmanlı Moka, kürk + baş / gövde / el eşyaları.
 * Her şey denenebilir (kilitli ve alınmamış da); sahip olunan seçim anında kaydolur, alınmamış sadece önizlenir.
 * Sayfadan çıkınca alınmamış deneme silinir.
 */
export default function MokaDolabi() {
  const c = useColors();
  const D = c.den;
  const router = useRouter();
  const toast = useToast();
  const { state, update } = useStore();
  const { buy } = usePlay();
  const { premium } = usePurchases();
  const P = state.play;
  const savedFur = P.mokaFur ?? 'orman';
  const [tab, setTab] = useState<Tab>('kurk');
  const [fur, setFur] = useState(savedFur);
  const [worn, setWorn] = useState<Worn>(P.mokaWorn ?? {});
  const [busy, setBusy] = useState(false);
  const [pop, setPop] = useState(0);
  const [say, setSay] = useState('');
  // Eski kullanıcı: puanla almadan önce seçtiği renk onun kalır (bir kez yazılır).
  useEffect(() => {
    if (P.furGift === undefined) update(D0 => void (D0.play.furGift = D0.play.mokaFur ?? null));
  }, [P.furGift, update]);

  const items = useMemo(() => (tab === 'kurk' ? [] : COSMETICS.filter(i => i.slot === tab)), [tab]);
  const sel = tab === 'kurk' ? null : COSMETICS.find(i => i.id === worn[tab]) ?? null;
  const saveWorn = (w: Worn) => update(D0 => void (D0.play.mokaWorn = w));

  const pickFur = (id: string) => {
    sfx('tap');
    haptic('light');
    setFur(id);
    setPop(n => n + 1);
    setSay(furOwned(P, id) ? '' : tx('Bu renk de çok yakışırdı 💛'));
    if (furOwned(P, id)) update(D0 => void (D0.play.mokaFur = id === 'orman' ? null : id));
  };
  const pickItem = (it: Cosmetic) => {
    sfx('tap');
    haptic('light');
    const next: Worn = { ...worn };
    if (next[it.slot] === it.id) delete next[it.slot];
    else next[it.slot] = it.id;
    setWorn(next);
    setPop(n => n + 1);
    setSay(next[it.slot] ? tx('{} çok yakıştı!').replace('{}', tx(it.name)) : '');
    // Sahip olunan eşya anında kaydolur; alınmamış sadece önizlenir.
    const mine = Object.fromEntries(Object.entries(next).filter(([, id]) => { const k = COSMETICS.find(x => x.id === id); return k && cosmeticOwned(P.owned, k); })) as Worn;
    saveWorn(mine);
  };
  const clearAll = () => {
    sfx('tap');
    setWorn({});
    saveWorn({});
    setSay('');
  };

  const priceOf = tab === 'kurk' ? FUR_PRICE[fur] ?? 0 : sel?.price ?? 0;
  const ownNow = tab === 'kurk' ? furOwned(P, fur) : !sel || cosmeticOwned(P.owned, sel);
  const short = Math.max(0, priceOf - P.points);
  const locked = !!sel?.premium && !premium.active && !ownNow;
  const purchase = async () => {
    if (busy || ownNow || short) return;
    setBusy(true);
    const id = tab === 'kurk' ? `kurk_${fur}` : cosmeticKey(sel!.id);
    const r = await buy(id, null);
    setBusy(false);
    if (!r.ok) return toast(r.error);
    sfx('done');
    haptic('success');
    if (tab === 'kurk') update(D0 => void (D0.play.mokaFur = fur === 'orman' ? null : fur));
    else saveWorn({ ...(P.mokaWorn ?? {}), [sel!.slot]: sel!.id });
    setPop(n => n + 1);
    setSay(tx('Bu artık senin 💛'));
  };

  const anyWorn = Object.keys(worn).length > 0;
  return (
    <Screen header={false}>
      <View style={st.top}>
        <BackLink />
        <View style={[st.points, { backgroundColor: D.paper, shadowColor: D.shade }]} accessibilityLabel={tx('{} puan').replace('{}', String(P.points))}>
          <Text maxFontSizeMultiplier={1.3} style={[st.pointsN, { color: D.ink }]}>{P.points}</Text>
          <Text style={{ fontSize: 14 }}>⭐</Text>
        </View>
      </View>
      <T v="h1">{tx('Moka\'nın dolabı 🧣')}</T>
      <View style={[st.stage, { backgroundColor: D.paper, shadowColor: D.shade }]}>
        <View pointerEvents="none" style={[st.glow, { backgroundColor: D.glow }]} />
        <View pointerEvents="none" style={[st.floor, { backgroundColor: D.shade }]} />
        <Float amp={4} dur={2400} style={st.sp1}><Text style={st.spark}>✨</Text></Float>
        <Float amp={5} dur={2900} delay={600} style={st.sp2}><Text style={st.spark}>🤍</Text></Float>
        <Float amp={3} dur={2100} delay={300} style={st.sp3}><Text style={st.spark}>✦</Text></Float>
        <MokaRig size={270} fur={fur === 'orman' ? null : fur} worn={worn} mood={ownNow ? 'happy' : 'wow'} pop={pop} />
        {!!anyWorn && (
          <Pressable onPress={clearAll} accessibilityRole="button" accessibilityLabel={tx('Hepsini çıkar')} style={[st.reset, { backgroundColor: c.surface }]} hitSlop={6}>
            <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: D.soft }}>↺ {tx('Hepsini çıkar')}</Text>
          </Pressable>
        )}
        {!!say && (
          <Appear key={say}>
            <View style={[st.say, { backgroundColor: c.surface }]}>
              <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, color: D.ink }}>{say}</Text>
            </View>
          </Appear>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.tabs}>
        {([{ id: 'kurk' as Tab, label: 'Kürk' }, ...SLOTS]).map(t => {
          const on = tab === t.id;
          return (
            <Pressable key={t.id} onPress={() => { sfx('tap'); setTab(t.id as Tab); }} accessibilityRole="tab" accessibilityState={{ selected: on }}
              style={[st.tab, { backgroundColor: on ? D.ink : D.paper }]}>
              <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: on ? D.paper : D.ink }}>{tx(t.label)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {tab === 'kurk' ? (
        <View style={st.row}>
          {FURS.map(f => {
            const on = fur === f.id;
            const mine = furOwned(P, f.id);
            return (
              <Pressable key={f.id} onPress={() => pickFur(f.id)} accessibilityRole="button" accessibilityLabel={`${tx(f.label)}${mine ? '' : `, ${FUR_PRICE[f.id]} ⭐`}`} accessibilityState={{ selected: on }} style={st.cell} hitSlop={2}>
                <View style={[st.dotRing, { borderColor: on ? D.ink : 'transparent' }]}><View style={[st.dot, { backgroundColor: f.swatch, shadowColor: D.shade }]}>{mine && savedFur === f.id && <Check />}</View></View>
                <Text maxFontSizeMultiplier={1.2} style={[st.price, { color: mine ? c.accent : D.soft }]}>{mine ? '✓' : `${FUR_PRICE[f.id]}⭐`}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={st.grid}>
          {items.map(it => {
            const on = worn[it.slot] === it.id;
            const mine = cosmeticOwned(P.owned, it);
            const lock = !!it.premium && !premium.active && !mine;
            return (
              <Squish key={it.id} onPress={() => pickItem(it)} accessibilityRole="button" accessibilityState={{ selected: on }}
                accessibilityLabel={`${tx(it.name)}, ${mine ? tx('senin') : `${it.price} ⭐`}${lock ? ', Premium' : ''}`}
                style={[st.card, { backgroundColor: on ? D.paperNight : D.paper, borderColor: on ? D.ink : D.line, shadowColor: D.shade, shadowOpacity: on ? 0.2 : 0.08, opacity: lock ? 0.9 : 1 }]}>
                <View style={[st.emojiBg, { backgroundColor: on ? D.paper : c.surface }]}><Text style={st.emoji}>{it.emoji}</Text></View>
                <Text numberOfLines={2} maxFontSizeMultiplier={1.15} style={[st.name, { color: D.ink }]}>{tx(it.name)}</Text>
                <View style={[st.tag, { backgroundColor: mine ? c.accentSoft : c.surface }]}>
                  <Text maxFontSizeMultiplier={1.15} style={{ fontFamily: fonts.bodyBold, fontSize: 11.5, color: mine ? c.accent : D.soft }}>
                    {mine ? (on ? '✓' : tx('Senin')) : `${it.price}⭐`}{lock ? ' 👑' : ''}
                  </Text>
                </View>
              </Squish>
            );
          })}
        </View>
      )}

      {!ownNow && (
        <Squish onPress={purchase} disabled={busy || short > 0 || locked}
          accessibilityLabel={locked ? tx('Premium üyelere özel') : short ? tx('{} puan daha').replace('{}', String(short)) : tx('{} puana al').replace('{}', String(priceOf))}
          style={[st.buy, { backgroundColor: c.accent, opacity: busy || short || locked ? 0.5 : 1 }]}>
          <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.bodyBlack, fontSize: 16, color: c.onAccent }}>
            {locked ? `👑 ${tx('Premium üyelere özel')}` : short ? tx('{} puan daha').replace('{}', String(short)) : tx('{} puana al').replace('{}', String(priceOf))}
          </Text>
        </Squish>
      )}
      {ownNow && (
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
  glow: { position: 'absolute', top: 40, width: 250, height: 250, borderRadius: 125, opacity: 0.28 },
  floor: { position: 'absolute', bottom: 22, width: 170, height: 22, borderRadius: 11, opacity: 0.1 },
  spark: { fontSize: 18, color: '#E9B872' },
  sp1: { position: 'absolute', top: 30, right: 36 },
  sp2: { position: 'absolute', top: 96, left: 28 },
  sp3: { position: 'absolute', top: 160, right: 22 },
  emojiBg: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  dotRing: { width: 54, height: 54, borderRadius: 27, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  stage: { alignItems: 'center', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3, borderRadius: 32, paddingTop: 18, paddingBottom: 14, marginVertical: 8, gap: 8, minHeight: 330 },
  reset: { position: 'absolute', top: 12, right: 12, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  say: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  tabs: { gap: 8, paddingVertical: 6 },
  tab: { height: 38, borderRadius: radius.pill, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginTop: 8 },
  cell: { width: '23%', alignItems: 'center', gap: 4, minHeight: 64 },
  dot: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.18, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  price: { fontFamily: fonts.bodyBold, fontSize: 12.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  card: { width: '31%', minHeight: 124, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 6, gap: 4, shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  emoji: { fontSize: 32, lineHeight: 40 },
  name: { fontFamily: fonts.bodyBold, fontSize: 12.5, textAlign: 'center' },
  tag: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  buy: { height: 58, shadowColor: '#2A1C12', shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
});
