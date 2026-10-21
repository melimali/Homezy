import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Linking, Platform } from 'react-native';
import Purchases, { type CustomerInfo } from 'react-native-purchases';

import { useAuth } from '@/auth/AuthProvider';

/**
 * Abonelikler RevenueCat üzerinden App Store ve Google Play'in kendi ödeme sistemiyle alınır.
 * Kart bilgisi hiçbir zaman bize ya da RevenueCat'e gelmez; ödemeyi mağaza alır.
 * RevenueCat kullanıcıyı Supabase kullanıcı kimliğiyle (`appUserID`) tanır. Abonelik durumu ayrıca
 * RevenueCat webhook'u ile Supabase'deki `subscriptions` tablosuna yazılır (bkz. docs/hesap.md).
 *
 * Expo Go'da SDK kendiliğinden önizleme modunda çalışır; gerçek satın alma için development build gerekir.
 */
export const ENTITLEMENT = 'premium';

const apiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

export const purchasesEnabled = Boolean(apiKey);

export type Premium = {
  active: boolean;
  /** Aboneliğin biteceği ya da yenileneceği zaman (ms). */
  until: number | null;
  willRenew: boolean;
  productId: string | null;
};

type RestoreResult = { ok: true; active: boolean } | { ok: false; error: string };

type PurchasesCtx = {
  ready: boolean;
  premium: Premium;
  restore: () => Promise<RestoreResult>;
  /** Mağazanın abonelik yönetim sayfasını açar (iptal etme, plan değiştirme). */
  manage: () => Promise<void>;
};

const none: Premium = { active: false, until: null, willRenew: false, productId: null };

const PurchasesContext = createContext<PurchasesCtx | null>(null);

function readPremium(info: CustomerInfo): Premium {
  const e = info.entitlements.active[ENTITLEMENT];
  if (!e) return none;
  return { active: true, until: e.expirationDateMillis, willRenew: e.willRenew, productId: e.productIdentifier };
}

export function PurchasesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [premium, setPremium] = useState<Premium>(none);
  const managementURL = useRef<string | null>(null);
  const configured = useRef(false);

  const apply = useCallback((info: CustomerInfo) => {
    managementURL.current = info.managementURL;
    setPremium(readPremium(info));
  }, []);

  // İlk açılışta bir kere kur, sonra müşteri bilgisi değiştikçe güncelle.
  useEffect(() => {
    if (!apiKey || configured.current) return;
    configured.current = true;
    Purchases.configure({ apiKey, appUserID: user?.id ?? null });
    Purchases.addCustomerInfoUpdateListener(apply);
    Purchases.getCustomerInfo().then(apply).catch(() => {}).finally(() => setReady(true));
    return () => {
      Purchases.removeCustomerInfoUpdateListener(apply);
    };
    // Kullanıcı değişimi aşağıdaki effect'te; burada sadece ilk kurulum.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apply]);

  // Giriş / çıkış yapılınca RevenueCat'teki kullanıcıyı değiştir.
  const lastId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!apiKey || !configured.current) return;
    const id = user?.id ?? null;
    if (lastId.current === undefined) {
      lastId.current = id;
      return;
    }
    if (lastId.current === id) return;
    lastId.current = id;
    (async () => {
      try {
        if (id) apply((await Purchases.logIn(id)).customerInfo);
        else if (!(await Purchases.isAnonymous())) apply(await Purchases.logOut());
      } catch {
        // Bağlantı yoksa bir sonraki açılışta düzelir.
      }
    })();
  }, [user?.id, apply]);

  const restore = useCallback(async (): Promise<RestoreResult> => {
    if (!apiKey) return { ok: false, error: 'Satın almalar bu sürümde henüz açık değil.' };
    try {
      const info = await Purchases.restorePurchases();
      apply(info);
      return { ok: true, active: !!info.entitlements.active[ENTITLEMENT] };
    } catch {
      return { ok: false, error: 'Satın almalar geri yüklenemedi. İnternet bağlantını ve mağaza hesabını kontrol et.' };
    }
  }, [apply]);

  const manage = useCallback(async () => {
    const fallback = Platform.OS === 'ios'
      ? 'https://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions';
    await Linking.openURL(managementURL.current ?? fallback).catch(() => {});
  }, []);

  const value = useMemo(() => ({ ready: ready || !apiKey, premium, restore, manage }), [ready, premium, restore, manage]);
  return <PurchasesContext.Provider value={value}>{children}</PurchasesContext.Provider>;
}

export function usePurchases() {
  const p = useContext(PurchasesContext);
  if (!p) throw new Error('usePurchases, PurchasesProvider içinde kullanılmalı');
  return p;
}
