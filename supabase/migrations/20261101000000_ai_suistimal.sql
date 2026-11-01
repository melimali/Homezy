-- Yapay zeka suistimali: sohbet sadece Premium, dakika siniri.
-- - Moka sohbeti sadece Premium: ucretsiz hesap AI'a ulasamaz (sunucu 'premium_required' doner).
-- - Premium'da: gunluk 150 mesaj + dakikada en fazla 6 mesaj (rate limit).
-- - Hesapsiz (anonim) kullanici sohbet ve tarama fonksiyonlarini zaten Edge Function'da reddeder (is_anonymous).

alter table public.chat_usage add column if not exists burst_at timestamptz;
alter table public.chat_usage add column if not exists burst_n int not null default 0;

create or replace function public.chat_reserve(p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  prem boolean := public.is_premium(p_user);
  today date := (now() at time zone 'Europe/Istanbul')::date;
  lim int := 150;      -- Premium gunluk mesaj ust siniri (src/domain/premium.ts LIMITS.premium.chats)
  burst_lim int := 6;  -- dakikada en fazla
  used int;
  b_at timestamptz;
  b_n int;
begin
  if not prem then
    return jsonb_build_object('ok', false, 'reason', 'premium', 'premium', false, 'day', today, 'used', 0, 'limit', 0);
  end if;

  insert into public.chat_usage as u (user_id, day, n)
  values (p_user, today, 1)
  on conflict (user_id, day) do update set n = u.n + 1 where u.n < lim
  returning n into used;
  if used is null then
    return jsonb_build_object('ok', false, 'reason', 'daily', 'premium', true, 'day', today, 'used', lim, 'limit', lim);
  end if;

  -- Dakika penceresi: pencere bittiyse sifirla, dolduysa hakki geri ver ve reddet.
  select burst_at, burst_n into b_at, b_n from public.chat_usage where user_id = p_user and day = today;
  if b_at is null or b_at < now() - interval '1 minute' then
    update public.chat_usage set burst_at = now(), burst_n = 1 where user_id = p_user and day = today;
  elsif b_n >= burst_lim then
    update public.chat_usage set n = greatest(0, n - 1) where user_id = p_user and day = today;
    return jsonb_build_object('ok', false, 'reason', 'rate', 'premium', true, 'day', today, 'used', used - 1, 'limit', lim);
  else
    update public.chat_usage set burst_n = burst_n + 1 where user_id = p_user and day = today;
  end if;

  return jsonb_build_object('ok', true, 'premium', true, 'day', today, 'used', used, 'limit', lim);
end;
$$;
revoke all on function public.chat_reserve(uuid) from public, anon, authenticated;
