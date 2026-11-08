-- Yapay zeka maliyet korumasi (suistimal onleme): global gunluk tavan, IP basina gunluk tavan, dakika siniri.
-- Edge Function'lar (scan, moka-chat) modeli cagirmadan once `ai_burst` / `ai_take` ile kontrol eder.
-- Sadece service_role cagirir; tablolara istemci erisemez (RLS acik, politika yok). IP ham saklanmaz (SHA-256 ozeti).
-- Eski satirlar (7 gunden eski) rastgele temizlenir.

create table if not exists public.ai_counter (
  day date not null,
  key text not null,
  n int not null default 0,
  primary key (day, key)
);
alter table public.ai_counter enable row level security;

create table if not exists public.ai_rate (
  key text primary key,
  window_start timestamptz not null,
  n int not null default 0
);
alter table public.ai_rate enable row level security;

-- Gunluk sayac (Europe/Istanbul gunu). Sinira ulasmissa false doner ve artirmaz.
create or replace function public.ai_take(p_key text, p_limit int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Europe/Istanbul')::date;
  used int;
begin
  if random() < 0.01 then
    delete from public.ai_counter where day < today - 7;
    delete from public.ai_rate where window_start < now() - interval '1 day';
  end if;
  insert into public.ai_counter as c (day, key, n) values (today, p_key, 1)
  on conflict (day, key) do update set n = c.n + 1 where c.n < p_limit
  returning n into used;
  return used is not null;
end;
$$;
revoke all on function public.ai_take(text, int) from public, anon, authenticated;

-- Hata / bos sonuc olursa gunluk sayaci geri verir.
create or replace function public.ai_give_back(p_key text) returns void
language sql security definer set search_path = '' as $$
  update public.ai_counter set n = greatest(0, n - 1)
  where day = (now() at time zone 'Europe/Istanbul')::date and key = p_key;
$$;
revoke all on function public.ai_give_back(text) from public, anon, authenticated;

-- Kayan pencere: p_secs saniyede en fazla p_limit istek. Doluysa false.
create or replace function public.ai_burst(p_key text, p_limit int, p_secs int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  used int;
begin
  insert into public.ai_rate as r (key, window_start, n) values (p_key, now(), 1)
  on conflict (key) do update
    set window_start = case when r.window_start < now() - make_interval(secs => p_secs) then now() else r.window_start end,
        n = case when r.window_start < now() - make_interval(secs => p_secs) then 1 else r.n + 1 end
    where r.window_start < now() - make_interval(secs => p_secs) or r.n < p_limit
  returning n into used;
  return used is not null;
end;
$$;
revoke all on function public.ai_burst(text, int, int) from public, anon, authenticated;
