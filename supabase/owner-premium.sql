-- Sahip hesabına Premium ver (Supabase SQL Editor'de bir kere çalıştır).
-- Mail ile kayıtlı hesap ve (varsa) misafir UID'si için.
insert into public.subscriptions (user_id, entitlement, active, product_id, store, period_type, expires_at, will_renew, last_event)
select id, 'premium', true, 'owner_grant', 'manual', 'normal', now() + interval '10 years', false, 'MANUAL_GRANT'
from auth.users
where lower(email) in ('melihtugyan@gmail.com', 'uorigami@gmail.com')
   or id = '2e0adf84-6d7e-44bd-9b7e-67d243849efb'
on conflict (user_id) do update
  set active = true, entitlement = 'premium', expires_at = excluded.expires_at, last_event = 'MANUAL_GRANT', updated_at = now();
