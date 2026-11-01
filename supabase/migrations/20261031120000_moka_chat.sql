-- Moka sohbet botu: kullanıcı başına günlük mesaj sınırı (Türkiye saatine göre gün).
-- Ücretsiz günde 15, Premium günde 150. Sınırlar uygulamadaki src/domain/premium.ts (LIMITS.*.chats) ile aynı olmalı.
-- Sadece fonksiyon yazar; mesaj içeriği saklanmaz, sadece sayaç tutulur.

create table if not exists public.chat_usage (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  n int not null default 0,
  primary key (user_id, day)
);
alter table public.chat_usage enable row level security;
-- Hiçbir politika yok: istemci okuyamaz ya da yazamaz, service role atlar.

create or replace function public.chat_reserve(p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  prem boolean := public.is_premium(p_user);
  today date := (now() at time zone 'Europe/Istanbul')::date;
  lim int := case when prem then 150 else 15 end;
  used int;
begin
  insert into public.chat_usage as u (user_id, day, n)
  values (p_user, today, 1)
  on conflict (user_id, day) do update set n = u.n + 1 where u.n < lim
  returning n into used;
  if used is null then
    return jsonb_build_object('ok', false, 'premium', prem, 'day', today, 'used', lim, 'limit', lim);
  end if;
  return jsonb_build_object('ok', true, 'premium', prem, 'day', today, 'used', used, 'limit', lim);
end;
$$;
revoke all on function public.chat_reserve(uuid) from public, anon, authenticated;

-- Cevap alınamazsa hak geri verilir.
create or replace function public.chat_release(p_user uuid, p_day date) returns void
language sql security definer set search_path = '' as $$
  update public.chat_usage set n = greatest(0, n - 1) where user_id = p_user and day = p_day;
$$;
revoke all on function public.chat_release(uuid, date) from public, anon, authenticated;
