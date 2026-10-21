// RevenueCat webhook'u: abonelik başladığında, yenilendiğinde, iptal edildiğinde ya da bittiğinde çağrılır.
// Olaydaki veriye güvenmek yerine RevenueCat REST API'den kullanıcının güncel durumunu okur ve
// `subscriptions` tablosuna yazar. Kart / ödeme bilgisi gelmez ve saklanmaz.
//
// Gizli değişkenler: REVENUECAT_WEBHOOK_SECRET (RevenueCat panelindeki "Authorization header" değeri),
// REVENUECAT_API_KEY (RevenueCat gizli API anahtarı, sk_...). SUPABASE_URL ve
// SUPABASE_SERVICE_ROLE_KEY Supabase tarafından otomatik verilir.
// Bu fonksiyon kullanıcı oturumuyla çağrılmaz: `supabase functions deploy revenuecat-webhook --no-verify-jwt`.

import { createClient } from 'npm:@supabase/supabase-js@2';

const ENTITLEMENT = 'premium';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async req => {
  if (req.headers.get('Authorization') !== `Bearer ${Deno.env.get('REVENUECAT_WEBHOOK_SECRET')}`) {
    return new Response('unauthorized', { status: 401 });
  }
  const { event } = await req.json();
  // Uygulama RevenueCat'e Supabase kullanıcı kimliğini veriyor; anonim RevenueCat kimliklerini atla.
  const ids: string[] = [event?.app_user_id, event?.original_app_user_id, ...(event?.aliases ?? [])];
  const userId = ids.find(id => typeof id === 'string' && UUID.test(id));
  if (!userId) return new Response('no supabase user', { status: 200 });

  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${Deno.env.get('REVENUECAT_API_KEY')}` },
  });
  if (!res.ok) return new Response('revenuecat error', { status: 502 });
  const { subscriber } = await res.json();
  const ent = subscriber?.entitlements?.[ENTITLEMENT];
  const productId: string | undefined = ent?.product_identifier;
  const sub = productId ? subscriber?.subscriptions?.[productId] : undefined;
  const expires = ent?.expires_date ? new Date(ent.expires_date) : null;
  const active = !!ent && (expires === null || expires.getTime() > Date.now());

  const { error } = await admin.from('subscriptions').upsert({
    user_id: userId,
    entitlement: ENTITLEMENT,
    active,
    product_id: productId ?? null,
    store: sub?.store ?? null,
    period_type: sub?.period_type ?? null,
    expires_at: expires?.toISOString() ?? null,
    will_renew: sub ? !sub.unsubscribe_detected_at && !sub.billing_issues_detected_at : null,
    last_event: event?.type ?? null,
    updated_at: new Date().toISOString(),
  });
  // Kullanıcı hesabını silmişse (yabancı anahtar hatası) olayı yine de kabul et.
  if (error && error.code !== '23503') return new Response(error.message, { status: 500 });
  return new Response('ok');
});
