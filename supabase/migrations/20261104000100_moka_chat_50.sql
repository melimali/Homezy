-- Moka sohbet: Premium gunluk ust sinir 40 -> 50 (Melih, 2026-11-04).
-- Premium: gunde 50, ayda 600 mesaj, dakikada 6. Ay = Europe/Istanbul takvim ayi.
-- src/domain/premium.ts LIMITS.premium.chats / chatsMonth ile ayni tutulmali.
create or replace function public.chat_reserve(p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  prem boolean := public.is_premium(p_user);
  today date := (now() at time zone 'Europe/Istanbul')::date;
  lim int := 50;
  mlim int := 600;
  burst_lim int := 6;
  used int;
  mused int;
  b_at timestamptz;
  b_n int;
begin
  if not prem then
    return jsonb_build_object('ok', false, 'reason', 'premium', 'premium', false, 'day', today, 'used', 0, 'limit', 0);
  end if;

  select coalesce(sum(n), 0) into mused from public.chat_usage
   where user_id = p_user and day >= date_trunc('month', today::timestamp)::date;
  if mused >= mlim then
    return jsonb_build_object('ok', false, 'reason', 'monthly', 'premium', true, 'day', today, 'mused', mused, 'mlimit', mlim);
  end if;

  insert into public.chat_usage as u (user_id, day, n)
  values (p_user, today, 1)
  on conflict (user_id, day) do update set n = u.n + 1 where u.n < lim
  returning n into used;
  if used is null then
    return jsonb_build_object('ok', false, 'reason', 'daily', 'premium', true, 'day', today, 'used', lim, 'limit', lim);
  end if;

  select burst_at, burst_n into b_at, b_n from public.chat_usage where user_id = p_user and day = today;
  if b_at is null or b_at < now() - interval '1 minute' then
    update public.chat_usage set burst_at = now(), burst_n = 1 where user_id = p_user and day = today;
  elsif b_n >= burst_lim then
    update public.chat_usage set n = greatest(0, n - 1) where user_id = p_user and day = today;
    return jsonb_build_object('ok', false, 'reason', 'rate', 'premium', true, 'day', today, 'used', used - 1, 'limit', lim);
  else
    update public.chat_usage set burst_n = burst_n + 1 where user_id = p_user and day = today;
  end if;

  return jsonb_build_object('ok', true, 'premium', true, 'day', today, 'used', used, 'limit', lim,
                            'mused', mused + 1, 'mlimit', mlim);
end;
$$;
revoke all on function public.chat_reserve(uuid) from public, anon, authenticated;
