import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { MokaRig } from '@/components/MokaRig';
import { Appear, Squish } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { Chevron } from '@/components/ui';
import { COSMETIC_IMG } from '@/constants/kozmetik-img';
import { COSMETIC_TILE_SIZE, cosmeticThumbnailFrame } from '@/constants/cosmeticFrames';
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
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const available = height - insets.top - insets.bottom;
  const compact = available < 480;
  const avatar = Math.round(Math.min(width * 0.63, available * (compact ? 0.32 : 0.30), 270));
  const crownSpace = Math.ceil(avatar * 0.22) + 4;
  const captionSpace = compact ? 5 : 32;
  const stageHeight = avatar + crownSpace + captionSpace;
  const buying = useRef(false);
  const back = () => router.canGoBack() ? router.back() : router.replace('/');
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
    if (buying.current) return;
    haptic('light');
    setFur(id);
    setPop(n => n + 1);
    setSay(furOwned(P, id) ? '' : tx('Bu renk de çok yakışırdı 💛'));
    if (furOwned(P, id)) update(D0 => void (D0.play.mokaFur = id === 'orman' ? null : id));
  };
  const pickItem = (it: Cosmetic) => {
    if (buying.current) return;
    haptic('light');
    const next: Worn = { ...worn };
    if (next[it.slot] === it.id) delete next[it.slot];
    else next[it.slot] = it.id;
    setWorn(next);
    setPop(n => n + 1);
    setSay(next[it.slot] ? tx('{} çok yakıştı!').replace('{}', tx(it.name)) : '');
    // Sahip olunan eşya anında kaydolur; alınmamış sadece önizlenir.
    if (cosmeticOwned(P.owned, it)) {
      update(draft => {
        const saved = { ...draft.play.mokaWorn };
        if (next[it.slot]) saved[it.slot] = it.id;
        else delete saved[it.slot];
        draft.play.mokaWorn = saved;
      });
    }
  };
  const clearAll = () => {
    if (buying.current) return;
    haptic('light');
    setWorn({});
    saveWorn({});
    setSay('');
  };

  const priceOf = tab === 'kurk' ? FUR_PRICE[fur] ?? 0 : sel?.price ?? 0;
  const ownNow = tab === 'kurk' ? furOwned(P, fur) : !sel || cosmeticOwned(P.owned, sel);
  const short = Math.max(0, priceOf - P.points);
  const locked = !!sel?.premium && !premium.active && !ownNow;
  const purchase = async () => {
    if (buying.current || ownNow || short || locked) return;
    buying.current = true;
    setBusy(true);
    try {
      const id = tab === 'kurk' ? `kurk_${fur}` : cosmeticKey(sel!.id);
      const result = await buy(id, null);
      if (!result.ok) return toast(result.error);
      if (tab === 'kurk') update(draft => void (draft.play.mokaFur = fur === 'orman' ? null : fur));
      else if (sel) update(draft => { draft.play.mokaWorn = { ...draft.play.mokaWorn, [sel.slot]: sel.id }; });
      sfx('done');
      haptic('success');
      setPop(n => n + 1);
      setSay(tx('Bu artık senin 💛'));
    } finally {
      buying.current = false;
      setBusy(false);
    }
  };

  const anyWorn = Object.keys(worn).length > 0;
  return (
    <View style={[st.screen, { backgroundColor: c.bg, paddingTop: insets.top + 6, paddingBottom: Math.max(8, insets.bottom) }]}>
      <View style={st.top}>
        <Squish onPress={back} accessibilityLabel={tx('Geri')} style={[st.navButton, { backgroundColor: c.surface, borderColor: c.line }]}>
          <Chevron color={c.ink} size={19} />
        </Squish>
        <Text accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3} style={[st.title, { color: c.ink }]}>{tx("Moka'nın dolabı")}</Text>
        <View accessible accessibilityLabel={tx('{} puan').replace('{}', String(P.points))} style={[st.points, { backgroundColor: D.paper, borderColor: D.line }]}>
          <PointStar /><Text maxFontSizeMultiplier={1.2} style={[st.pointsN, { color: D.ink }]}>{P.points}</Text>
        </View>
      </View>
      <View style={[st.stage, { height: stageHeight }]}>
        <Svg pointerEvents="none" width={width - 34} height={stageHeight - 2} viewBox="0 0 400 320" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0 }}>
          <Defs><RadialGradient id="studio" cx="48%" cy="48%" rx="65%" ry="85%">
            <Stop offset="0" stopColor="#94A48C" /><Stop offset="0.58" stopColor="#687E70" /><Stop offset="1" stopColor="#435C53" />
          </RadialGradient></Defs>
          <Rect width={400} height={320} fill="url(#studio)" />
        </Svg>
        <View pointerEvents="none" style={st.insetFrame} />
        <View style={{ marginTop: crownSpace }}>
          <MokaRig size={avatar} fur={fur === 'orman' ? null : fur} worn={worn} mood={ownNow ? 'happy' : 'wow'} pop={pop} />
        </View>
        {anyWorn && (
          <View style={st.resetPosition}>
            <Squish onPress={clearAll} disabled={busy} accessibilityLabel={tx('Hepsini çıkar')} style={[st.reset, { backgroundColor: D.paper }]}>
            <Svg width={17} height={17} viewBox="0 0 24 24"><Path d="M5 10a7.2 7.2 0 1 1 0 5 M5 4.8V10h5.2" fill="none" stroke={D.ink} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Squish>
          </View>
        )}
        {!!say && !compact && <View pointerEvents="none" style={st.caption}><Appear key={say}>
          <Text accessibilityLiveRegion="polite" numberOfLines={1} maxFontSizeMultiplier={1.2} style={st.say}>{say}</Text>
        </Appear></View>}
      </View>
      <View style={[st.tabs, { backgroundColor: c.surface2 }]} accessibilityRole="tablist">
        {([{ id: 'kurk' as Tab, label: 'Kürk' }, ...SLOTS]).map(t => {
          const on = tab === t.id;
          return (
            <Squish key={t.id} disabled={busy} dim={false} scaleTo={0.96} onPress={() => setTab(t.id as Tab)} accessibilityRole="tab" accessibilityState={{ selected: on }}
              style={[st.tab, { backgroundColor: on ? '#435E4E' : 'transparent' }]}>
              <Text numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2} style={[st.tabLabel, { color: on ? '#FFF7E8' : c.muted }]}>{tx(t.label)}</Text>
            </Squish>
          );
        })}
      </View>
      <ScrollView key={tab} style={st.catalog} contentContainerStyle={st.catalogInner} showsVerticalScrollIndicator={false}>
      <Appear>
      {tab === 'kurk' ? (
        <View style={st.row}>
          {FURS.map(f => {
            const on = fur === f.id;
            const mine = furOwned(P, f.id);
            return (
              <Squish disabled={busy} key={f.id} onPress={() => pickFur(f.id)} accessibilityRole="button" accessibilityLabel={`${tx(f.label)}${mine ? '' : `, ${FUR_PRICE[f.id]} ⭐`}`} accessibilityState={{ selected: on }} style={[st.cell, { backgroundColor: on ? c.accentSoft : c.surface, borderColor: on ? c.accent : c.line }]}>
                <View style={st.dotRing}><View style={[st.dot, { backgroundColor: f.swatch, shadowColor: D.shade }]}>{mine && savedFur === f.id && <Check />}</View></View>
                <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={[st.name, { color: c.ink }]}>{tx(f.label)}</Text>
                <View style={st.cost}>{!mine && <PointStar size={12} />}<Text maxFontSizeMultiplier={1.2} style={[st.price, { color: mine ? c.accent : c.muted }]}>{mine ? tx('Senin') : FUR_PRICE[f.id]}</Text></View>
              </Squish>
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
                disabled={busy} dim={false} style={[st.card, { backgroundColor: on ? D.paperNight : D.paper, borderColor: on ? D.ink : D.line, shadowColor: D.shade, shadowOpacity: on ? 0.2 : 0.08, opacity: lock ? 0.9 : 1 }]}>
                <View style={[st.cosmeticThumb, { backgroundColor: on ? '#D8E5D9' : '#EAE0D1' }]}>
                  <Image
                    source={COSMETIC_IMG[it.id]}
                    resizeMode="contain"
                    fadeDuration={0}
                    accessible={false}
                    style={[st.cosmeticArt, cosmeticThumbnailFrame(it.id)]}
                  />
                </View>
                <Text numberOfLines={2} maxFontSizeMultiplier={1.15} style={[st.name, { color: D.ink }]}>{tx(it.name)}</Text>
                <View style={[st.tag, { backgroundColor: mine ? '#DFEBDD' : '#EEE2D0' }]}>
                  <Text maxFontSizeMultiplier={1.15} style={{ fontFamily: fonts.bodyBold, fontSize: 11.5, color: mine ? '#365343' : '#634C37' }}>
                    {mine ? (on ? '✓' : tx('Senin')) : `${it.price}⭐`}{lock ? ' 👑' : ''}
                  </Text>
                </View>
              </Squish>
            );
          })}
        </View>
      )}

      </Appear>
      </ScrollView>
      <View style={[st.footer, { borderColor: c.line }]}>
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
        <Squish onPress={back} accessibilityLabel={tx('Tamam')} style={[st.buy, { backgroundColor: c.accent }]}>
          <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.bodyBlack, fontSize: 16, color: c.onAccent }}>{tx('Tamam')}</Text>
        </Squish>
      )}
      </View>
    </View>
  );
}

