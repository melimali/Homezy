// Uygulama satın alma ya da geri yüklemeden hemen sonra çağırır; webhook'u beklemeden
// `subscriptions` satırını tazeler. Sadece çağıran kullanıcının kendi satırını yazar.
// Kullanıcı oturumuyla çağrılır: `supabase functions deploy subscription-sync` (JWT doğrulaması açık).

import { admin, syncSubscriber } from '../_shared/subscription.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return new Response('unauthorized', { status: 401, headers: cors });

  const r = await syncSubscriber(data.user.id, 'APP_SYNC');
  return new Response(JSON.stringify(r), {
    status: 'error' in r ? 502 : 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
