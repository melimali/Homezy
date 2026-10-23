-- Yapay zekâ ile fotoğraf taraması (buzdolabı ve kıyafet) için hak sayacı. Ayrıntılar: docs/premium.md.
-- Ücretsiz: haftada 2 (pazartesi yenilenir). Premium: günde 2 (Türkiye saatiyle gece yarısı yenilenir).
-- İki tür aynı hakkı paylaşır. Sınırlar uygulamadaki src/domain/premium.ts (LIMITS.*.scans) ile aynı olmalı.
-- Sadece `scan` fonksiyonu (service_role) yazar; fotoğraf saklanmaz, sadece sayaç tutulur.

create table public.scan_usage (
  user_id uuid not null references auth.users on delete cascade,
  -- Premium için o günün tarihi, ücretsiz için o haftanın pazartesisi.
  period date not null,
  n int not null default 0,
  -- Sadece istatistik; sınıra etki etmez.
  fridge int not null default 0,
  look int not null default 0,
  primary key (user_id, period)
);
alter table public.scan_usage enable row level security;
create policy "tarama: kendi sayacını okur" on public.scan_usage
  for select to authenticated using (user_id = auth.uid());

-- Tek işlemde hak ayırır: satır yoksa n = 1, varsa ve n < sınır ise n + 1. İki hızlı dokunuş iki hak
-- kullandıramaz, sınır da aşılamaz. Dönen `ok` false ise hak kalmamıştır.
create function public.scan_reserve(p_user uuid, p_kind text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  prem boolean := public.is_premium(p_user);
  today date := (now() at time zone 'Europe/Istanbul')::date;
  per date := case when prem then today else date_trunc('week', today)::date end;
  lim int := 2;
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

-- Tarama başarısız olursa (hata, boş sonuç) ayrılan hakkı geri verir.
create function public.scan_release(p_user uuid, p_period date, p_kind text) returns void
language sql security definer set search_path = '' as $$
  update public.scan_usage
  set n = greatest(n - 1, 0),
      fridge = greatest(fridge - (p_kind = 'fridge')::int, 0),
      look = greatest(look - (p_kind = 'look')::int, 0)
  where user_id = p_user and period = p_period;
$$;
revoke all on function public.scan_release(uuid, date, text) from public, anon, authenticated;