function PointStar({ size = 17 }: { size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9Z" fill="#EABE62" stroke="#8E632B" strokeWidth={1.5} strokeLinejoin="round" /></Svg>;
}

function Check() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M5 12.5l4.5 4.5L19 7.5" stroke="#FFFFFF" strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  navButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 16 },
  title: { flex: 1, fontFamily: fonts.displayBold, fontSize: 23 },
  points: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 5 },
  pointsN: { fontFamily: fonts.bodyBlack, fontSize: 15 },
  cosmeticThumb: { width: COSMETIC_TILE_SIZE, height: COSMETIC_TILE_SIZE, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cosmeticArt: { position: 'absolute' },
  dotRing: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  stage: { alignItems: 'center', borderRadius: 26, overflow: 'hidden', backgroundColor: '#516B5D', borderColor: '#A79776', borderWidth: 1 },
  insetFrame: { position: 'absolute', top: 5, bottom: 5, left: 5, right: 5, borderRadius: 21, borderColor: 'rgba(246,224,177,0.32)', borderWidth: 1 },
  resetPosition: { position: 'absolute', top: 9, end: 9 },
  reset: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  caption: { position: 'absolute', bottom: 8, alignItems: 'center', maxWidth: '90%' },
  say: { color: '#FFF7E9', backgroundColor: '#344D41', borderRadius: 12, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 3, fontFamily: fonts.bodyBold, fontSize: 12 },
  tabs: { flexDirection: 'row', borderRadius: 18, padding: 3, marginVertical: 10 },
  tab: { flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 15 },
  tabLabel: { fontFamily: fonts.bodyBlack, fontSize: 14 },
  catalog: { flex: 1 }, catalogInner: { paddingBottom: 12 },
  footer: { paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginTop: 8 },
  cell: { width: '23.5%', alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 96, borderRadius: 18, borderWidth: 1, paddingVertical: 6 },
  cost: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.18, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  price: { fontFamily: fonts.bodyBold, fontSize: 12.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  card: { width: '31%', minHeight: 142, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 6, gap: 4, shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },

  name: { fontFamily: fonts.bodyBold, fontSize: 12.5, textAlign: 'center' },
  tag: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  buy: { height: 48, shadowColor: '#2A1C12', shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', marginTop: 0 },
});
