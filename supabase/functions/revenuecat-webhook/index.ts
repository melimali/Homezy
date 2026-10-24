// RevenueCat webhook'u: abonelik başladığında, yenilendiğinde, iptal edildiğinde ya da bittiğinde çağrılır.
// Olaydaki veriye güvenmek yerine RevenueCat REST API'den kullanıcının güncel durumunu okur ve
// `subscriptions` tablosuna yazar (bkz. ../_shared/subscription.ts).
//
// Gizli değişkenler: REVENUECAT_WEBHOOK_SECRET (RevenueCat panelindeki "Authorization header" değeri),
// REVENUECAT_API_KEY (RevenueCat gizli API anahtarı, sk_...).
// Bu fonksiyon kullanıcı oturumuyla çağrılmaz: `supabase functions deploy revenuecat-webhook --no-verify-jwt`.

import { syncSubscriber, UUID } from '../_shared/subscription.ts';

Deno.serve(async req => {
  if (req.headers.get('Authorization') !== `Bearer ${Deno.env.get('REVENUECAT_WEBHOOK_SECRET')}`) {
    return new Response('unauthorized', { status: 401 });
  }
  const { event } = await req.json();
  // Uygulama RevenueCat'e Supabase kullanıcı kimliğini veriyor; anonim RevenueCat kimliklerini atla.
  // TRANSFER olayında (satın alma başka hesaba geri yüklendi) iki taraf da güncellenir.
  const ids: unknown[] = event?.type === 'TRANSFER'
    ? [...(event.transferred_from ?? []), ...(event.transferred_to ?? [])]
    : [event?.app_user_id, event?.original_app_user_id, ...(event?.aliases ?? [])];
  const users = [...new Set(ids.filter((id): id is string => typeof id === 'string' && UUID.test(id)))];
  if (!users.length) return new Response('no supabase user', { status: 200 });

  for (const id of event?.type === 'TRANSFER' ? users : users.slice(0, 1)) {
    const r = await syncSubscriber(id, event?.type ?? null);
    // 5xx dönünce RevenueCat olayı birkaç kez yeniden gönderir.
    if ('error' in r) return new Response(r.error, { status: 502 });
  }
  return new Response('ok');
});
