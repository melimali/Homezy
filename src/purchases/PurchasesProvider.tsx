import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Linking, Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

import { useAuth } from '@/auth/AuthProvider';
import { supabase } from '@/lib/supabase';

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

export type Plan = 'monthly' | 'annual';

/** Mağaza fiyatı henüz okunamadıysa gösterilen fiyatlar. Gerçek fiyat mağaza panelinde girilir. */
export const PREMIUM_PRICE: Record<Plan, string> = { monthly: '$6.99', annual: '$59.99' };
/** İlk aya özel fiyat. Gerçek teklif Google Play'de aylık plana "giriş teklifi" olarak tanımlanır. */
export const INTRO_PRICE = '$4.99';

export type Premium = {
  active: boolean;
  /** Aboneliğin biteceği ya da yenileneceği zaman (ms). */
  until: number | null;
  willRenew: boolean;
  productId: string | null;
};

type RestoreResult = { ok: true; active: boolean } | { ok: false; error: string };
type BuyResult = { ok: true; active: boolean } | { ok: false; cancelled?: boolean; error: string };

type PurchasesCtx = {
  ready: boolean;
  premium: Premium;
  /** Mağazanın gösterdiği fiyatlar (ör. "₺299,99"); okunamadıysa PREMIUM_PRICE. */
  prices: Record<Plan, string>;
  /** Yıllık planın aylığa düşen fiyatı (ör. "$5.00"); okunamadıysa null. */
  annualPerMonth: string | null;
  /** Yıllık planın 12 aylığa göre yüzde kaç ucuz olduğu. */
  annualSave: number;
  /**
   * Aylık planın ilk ay fiyatı (ör. "$4.99"). Mağaza teklifi sadece hak kazanan (daha önce abone
   * olmamış) kullanıcıya gösterir; mağaza okunduysa ve teklif yoksa null.
   */
  introPrice: string | null;
  buy: (plan: Plan) => Promise<BuyResult>;
  restore: () => Promise<RestoreResult>;
  /** Mağazanın abonelik yönetim sayfasını açar (iptal etme, plan değiştirme). */
  manage: () => Promise<void>;
};

const none: Premium = { active: false, until: null, willRenew: false, productId: null };

const PurchasesContext = createContext<PurchasesCtx | null>(null);

type Packages = Record<Plan, PurchasesPackage | null>;

async function loadPackages(): Promise<Packages> {
  const o = (await Purchases.getOfferings()).current;
  return { monthly: o?.monthly ?? null, annual: o?.annual ?? null };
}

/**
 * Sunucudaki `subscriptions` satırını hemen tazeler. Webhook zaten yazıyor; bu, satın almadan hemen
 * sonra yapılan taramanın webhook'u beklemeden Premium hakkıyla sayılması için.
 */
function syncServer() {
  supabase?.functions.invoke('subscription-sync', { method: 'POST' }).catch(() => {});
}

function readPremium(info: CustomerInfo): Premium {
  const e = info.entitlements.active[ENTITLEMENT];
  if (!e) return none;
  return { active: true, until: e.expirationDateMillis, willRenew: e.willRenew, productId: e.productIdentifier };
}

export function PurchasesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [premium, setPremium] = useState<Premium>(none);
  const [pkgs, setPkgs] = useState<Packages>({ monthly: null, annual: null });
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
    loadPackages().then(setPkgs).catch(() => {});
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

  const buy = useCallback(async (plan: Plan): Promise<BuyResult> => {
    if (!apiKey) return { ok: false, error: 'Satın alma henüz açık değil. Mağaza hesapları bağlanınca açılacak.' };
    try {
      let p = pkgs[plan];
      if (!p) {
        const fresh = await loadPackages();
        setPkgs(fresh);
        p = fresh[plan];
      }
      if (!p) return { ok: false, error: 'Premium paketi şu an bulunamadı. Biraz sonra tekrar dene.' };
      const { customerInfo } = await Purchases.purchasePackage(p);
      apply(customerInfo);
      syncServer();
      return { ok: true, active: !!customerInfo.entitlements.active[ENTITLEMENT] };
    } catch (e) {
      if ((e as { userCancelled?: boolean }).userCancelled) return { ok: false, cancelled: true, error: '' };
      return { ok: false, error: 'Satın alma tamamlanamadı. İnternet bağlantını ve mağaza hesabını kontrol et.' };
    }
  }, [pkgs, apply]);

  const restore = useCallback(async (): Promise<RestoreResult> => {
    if (!apiKey) return { ok: false, error: 'Satın almalar bu sürümde henüz açık değil.' };
    try {
      const info = await Purchases.restorePurchases();
      apply(info);
      syncServer();
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

  const monthly = pkgs.monthly?.product.priceString ?? PREMIUM_PRICE.monthly;
  const annual = pkgs.annual?.product.priceString ?? PREMIUM_PRICE.annual;
  const annualPerMonth = pkgs.annual?.product.pricePerMonthString ?? null;
  const m = pkgs.monthly?.product.price ?? 6.99;
  const y = pkgs.annual?.product.price ?? 59.99;
  const annualSave = Math.max(0, Math.round((1 - y / (m * 12)) * 100));
  const introPrice = pkgs.monthly ? (pkgs.monthly.product.introPrice?.priceString ?? null) : INTRO_PRICE;
  const value = useMemo(
    () => ({ ready: ready || !apiKey, premium, prices: { monthly, annual }, annualPerMonth, annualSave, introPrice, buy, restore, manage }),
    [ready, premium, monthly, annual, annualPerMonth, annualSave, introPrice, buy, restore, manage],
  );
  return <PurchasesContext.Provider value={value}>{children}</PurchasesContext.Provider>;
}

export function usePurchases() {
  const p = useContext(PurchasesContext);
  if (!p) throw new Error('usePurchases, PurchasesProvider içinde kullanılmalı');
  return p;
}
