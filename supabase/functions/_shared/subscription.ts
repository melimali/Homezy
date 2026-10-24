// RevenueCat'teki güncel abonelik durumunu okuyup `subscriptions` tablosuna yazar.
// Webhook (revenuecat-webhook) ve uygulamanın satın almadan hemen sonra çağırdığı
// subscription-sync aynı yolu kullanır. Kart / ödeme bilgisi gelmez ve saklanmaz.
//
// Gizli değişken: REVENUECAT_API_KEY (RevenueCat gizli API anahtarı, sk_...). SUPABASE_URL ve
// SUPABASE_SERVICE_ROLE_KEY Supabase tarafından otomatik verilir.

import { createClient } from 'npm:@supabase/supabase-js@2';

export const ENTITLEMENT = 'premium';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

/** Kullanıcının durumunu RevenueCat'ten okuyup yazar. Hata olursa açıklamasını döner. */
export async function syncSubscriber(userId: string, lastEvent: string | null): Promise<{ active: boolean } | { error: string }> {
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${Deno.env.get('REVENUECAT_API_KEY')}` },
  });
  if (!res.ok) return { error: `revenuecat ${res.status}` };
  const { subscriber } = await res.json();
  const ent = subscriber?.entitlements?.[ENTITLEMENT];
  const productId: string | undefined = ent?.product_identifier;
  const sub = productId ? subscriber?.subscriptions?.[productId] : undefined;
  const expires = ent?.expires_date ? new Date(ent.expires_date) : null;
  // Google Play ödeme sorununda birkaç gün ek süre verir; RevenueCat bu sürede de entitlement'ı açık tutar.
  const grace = ent?.grace_period_expires_date ? new Date(ent.grace_period_expires_date) : null;
  const until = grace && expires && grace > expires ? grace : expires;
  const active = !!ent && (until === null || until.getTime() > Date.now());

  const { error } = await admin.from('subscriptions').upsert({
    user_id: userId,
    entitlement: ENTITLEMENT,
    active,
    product_id: productId ?? null,
    store: sub?.store ?? null,
    period_type: sub?.period_type ?? null,
    expires_at: until?.toISOString() ?? null,
    will_renew: sub ? !sub.unsubscribe_detected_at && !sub.billing_issues_detected_at : null,
    last_event: lastEvent,
    updated_at: new Date().toISOString(),
  });
  // Kullanıcı hesabını silmişse (yabancı anahtar hatası) sessizce geç.
  if (error && error.code !== '23503') return { error: error.message };
  return { active };
}
