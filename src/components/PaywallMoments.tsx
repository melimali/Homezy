import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { MokaMascot } from '@/components/MokaMascot';
import { Btn, T } from '@/components/ui';
import {
  emptyPaywallMemory, isStreakMark, markFirstSeen, markPaywallShown, shouldShowPaywall,
  type PaywallMemory, type PaywallMoment,
} from '@/domain/paywall';
import { progressOf } from '@/domain/play';
import { THEMES } from '@/domain/premium';
import { prefs } from '@/lib/supabase';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import { useColors } from '@/theme';

const MEM_KEY = 'paywallMem';
const STREAK_KEY = 'streakSeen';
const WAS_KEY = 'wasPremium';

const readMem = (): PaywallMemory => {
  try {
    const m = JSON.parse(prefs.get(MEM_KEY) ?? 'null') as PaywallMemory | null;
    return m && typeof m === 'object' ? { ...emptyPaywallMemory(), ...m } : emptyPaywallMemory();
  } catch {
    return emptyPaywallMemory();
  }
};
const writeMem = (m: PaywallMemory) => prefs.set(MEM_KEY, JSON.stringify(m));

/** Paywall'a giderken hangi anın başlığı gösterilsin (`/premium?moment=…`). */
export const premiumHref = (moment: PaywallMoment): Href => `/premium?moment=${moment}` as Href;

/**
 * Seri 3 / 7 / 14 / 30 günü olunca bir kere kutlar. Paywall kurallarına uyuyorsa
 * (günde 1, ilk 3 gün yok, Premium'a hiç) kutlamanın altında "Premium'a bak" düğmesi de çıkar.
 */
export function StreakMoment() {
  const c = useColors();
  const router = useRouter();
  const { state: S } = useStore();
  const { premium } = usePurchases();
  const hp = progressOf(S.play);
  const mark = hp.today && isStreakMark(hp.streak) ? hp.streak : 0;
  const [closed, setClosed] = useState(false);
  const seen = Number(prefs.get(STREAK_KEY) ?? 0);
  const show = !closed && mark > 0 && mark > seen;
  const offer = useMemo(
    () => show && shouldShowPaywall('streak', readMem(), premium.active),
    [show, premium.active],
  );

  useEffect(() => {
    writeMem(markFirstSeen(readMem()));
  }, []);

  if (!show) return null;
  const close = (toPremium: boolean) => {
    prefs.set(STREAK_KEY, String(mark));
    if (offer) writeMem(markPaywallShown(readMem()));
    setClosed(true);
    if (toPremium) router.push(premiumHref('streak'));
  };
  return (
    <Modal transparent animationType="fade" onRequestClose={() => close(false)}>
      <View style={[styles.bg, { backgroundColor: c.shadow }]}>
        <View style={[styles.box, { backgroundColor: c.surface }]}>
          <MokaMascot pose="party" size="lg" showBubble={false} style={styles.moka} />
          <T v="h1" style={{ textAlign: 'center' }}>🔥 {mark} günlük seri!</T>
          <T v="lead" style={{ textAlign: 'center', marginTop: 0 }}>
            {mark} gün üst üste evine vakit ayırdın. Evin ve bahçen sana teşekkür ediyor 🌷
          </T>
          {offer && <Btn label="Premium'a bak ⭐" onPress={() => close(true)} block />}
          <Btn kind="primary" label="Yaşasın!" onPress={() => close(false)} block />
        </View>
      </View>
    </Modal>
  );
}

/**
 * Premium bitince bir kere: ilerleme ve veri duruyor, sadece görünüm Gündüz'e dönüyor.
 * Neyin beklediğini gösterir; kapatılabilir, tekrar çıkmaz (yeniden Premium olunca sıfırlanır).
 */
export function PremiumEndedCard() {
  const c = useColors();
  const router = useRouter();
  const { state: S } = useStore();
  const { premium } = usePurchases();
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (premium.active) prefs.set(WAS_KEY, '1');
  }, [premium.active]);

  if (premium.active || closed || prefs.get(WAS_KEY) !== '1') return null;
  const theme = THEMES.find(t => t.id === S.settings.theme && t.premium);
  const close = () => {
    prefs.set(WAS_KEY, null);
    setClosed(true);
  };
  return (
    <View style={[styles.card, { backgroundColor: c.todaySoft }]}>
      <T v="bold">Premium sona erdi 🎁</T>
      <T v="small">
        İlerlemen, serin ve verilerin olduğu gibi duruyor.
        {theme ? ` ${theme.emoji} ${theme.name} teması Gündüz'e döndü; Premium'a dönersen geri gelir.` : ' Premium temaların ve Moka kıyafetlerin Premium\'a dönünce seni bekliyor.'}
      </T>
      <View style={styles.row}>
        <Btn small kind="primary" label="Geri dön ⭐" onPress={() => { close(); router.push('/premium'); }} />
        <Btn small kind="ghost" label="Tamam" onPress={close} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  moka: { marginTop: -100 },
  box: { borderRadius: 40, padding: 28, paddingTop: 0, marginTop: 90, gap: 16, alignItems: 'center', maxWidth: 400, width: '100%' },
  card: { borderRadius: 22, padding: 16, gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
});
