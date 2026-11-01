-- Premium tarama sınırı günde 2'den günde 50'ye çıktı (Melih, 2026-10-25). Ücretsiz hâlâ haftada 2.
-- Sınırlar uygulamadaki src/domain/premium.ts (LIMITS.*.scans) ile aynı olmalı. Ayrıntılar: docs/premium.md.

create or replace function public.scan_reserve(p_user uuid, p_kind text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  prem boolean := public.is_premium(p_user);
  today date := (now() at time zone 'Europe/Istanbul')::date;
  per date := case when prem then today else date_trunc('week', today)::date end;
  lim int := case when prem then 50 else 2 end;
  used int;
begin
  insert into public.scan_usage as u (user_id, period, n, fridge, look)
  values (p_user, per, 1, (p_kind = 'fridge')::int, (p_kind = 'look')::int)
  on conflict (user_id, period) do update
    set n = u.n + 1, fridge = u.fridge + excluded.fridge, look = u.look + excluded.look
    where u.n < lim
  returning n into used;
  if used is null then
    return jsonb_build_object('ok', false, 'premium', prem, 'period', per, 'used', lim, 'limit', lim);
  end if;
  return jsonb_build_object('ok', true, 'premium', prem, 'period', per, 'used', used, 'limit', lim);
end;
$$;
revoke all on function public.scan_reserve(uuid, text) from public, anon, authenticated;
