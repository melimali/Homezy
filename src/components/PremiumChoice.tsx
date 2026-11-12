import { useBusy } from './BusyOverlay';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/components/Toast';
import { Btn, T } from '@/components/ui';
import { MOMENT_COPY, type PaywallMoment } from '@/domain/paywall';
import { PAYWALL_COPY } from '@/domain/paywallCopy';
import { FEATURES, FREE_CORE } from '@/domain/premium';
import { MOKA_ASSETS } from '@/constants/moka';
import { Appear, Float } from '@/components/motion';
import { track } from '@/lib/events';
import { legalUrl, openLink } from '@/lib/links';
import { useStore } from '@/store/AppStore';
import { type Plan, usePurchases } from '@/purchases/PurchasesProvider';
import { brand, fonts, radius, useColors } from '@/theme';

/** Ücretsiz ile Premium arasındaki farklar `src/domain/premium.ts` içinde (`FEATURES`). */
const ROWS = FEATURES;
const short = (v: string) => v === '✓' || v === '—';

/**
 * Ücretsiz mi Premium mu? Uygulama ilk açıldığında açılış animasyonundan hemen sonra çıkar,
 * sonra Hesabım'dan tekrar açılabilir. `onDone` seçim yapılınca (ya da satın alma bitince) çağrılır.
 */
