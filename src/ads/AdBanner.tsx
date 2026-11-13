import { useEffect, useState, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { usePurchases } from '@/purchases/PurchasesProvider';
import { fonts, useColors, radius } from '@/theme';

import { bannerUnit, getAds, startAds } from './ads';

/** Sabit afişin kapladığı yükseklik (0 = görünmüyor); sekme ekranları alt boşluğuna ekler. */
let dockH = 0;
const subs = new Set<() => void>();
function setDockH(h: number) {
  if (h === dockH) return;
  dockH = h;
  subs.forEach(f => f());
}
export function useAdDockInset(): number {
  return useSyncExternalStore(
    cb => {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
    () => dockH,
    () => 0,
  );
}

/** Sayfanın en altındaki küçük reklam afişi. Premium'da, Expo Go'da ve reklam yüklenemezse hiçbir şey göstermez. */
export function AdBanner({ dock = false }: { dock?: boolean } = {}) {
  const c = useColors();
  const { ready: purchasesReady, premium } = usePurchases();
  const [ok, setOk] = useState(false);
  const [failed, setFailed] = useState(false);
  const unit = bannerUnit();
  const show = purchasesReady && !premium.active && !!unit;

  useEffect(() => {
    if (!show) return;
    let alive = true;
    startAds().then(r => alive && setOk(r));
    return () => {
      alive = false;
    };
  }, [show]);

  const visible = show && ok && !failed;
  useEffect(() => {
    if (!dock) return;
    if (!visible) setDockH(0);
    return () => setDockH(0);
  }, [dock, visible]);

  const ads = getAds();
  if (!show || !ok || failed || !ads || !unit) return null;
  const { BannerAd, BannerAdSize } = ads;
  return (
    <View
      style={[styles.wrap, dock && styles.dock, { backgroundColor: c.surface }]}
      onLayout={dock ? e => setDockH(Math.ceil(e.nativeEvent.layout.height) + 8) : undefined}
    >
      <Text style={[styles.label, { color: c.muted }]}>Reklam · Premium{"'"}da reklam yok</Text>
      <BannerAd
        unitId={unit}
        size={BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 4, marginTop: 16, marginBottom: 8, borderRadius: radius.tile, paddingVertical: 8, overflow: 'hidden' },
  dock: { marginTop: 0, marginBottom: 8 },
  label: { fontFamily: fonts.bodyBold, fontSize: 12 },
});
