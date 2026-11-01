import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { premiumHref } from '@/components/PaywallMoments';
import { Btn, T } from '@/components/ui';
import { ITEMS } from '@/domain/items';
import { emptyPaywallMemory, markPaywallShown, shouldShowPaywall, type PaywallMemory } from '@/domain/paywall';
import { progressOf } from '@/domain/play';
import { track } from '@/lib/events';
import { prefs } from '@/lib/supabase';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import { useColors } from '@/theme';

const LEVEL_KEY = 'levelSeen';
const MEM_KEY = 'paywallMem';

/**
 * Ev seviye atlayınca (ücretsiz kullanıcıya) kilitli Premium eşyalardan 3'ünü gösterir.
 * Paywall kurallarına uyarsa "Premium'a bak" da çıkar; evin büyümesi hiçbir zaman kilitlenmez.
 */
export function LevelUpPeek() {
  const c = useColors();
  const router = useRouter();
  const { state: S } = useStore();
  const { premium } = usePurchases();
  const level = progressOf(S.play).level;
  const [closed, setClosed] = useState(false);
  const seenRaw = prefs.get(LEVEL_KEY);
  // İlk açılışta mevcut seviye "görülmüş" sayılır; sadece sonraki atlamalarda çıkar.
  if (seenRaw == null && level > 0) prefs.set(LEVEL_KEY, String(level));
  const seen = Number(seenRaw ?? level);
  const show = !premium.active && !closed && level > seen;
  const items = useMemo(() => ITEMS.filter(i => i.premium && !S.play.owned.includes(i.id)).slice(0, 3), [S.play.owned]);
  const offer = useMemo(() => {
    if (!show) return false;
    try {
      const m = { ...emptyPaywallMemory(), ...(JSON.parse(prefs.get(MEM_KEY) ?? 'null') as PaywallMemory | null) };
      return shouldShowPaywall('levelup', m, false);
    } catch {
      return false;
    }
  }, [show]);

  if (!show || !items.length) return null;
  const close = (go: boolean) => {
    prefs.set(LEVEL_KEY, String(level));
    track('levelup_peek');
    if (offer) {
      try {
        const m = { ...emptyPaywallMemory(), ...(JSON.parse(prefs.get(MEM_KEY) ?? 'null') as PaywallMemory | null) };
        prefs.set(MEM_KEY, JSON.stringify(markPaywallShown(m)));
      } catch {
        // Hafıza yazılamazsa paywall bir daha çıkabilir, zarar yok.
      }
    }
    setClosed(true);
    if (go) router.push(premiumHref('levelup'));
  };
  return (
    <Modal transparent animationType="fade" onRequestClose={() => close(false)}>
      <View style={[styles.bg, { backgroundColor: c.shadow }]}>
        <View style={[styles.box, { backgroundColor: c.surface }]}>
          <T v="h1" style={{ textAlign: 'center' }}>Evin büyüdü! 🏡</T>
          <T v="lead" style={{ textAlign: 'center', marginTop: 0 }}>Yeni seviyeye ulaştın. Premium eşyalar da seni bekliyor:</T>
          <View style={styles.row}>
            {items.map(i => (
              <View key={i.id} style={[styles.item, { backgroundColor: c.surface2 }]}>
                <Text style={{ fontSize: 34 }}>{i.emoji}</Text>
                <T v="small" style={{ textAlign: 'center' }}>{i.name}</T>
              </View>
            ))}
          </View>
          {offer && <Btn label="Premium'a bak ⭐" onPress={() => close(true)} block />}
          <Btn kind="primary" label="Devam" onPress={() => close(false)} block />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  box: { borderRadius: 40, padding: 28, gap: 16, alignItems: 'center', maxWidth: 400, width: '100%' },
  row: { flexDirection: 'row', gap: 10 },
  item: { flex: 1, alignItems: 'center', gap: 4, borderRadius: 22, paddingVertical: 14 },
});