export function PremiumChoice({ onDone, onClose, moment }: { onDone: () => void; onClose?: () => void; moment?: PaywallMoment }) {
  const { state: S } = useStore();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { premium, prices, annualPerMonth, annualSave, trialDays, buy, restore } = usePurchases();
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  useBusy(!!busy);
  const [plan, setPlan] = useState<Plan>('annual');
  const lang = S.settings.language === 'tr' ? 'tr' : 'en';
  const L = PAYWALL_COPY[lang];
  const unit = plan === 'annual' ? L.unitY : L.unitM;
  const trial = trialDays[plan];
  useEffect(() => {
    track('paywall_view', moment ?? 'manual');
  }, [moment]);
  const copy = moment ? MOMENT_COPY[moment] : undefined;

  const doBuy = async () => {
    setBusy('buy');
    const r = await buy(plan);
    setBusy(null);
    if (r.ok) {
      track('paywall_buy', moment ?? 'manual');
      if (r.active) {
        toast('Premium açıldı. Hoş geldin! 🎉');
        onDone();
      } else toast('Ödeme alındı, Premium birazdan açılır. Açılmazsa "Satın alımları geri yükle"ye dokun.');
    } else if (!r.cancelled) toast(r.error);
  };

  const doRestore = async () => {
    setBusy('restore');
    const r = await restore();
    setBusy(null);
    if (!r.ok) return toast(r.error);
    if (r.active) {
      toast('Premium üyeliğin geri yüklendi.');
      onDone();
    } else toast('Bu mağaza hesabında etkin bir üyelik bulunamadı.');
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={[styles.hero, { backgroundColor: brand.navy }]}>
        <Float amp={5} dur={2200}>
          <Image source={MOKA_ASSETS.love} style={styles.mokaImg} resizeMode="contain" />
        </Float>
        <Text style={[styles.eyebrow, { color: brand.clay }]}>{L.eyebrow}</Text>
        <Text style={[styles.heroTitle, { color: brand.mint }]}>{L.title}</Text>
        {copy ? <Text style={[styles.heroMoment, { color: brand.clay }]}>{copy.title}: {copy.text}</Text> : null}
        <Text style={[styles.heroSub, { color: 'rgba(235,245,238,0.85)' }]}>{L.sub}</Text>
      </View>

      <View style={[styles.chatCard, { backgroundColor: c.surface, borderColor: c.line }]}>
        <T v="h2">💬 {L.chatTitle}</T>
        <T v="small">{L.chatSub}</T>
        {L.chat.map((m, i) => (
          <Appear key={i} index={i}>
            <View style={[styles.bubble, m.who === 'me' ? { alignSelf: 'flex-end', backgroundColor: brand.blue } : { alignSelf: 'flex-start', backgroundColor: c.bg, borderColor: c.line, borderWidth: 1.5 }]}>
              <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: m.who === 'me' ? brand.navy : c.ink }}>{m.text}</Text>
            </View>
          </Appear>
        ))}
      </View>

      <View style={{ gap: 8 }}>
        <T v="h2">🔒 {L.lockedTitle}</T>
        {L.locked.map(f => (
          <View key={f.title} style={[styles.lockRow, { backgroundColor: c.surface }]}>
            <Text style={{ fontSize: 26, lineHeight: 32 }}>{f.emoji}</Text>
            <View style={{ flex: 1 }}>
              <T v="bold">{f.title}</T>
              <T v="small">{f.text}</T>
            </View>
          </View>
        ))}
      </View>

      <T v="h2">{L.plansTitle}</T>
      <View style={styles.plans}>
        <View style={[styles.plan, { backgroundColor: c.surface, borderColor: c.line }]}>
          <Text style={[styles.planName, { color: c.ink }]}>{lang === 'tr' ? 'Ücretsiz' : 'Free'}</Text>
          <Text style={[styles.price, { color: c.ink }]}>{S.settings.language === 'tr' ? '0 TL' : '$0'}</Text>
          <T v="small">{lang === 'tr' ? 'her zaman' : 'always'}</T>
        </View>
        <View style={[styles.plan, { backgroundColor: brand.navy, borderColor: brand.navy }]}>
          <View style={[styles.tag, { backgroundColor: brand.clay }]}>
            <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 12, color: brand.navy }}>⭐ PREMIUM</Text>
          </View>
          <Text style={[styles.price, { color: brand.mint }]}>{prices[plan]}</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 13.5, color: 'rgba(235,245,238,0.75)' }}>
            {plan === 'annual' ? (lang === 'tr' ? 'yıllık abonelik (her yıl yenilenir)' : 'yearly (renews every year)') : (lang === 'tr' ? 'aylık abonelik (her ay yenilenir)' : 'monthly (renews every month)')}
          </Text>
          {trial ? <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 13, color: brand.clay }}>{L.trialLine(trial)}</Text> : null}
        </View>
      </View>

      {!premium.active && (
        <View style={{ gap: 10 }}>
          <PlanRow
            selected={plan === 'annual'}
            onPress={() => setPlan('annual')}
            title="Yıllık"
            price={`${prices.annual}/yıl`}
            note={trialDays.annual ? `${trialDays.annual} gün ücretsiz, sonra ${prices.annual}/yıl` : annualPerMonth ? `Ayda ${annualPerMonth}` : undefined}
            badge={trialDays.annual ? `${trialDays.annual} gün ücretsiz` : annualSave > 0 ? `%${annualSave} indirim` : undefined}
          />
          <PlanRow
            selected={plan === 'monthly'}
            onPress={() => setPlan('monthly')}
            title="Aylık"
            price={`${prices.monthly}/ay`}
            note={trialDays.monthly ? `${trialDays.monthly} gün ücretsiz, sonra ${prices.monthly}/ay` : undefined}
            badge={trialDays.monthly ? `${trialDays.monthly} gün ücretsiz` : undefined}
          />
        </View>
      )}

      <T v="h2">{L.compare}</T>
      <T v="small" style={{ textAlign: 'center' }}>{FREE_CORE}</T>

      <View style={[styles.table, { backgroundColor: c.surface }]}>
        <View style={styles.row}>
          <View style={{ flex: 1 }} />
          <Text style={[styles.colHead, { color: c.muted }]}>Ücretsiz</Text>
          <Text style={[styles.colHead, { color: c.warm }]}>Premium</Text>
        </View>
        {ROWS.map(r => (
          <View key={r.label} style={[styles.row, { borderTopWidth: 1.5, borderTopColor: c.line }]}>
            <Text style={{ lineHeight: 26, fontSize: 20 }}>{r.emoji}</Text>
            <T v="bold" style={{ flex: 1, flexShrink: 1, fontSize: 13.5 }}>{r.label}</T>
            <Text style={[styles.cell, { color: r.free === '—' ? c.muted : c.ink }, short(r.free) && styles.check]}>{r.free}</Text>
            <Text style={[styles.cell, { color: c.ok }, short(r.premium) && styles.check]}>{r.premium}</Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 10 }}>
        {premium.active ? (
          <Btn kind="primary" label="Premium üyeliğin etkin 🎉" onPress={onDone} />
        ) : (
          <>
          <Btn kind="primary" label={busy === 'buy' ? '…' : trial ? L.ctaTrial(trial) : L.ctaBuy(prices[plan], unit)} onPress={doBuy} disabled={!!busy} />
          {trial ? <T v="small" style={{ textAlign: 'center' }}>{L.ctaNote}</T> : null}
          </>
        )}
        <Btn kind="ghost" label={L.skip} onPress={onClose ?? onDone} disabled={!!busy} />
      </View>

      <T v="small" style={{ textAlign: 'center' }}>
        {`Homezy Premium (${plan === 'annual' ? 'Yıllık' : 'Aylık'}): ${prices[plan]}/${unit}. ${trial ? `İlk ${trial} gün ücretsiz; deneme bitmeden iptal etmezsen ${prices[plan]}/${unit} tahsil edilir. ` : ''}Ödeme satın alma onayında Apple ID / Google Play hesabından alınır. Abonelik, dönem bitiminden en az 24 saat önce iptal edilmezse her ${unit} kendiliğinden yenilenir. İptal ve yönetim: App Store / Google Play abonelik ayarları. Kart bilgilerin bize gelmez. Satın alarak Kullanım Koşulları’nı (Apple standart EULA dahil) ve Gizlilik Politikası’nı kabul edersin.`}
      </T>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
        <T v="small" style={{ textDecorationLine: 'underline' }} onPress={() => openLink(legalUrl('terms', S.settings.language))} accessibilityRole="link">Kullanım Koşulları</T>
        <T v="small" style={{ textDecorationLine: 'underline' }} onPress={() => openLink(legalUrl('privacy', S.settings.language))} accessibilityRole="link">Gizlilik Politikası</T>
      </View>
      {!premium.active && (
        <Btn kind="ghost" small label={busy === 'restore' ? 'Geri yükleniyor…' : 'Satın alımları geri yükle'} onPress={doRestore} disabled={!!busy} style={{ alignSelf: 'center' }} />
      )}
    </ScrollView>
  );
}

