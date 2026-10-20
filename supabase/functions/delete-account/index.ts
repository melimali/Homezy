// Uygulamadaki "Hesabımı sil" düğmesi. Apple, uygulama içinden hesap açılabiliyorsa silmenin de
// uygulama içinden yapılabilmesini istiyor (App Review 5.1.1(v)).
// Kullanıcıyı siler; profiles, homes ve subscriptions satırları "on delete cascade" ile gider.
// RevenueCat'teki müşteri kaydı da silinir. Mağaza aboneliğini kullanıcı mağazadan kendisi iptal eder.

import { createClient } from 'npm:@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async req => {
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!jwt) return new Response('unauthorized', { status: 401 });
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) return new Response('unauthorized', { status: 401 });
  const id = data.user.id;

  const rcKey = Deno.env.get('REVENUECAT_API_KEY');
  if (rcKey) {
    await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${rcKey}` },
    }).catch(() => {});
  }

  const del = await admin.auth.admin.deleteUser(id);
  if (del.error) return new Response(del.error.message, { status: 500 });
  return Response.json({ ok: true });
});
