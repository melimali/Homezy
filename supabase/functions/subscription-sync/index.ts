// Uygulama satın alma ya da geri yüklemeden hemen sonra çağırır; webhook'u beklemeden
// `subscriptions` satırını tazeler. Sadece çağıran kullanıcının kendi satırını yazar.
// Kullanıcı oturumuyla çağrılır: `supabase functions deploy subscription-sync` (JWT doğrulaması açık).
// Suistimal: kullanıcı başına 15 saniyede en fazla bir RevenueCat çağrısı (sınır aşılırsa kayıtlı durum döner).
// Hata ayrıntısı istemciye verilmez, sadece sunucu günlüğüne yazılır.

import { corsHeaders, jsonResponse } from '../_shared/http.ts';
import { admin, syncSubscriber } from '../_shared/subscription.ts';

const MIN_GAP_MS = 15_000;

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== 'POST') return jsonResponse(req, { error: 'method' }, 405);
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return jsonResponse(req, { error: 'unauthorized' }, 401);

  const { data: row } = await admin.from('subscriptions').select('active, updated_at').eq('user_id', data.user.id).maybeSingle();
  if (row && Date.now() - new Date(row.updated_at).getTime() < MIN_GAP_MS) {
    return jsonResponse(req, { active: !!row.active, cached: true });
  }

  const r = await syncSubscriber(data.user.id, 'APP_SYNC');
  if ('error' in r) {
    console.error('subscription-sync failed', r.error);
    return jsonResponse(req, { error: 'server' }, 502);
  }
  return jsonResponse(req, r);
});
