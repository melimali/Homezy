import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/components/Toast';
import { Btn, T } from '@/components/ui';
import { FEATURES } from '@/domain/premium';
import { type Plan, usePurchases } from '@/purchases/PurchasesProvider';
import { brand, fonts, radius, useColors } from '@/theme';

/** Ücretsiz ile Premium arasındaki farklar `src/domain/premium.ts` içinde (`FEATURES`). */
const ROWS = FEATURES;
const short = (v: string) => v === '✓' || v === '—';

/**
 * Ücretsiz mi Premium mu? Uygulama ilk açıldığında açılış animasyonundan hemen sonra çıkar,
 * sonra Hesabım'dan tekrar açılabilir. `onDone` seçim yapılınca (ya da satın alma bitince) çağrılır.
 */
export function PremiumChoice({ onDone, onClose }: { onDone: () => void; onClose?: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { premium, prices, annualPerMonth, annualSave, introPrice, buy, restore } = usePurchases();
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [plan, setPlan] = useState<Plan>('monthly');
  const unit = plan === 'annual' ? 'yıl' : 'ay';
  const intro = plan === 'monthly' ? introPrice : null;

  const doBuy = async () => {
    setBusy('buy');
    const r = await buy(plan);
    setBusy(null);
    if (r.ok) {
      if (r.active) toast('Premium açıldı. Hoş geldin! 🎉');
      onDone();
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
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 48 }}>🏡</Text>
        <T v="h1" style={{ textAlign: 'center' }}>Nasıl başlamak istersin?</T>
        <T v="lead" style={{ textAlign: 'center', marginTop: 0 }}>Evin işleri her iki planda da ücretsiz. Premium serini korur, evini güzelleştirir, ailenle paylaştırır ve reklamları kaldırır.</T>
      </View>

      <View style={styles.plans}>
        <View style={[styles.plan, { backgroundColor: c.surface, borderColor: c.line }]}>
          <Text style={[styles.planName, { color: c.ink }]}>Ücretsiz</Text>
          <Text style={[styles.price, { color: c.ink }]}>$0</Text>
          <T v="small">her zaman</T>
        </View>
        <View style={[styles.plan, { backgroundColor: brand.navy, borderColor: brand.navy }]}>
          <View style={[styles.tag, { backgroundColor: brand.clay }]}>
            <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 11, color: brand.navy }}>⭐ PREMIUM</Text>
          </View>
          <Text style={[styles.price, { color: brand.mint }]}>{intro ?? prices[plan]}</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: 'rgba(235,245,238,0.75)' }}>
            {intro ? 'ilk ay' : plan === 'annual' ? 'yıllık' : 'aylık'}
          </Text>
        </View>
      </View>

      {!premium.active && (
        <View style={{ gap: 10 }}>
          <PlanRow
            selected={plan === 'annual'}
            onPress={() => setPlan('annual')}
            title="Yıllık"
            price={`${prices.annual}/yıl`}
            note={annualPerMonth ? `Ayda ${annualPerMonth}` : undefined}
            badge={annualSave > 0 ? `%${annualSave} indirim` : undefined}
          />
          <PlanRow
            selected={plan === 'monthly'}
            onPress={() => setPlan('monthly')}
            title="Aylık"
            price={`${prices.monthly}/ay`}
            note={introPrice ? `İlk ay ${introPrice}, sonra ${prices.monthly}/ay` : undefined}
            badge={introPrice ? 'İlk aya özel' : undefined}
          />
        </View>
      )}

      <View style={[styles.table, { backgroundColor: c.surface }]}>
        <View style={styles.row}>
          <View style={{ flex: 1 }} />
          <Text style={[styles.colHead, { color: c.muted }]}>Ücretsiz</Text>
          <Text style={[styles.colHead, { color: c.warm }]}>Premium</Text>
        </View>
        {ROWS.map(r => (
          <View key={r.label} style={[styles.row, { borderTopWidth: 1.5, borderTopColor: c.line }]}>
            <Text style={{ fontSize: 20 }}>{r.emoji}</Text>
            <T v="bold" style={{ flex: 1, fontSize: 13.5 }}>{r.label}</T>
            <Text style={[styles.cell, { color: r.free === '—' ? c.muted : c.ink }, short(r.free) && styles.check]}>{r.free}</Text>
            <Text style={[styles.cell, { color: c.ok }, short(r.premium) && styles.check]}>{r.premium}</Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 10 }}>
        {premium.active ? (
          <Btn kind="primary" label="Premium üyeliğin etkin 🎉" onPress={onDone} />
        ) : (
          <Btn kind="primary" label={busy === 'buy' ? 'Açılıyor…' : intro ? `Premium ile başla · ilk ay ${intro}` : `Premium ile başla · ${prices[plan]}/${unit}`} onPress={doBuy} disabled={!!busy} />
        )}
        <Btn kind="ghost" label={onClose ? 'Kapat' : 'Ücretsiz devam et'} onPress={onClose ?? onDone} disabled={!!busy} />
      </View>

      <T v="small" style={{ textAlign: 'center' }}>
        {intro ? `İlk ay ${intro}, sonra her ay ${prices.monthly}. ` : ''}Premium her {unit} kendiliğinden yenilenir. İstediğin zaman App Store ya da Google Play abonelik ayarlarından iptal edebilirsin.
        Ödemeyi mağaza alır, kart bilgilerin bize gelmez.
      </T>
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
          <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 11, color: brand.navy }}>{badge}</Text>
        </View>
      )}
      <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 15, color: c.ink }}>{price}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.card, borderWidth: 0 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
  wrap: { paddingHorizontal: 18, gap: 18, width: '100%', maxWidth: 520, alignSelf: 'center' },
  plans: { flexDirection: 'row', gap: 12 },
  plan: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: radius.card, borderWidth: 0, gap: 2 },
  planName: { fontFamily: fonts.bodyBlack, fontSize: 13, paddingVertical: 3 },
  tag: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  price: { fontFamily: fonts.displayBold, fontSize: 34, lineHeight: 40 },
  table: { borderRadius: radius.card, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  colHead: { width: 72, textAlign: 'center', fontFamily: fonts.bodyBlack, fontSize: 12 },
  cell: { width: 72, textAlign: 'center', fontFamily: fonts.bodyBlack, fontSize: 12.5 },
  check: { fontSize: 20 },
});