function PlanRow({ selected, onPress, title, price, note, badge }: {
  selected: boolean;
  onPress: () => void;
  title: string;
  price: string;
  note?: string;
  badge?: string;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.planRow, { backgroundColor: c.surface, borderColor: selected ? c.accent : c.line }]}
    >
      <View style={[styles.radio, { borderColor: selected ? c.accent : c.line }]}>
        {selected && <View style={[styles.radioDot, { backgroundColor: c.accent }]} />}
      </View>
      <View style={{ flex: 1 }}>
        <T v="bold">{title}</T>
        {note && <T v="small">{note}</T>}
      </View>
      {badge && (
        <View style={[styles.tag, { backgroundColor: brand.clay }]}>
          <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 12, color: brand.navy }}>{badge}</Text>
        </View>
      )}
      <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 15, color: c.ink }}>{price}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 28, paddingHorizontal: 20, paddingVertical: 22, alignItems: 'center', gap: 8 },
  mokaImg: { width: 150, height: 150 },
  eyebrow: { fontFamily: fonts.bodyBlack, fontSize: 12, letterSpacing: 1.2 },
  heroTitle: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 34, textAlign: 'center' },
  heroMoment: { fontFamily: fonts.bodyBold, fontSize: 13, textAlign: 'center' },
  heroSub: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 21, textAlign: 'center' },
  chatCard: { borderRadius: 22, borderWidth: 1.5, padding: 14, gap: 10 },
  bubble: { maxWidth: '88%', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9 },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.card, borderWidth: 0 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
  wrap: { paddingHorizontal: 18, gap: 18, width: '100%', maxWidth: 520, alignSelf: 'center' },
  plans: { flexDirection: 'row', gap: 12 },
  plan: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: radius.card, borderWidth: 0, gap: 2 },
  planName: { fontFamily: fonts.bodyBlack, fontSize: 13.5, paddingVertical: 3 },
  tag: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  price: { fontFamily: fonts.displayBold, fontSize: 34, lineHeight: 40 },
  table: { borderRadius: radius.card, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  colHead: { width: 72, textAlign: 'center', fontFamily: fonts.bodyBlack, fontSize: 12 },
  cell: { width: 62, textAlign: 'center', fontFamily: fonts.bodyBlack, fontSize: 12 },
  check: { lineHeight: 26, fontSize: 20 },
});
