import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { usePurchases } from '@/purchases/PurchasesProvider';
import { fonts, useColors, radius } from '@/theme';

import { bannerUnit, getAds, startAds } from './ads';

/** Sayfanın en altındaki küçük reklam afişi. Premium'da, Expo Go'da ve reklam yüklenemezse hiçbir şey göstermez. */
export function AdBanner() {
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

  const ads = getAds();
  if (!show || !ok || failed || !ads || !unit) return null;
  const { BannerAd, BannerAdSize } = ads;
  return (
    <View style={[styles.wrap, { backgroundColor: c.surface }]}>
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
  label: { fontFamily: fonts.bodyBold, fontSize: 12 },
});
