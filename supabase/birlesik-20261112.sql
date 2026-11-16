-- Birlesik, tekrar calistirilabilir (idempotent) SQL. 2026-11-12. Supabase SQL Editor'de TEK SEFERDE calistir.
-- Icerik: 20261107..20261111 migrasyonlari, son hallerine gore (puan_dengesi ve ai_limits(11-04) atlandi: formuller / ai_limits_25_10 uzerine yazar).

-- ===== 20261107000000_dondurma_2 =====
-- Ücretsiz seri dondurma hakkı ayda 1'den 2'ye çıktı (Premium 3). Supabase SQL Editor'de çalıştır.
create or replace function public.play_freeze(p_day date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'utc')::date;
  used integer;
  lim integer;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  if p_day is null or p_day < today - 8 or p_day > today then
    raise exception 'bad day';
  end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));
  -- O gün zaten bir şey yapılmış ya da dondurulmuşsa hak harcanmaz.
  if exists (select 1 from public.play_events where user_id = uid and day = p_day) then
    return public.play_summary();
  end if;
  lim := case when public.is_premium(uid) then 3 else 2 end;
  select count(*) into used from public.play_events
    where user_id = uid and kind = 'dondur' and date_trunc('month', day) = date_trunc('month', p_day);
  if used >= lim then
    raise exception 'no freezes left';
  end if;
  insert into public.play_events (user_id, day, kind, ref, points) values (uid, p_day, 'dondur', 'dondur', 0);
  return public.play_summary();
end;
$$;

revoke all on function public.play_freeze(date) from public, anon;
grant execute on function public.play_freeze(date) to authenticated;

-- ===== 20261107120000_ai_limits_25_10 =====
-- Premium yapay zeka sinirlari (Melih, 2026-11-07): foto taramasi gunde 10 (5 buzdolabi + 5 kombin, ortak havuz), Moka sohbeti gunde 25 mesaj (ayda 750, dakikada 6).
-- Ucretsiz hala haftada 2 tarama. Sinirlar src/domain/premium.ts (LIMITS) ile ayni olmali.

create or replace function public.scan_reserve(p_user uuid, p_kind text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  prem boolean := public.is_premium(p_user);
  today date := (now() at time zone 'Europe/Istanbul')::date;
  per date := case when prem then today else date_trunc('week', today)::date end;
  lim int := case when prem then 10 else 2 end;
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

create or replace function public.chat_reserve(p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  prem boolean := public.is_premium(p_user);
  today date := (now() at time zone 'Europe/Istanbul')::date;
  lim int := 25;
  mlim int := 750;
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

-- ===== 20261108000000_siralama =====
-- Global ev sıralaması (isteğe bağlı), tek "ev puanı"na göre.
-- Gizlilik: yalnız hesaplı kullanıcı, kendi isteğiyle katılır. Takma ad dışında kimlik, konum ya da ev planı yok.
-- Güven: seviye ve seri, sunucudaki puan kayıtlarından (play_events) hesaplanır; uygulamadan sadece
-- temizlik yüzdesi gelir ve 0-100'e kırpılır. Tablolara uygulama doğrudan yazamaz/okuyamaz; sadece fonksiyonlar.
-- Hızlı tamamla uyarısında geri alınan işler play_events'ten de silindiği için sıralamaya yansımaz.

create table if not exists public.lb_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nick text not null check (char_length(nick) between 2 and 16),
  clean integer not null default 0 check (clean between 0 and 100),
  level integer not null default 0,
  streak integer not null default 0,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Günlük temizlik görüntüsü (haftalık "en temiz" için). Kullanıcı başına günde bir satır.
create table if not exists public.lb_daily (
  user_id uuid not null references public.lb_profiles (user_id) on delete cascade,
  day date not null,
  clean integer not null check (clean between 0 and 100),
  primary key (user_id, day)
);

alter table public.lb_profiles enable row level security;
alter table public.lb_daily enable row level security;
-- Politika yok: doğrudan okuma/yazma kapalı. Erişim yalnız security definer fonksiyonlarla.

-- Katıl / takma adı değiştir.
create or replace function public.lb_join(p_nick text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  n text := btrim(coalesce(p_nick, ''));
begin
  if uid is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'account required';
  end if;
  if char_length(n) < 2 or char_length(n) > 16 or n ~* '(@|https?:|www\.|\.com|\.net|\.org)' then
    raise exception 'bad nick';
  end if;
  insert into public.lb_profiles (user_id, nick) values (uid, n)
    on conflict (user_id) do update set nick = excluded.nick;
end;
$$;

-- Ayrıl: satırlar silinir.
create or replace function public.lb_leave() returns void
language sql security definer set search_path = '' as $$
  delete from public.lb_profiles where user_id = auth.uid();
$$;

-- Puan gönder. Seviye = puan alınan gün sayısı (en çok 100), seri = üst üste gün; ikisi de sunucuda hesaplanır.
-- En az 10 dakikada bir işlenir. Katılmamışsa hiçbir şey yapmaz.
create or replace function public.lb_publish(p_clean integer) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  row public.lb_profiles;
  today date := (now() at time zone 'utc')::date;
  lvl integer;
  str integer := 0;
  d date;
  c integer := greatest(0, least(100, coalesce(p_clean, 0)));
begin
  if uid is null then return; end if;
  select * into row from public.lb_profiles where user_id = uid;
  if not found or row.updated_at > now() - interval '10 minutes' then return; end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));

  select count(distinct day) into lvl from public.play_events where user_id = uid;
  lvl := least(100, lvl);
  d := case when exists (select 1 from public.play_events where user_id = uid and day >= today) then today else today - 1 end;
  while exists (select 1 from public.play_events where user_id = uid and day = d) loop
    str := str + 1;
    d := d - 1;
  end loop;

  update public.lb_profiles set clean = c, level = lvl, streak = str, updated_at = now() where user_id = uid;
  insert into public.lb_daily (user_id, day, clean) values (uid, today, c)
    on conflict (user_id, day) do update set clean = excluded.clean;
  delete from public.lb_daily where user_id = uid and day < today - 30;
end;
$$;

-- Sıralama tek bir "ev puanı"na göre: ilk 50 + kendi sırası. p_period: 'hafta' | 'hepsi'.
-- Ev puanı = eve alınan eşyalar (harcanan puan / 10) + Moka bahçesi (harcanan puan / 10, en çok 300)
--          + ev temizliği (0-100 yüzde, olduğu gibi).
-- Ağırlıkları değiştirirsen src/domain/leaderboard.ts içindeki açıklamayı da güncelle.
-- Haftalık: bu hafta alınan eşya ve harcanan bahçe puanı + bu haftaki günlük temizlik ortalaması.
-- En az 3 gün işi olmayan ev listeye girmez (sahte yüzde ile tepeye çıkmayı önler).
create or replace function public.lb_top(p_period text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  wk date := date_trunc('week', (now() at time zone 'utc'))::date;
  res jsonb;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if p_period not in ('hafta', 'hepsi') then raise exception 'bad args'; end if;

  with parts as (
    select p.user_id, p.nick, p.level, p.streak,
      floor(coalesce((select sum(price) from public.play_owned o
        where o.user_id = p.user_id and (p_period = 'hepsi' or o.created_at >= wk)), 0) / 10.0)::int as items,
      least(300, floor(coalesce((select sum(price) from public.play_spend g
        where g.user_id = p.user_id and (p_period = 'hepsi' or g.day >= wk)), 0) / 10.0))::int as garden,
      case when p_period = 'hepsi' then p.clean
           else round(coalesce((select avg(clean) from public.lb_daily x where x.user_id = p.user_id and x.day >= wk), 0))::int end as clean
    from public.lb_profiles p
    where (select count(distinct day) from public.play_events e where e.user_id = p.user_id) >= 3
  ), ranked as (
    select *, items + garden + clean as score,
      row_number() over (order by items + garden + clean desc, level desc, streak desc, user_id) as rank
    from parts
  )
  select jsonb_build_object(
    'top', coalesce((
      select jsonb_agg(jsonb_build_object('rank', rank, 'nick', nick, 'score', score, 'items', items, 'garden', garden,
        'clean', clean, 'level', level, 'streak', streak, 'me', user_id = uid) order by rank)
      from ranked where rank <= 50), '[]'::jsonb),
    'me', (select jsonb_build_object('rank', rank, 'nick', nick, 'score', score, 'items', items, 'garden', garden,
        'clean', clean, 'level', level, 'streak', streak) from ranked where user_id = uid),
    'joined', exists (select 1 from public.lb_profiles where user_id = uid),
    'nick', (select nick from public.lb_profiles where user_id = uid),
    'total', (select count(*) from ranked)
  ) into res;
  return res;
end;
$$;

revoke all on function public.lb_join(text) from public, anon;
revoke all on function public.lb_leave() from public, anon;
revoke all on function public.lb_publish(integer) from public, anon;
revoke all on function public.lb_top(text) from public, anon;
grant execute on function public.lb_join(text) to authenticated;
grant execute on function public.lb_leave() to authenticated;
grant execute on function public.lb_publish(integer) to authenticated;
grant execute on function public.lb_top(text) to authenticated;

-- ===== 20261108120000_siralama_moka =====
-- Sıralama 2: "Moka Şampiyonları" (Moka seviyesine göre). 20261108000000_siralama.sql'den SONRA çalıştır.
-- Moka exp'i telefonda tutulur; sunucu gelen toplamı "günde en çok 28 exp" sınırıyla kırpar
-- (src/domain/mokaLevel.ts DAILY_XP_CAP toplamı: 12 + 10 + 6) ve puan alınan gün sayısıyla çarpar.

alter table public.lb_profiles add column if not exists moka_xp integer not null default 0 check (moka_xp >= 0);

drop function if exists public.lb_publish(integer);

create or replace function public.lb_publish(p_clean integer, p_xp integer default 0) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  row public.lb_profiles;
  today date := (now() at time zone 'utc')::date;
  lvl integer;
  str integer := 0;
  d date;
  c integer := greatest(0, least(100, coalesce(p_clean, 0)));
  xp integer;
begin
  if uid is null then return; end if;
  select * into row from public.lb_profiles where user_id = uid;
  if not found or row.updated_at > now() - interval '10 minutes' then return; end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));

  select count(distinct day) into lvl from public.play_events where user_id = uid;
  xp := greatest(0, least(coalesce(p_xp, 0), 28 * (lvl + 1)));
  lvl := least(100, lvl);
  d := case when exists (select 1 from public.play_events where user_id = uid and day >= today) then today else today - 1 end;
  while exists (select 1 from public.play_events where user_id = uid and day = d) loop
    str := str + 1;
    d := d - 1;
  end loop;

  update public.lb_profiles set clean = c, level = lvl, streak = str, moka_xp = xp, updated_at = now() where user_id = uid;
  insert into public.lb_daily (user_id, day, clean) values (uid, today, c)
    on conflict (user_id, day) do update set clean = excluded.clean;
  delete from public.lb_daily where user_id = uid and day < today - 30;
end;
$$;

-- Moka seviyesi: seviye L'den L+1'e geçmek için 5 + 5L exp (src/domain/mokaLevel.ts needFor).
create or replace function public.lb_moka_level(p_xp integer) returns integer
language plpgsql immutable set search_path = '' as $$
declare lvl integer := 1; rest integer := p_xp;
begin
  while rest >= 5 + 5 * lvl loop
    rest := rest - (5 + 5 * lvl);
    lvl := lvl + 1;
  end loop;
  return lvl;
end;
$$;

-- Moka Şampiyonları: ilk 50 + kendi sırası (tüm zamanlar). En az 3 gün işi olmayan listeye girmez.
create or replace function public.lb_moka_top() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  res jsonb;
begin
  if uid is null then raise exception 'not signed in'; end if;
  with ranked as (
    select p.user_id, p.nick, p.level, p.streak, p.moka_xp as xp, public.lb_moka_level(p.moka_xp) as moka,
      row_number() over (order by p.moka_xp desc, p.level desc, p.user_id) as rank
    from public.lb_profiles p
    where (select count(distinct day) from public.play_events e where e.user_id = p.user_id) >= 3
  )
  select jsonb_build_object(
    'top', coalesce((
      select jsonb_agg(jsonb_build_object('rank', rank, 'nick', nick, 'score', moka, 'xp', xp, 'level', level, 'streak', streak, 'me', user_id = uid) order by rank)
      from ranked where rank <= 50), '[]'::jsonb),
    'me', (select jsonb_build_object('rank', rank, 'nick', nick, 'score', moka, 'xp', xp, 'level', level, 'streak', streak) from ranked where user_id = uid),
    'joined', exists (select 1 from public.lb_profiles where user_id = uid),
    'nick', (select nick from public.lb_profiles where user_id = uid),
    'total', (select count(*) from ranked)
  ) into res;
  return res;
end;
$$;

revoke all on function public.lb_publish(integer, integer) from public, anon;
revoke all on function public.lb_moka_level(integer) from public, anon;
revoke all on function public.lb_moka_top() from public, anon;
grant execute on function public.lb_publish(integer, integer) to authenticated;
grant execute on function public.lb_moka_top() to authenticated;

-- ===== 20261108130000_magaza_cesit =====
-- Yeni mağaza eşyaları (src/domain/items.ts ile aynı). Supabase SQL Editor'da bir kere çalıştır.
insert into public.play_items (id, price, premium) values
  ('koltuk_takimi', 140, false),
  ('yemek_masasi', 120, false),
  ('gardirop', 100, false),
  ('sehpa', 55, false),
  ('yatak_ranza', 90, false),
  ('kitap_koltugu', 75, false),
  ('sarkit_isik', 45, false),
  ('lava_lambasi', 65, false),
  ('zemin_lambasi', 80, false),
  ('mum', 25, false),
  ('fener', 40, false),
  ('duvar_halisi', 60, false),
  ('poster', 35, false),
  ('boy_ayna', 70, false),
  ('duvar_cicegi', 55, false),
  ('neon_yazi', 120, true),
  ('yucca', 50, false),
  ('sarmasik', 40, false),
  ('lavanta', 35, false),
  ('aloe', 30, false),
  ('limon_agaci', 130, true),
  ('palmiye', 85, false),
  ('kedi_yatagi', 45, false),
  ('kopek_yatagi', 45, false),
  ('tavsan', 110, false),
  ('hamster', 90, false),
  ('kus_yemligi', 60, false),
  ('yilbasi_agaci', 140, false),
  ('kar_adami', 90, false),
  ('balkabagi', 40, false),
  ('ramazan_feneri', 50, false),
  ('plaj_semsiyesi', 70, false),
  ('cicek_celengi', 60, false),
  ('bilgisayar_masasi', 160, false),
  ('spor_kosesi', 120, false),
  ('yoga_mati', 45, false),
  ('resim_sehpasi', 90, false),
  ('dikis_makinesi', 100, false),
  ('posta_kutusu', 40, false),
  ('cit', 60, false),
  ('bahce_lambasi', 55, false),
  ('kus_evi', 70, false),
  ('paspas', 25, false),
  ('salincak', 110, true)
on conflict (id) do update set price = excluded.price, premium = excluded.premium;

-- ===== 20261109000000_aile_haftasi =====
/*
  Aile haftası: ortak evde herkesin günlük tamamladığı iş sayısı (Aile paylaşımı ekranında "Bu hafta" tablosu).
  Sadece sayı tutulur: hangi iş olduğu, puan ya da günlük sunucuya gitmez.
  Supabase SQL Editor'de bir kere çalıştırılır.
*/

create table if not exists public.family_daily (
  owner_id uuid not null references public.families (owner_id) on delete cascade,
  user_id uuid not null,
  day date not null,
  done int not null default 0 check (done between 0 and 200),
  primary key (owner_id, user_id, day)
);
alter table public.family_daily enable row level security;

-- Çağıranın ailesinin son 7 günü: kişi başı toplam ve bugünkü sayı.
create or replace function public.family_week() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'userId', x.user_id, 'done', x.total, 'today', x.today) order by x.total desc), '[]'::jsonb)
  from (
    select d.user_id,
           sum(d.done)::int as total,
           coalesce(sum(d.done) filter (where d.day = current_date), 0)::int as today
    from public.family_daily d
    where d.owner_id = public.family_of(auth.uid()) and d.day > current_date - 7
    group by d.user_id
  ) x;
$$;

-- Çağıranın o günkü sayısını yazar (dün ve bugün kabul edilir). Sayı düşmez, sadece artar.
create or replace function public.family_report(p_day date, p_done int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  fid uuid := public.family_of(uid);
begin
  if fid is null then raise exception 'no family'; end if;
  if not public.is_premium_own(fid) then raise exception 'owner not premium'; end if;
  if p_day < current_date - 1 or p_day > current_date then raise exception 'bad day'; end if;
  insert into public.family_daily (owner_id, user_id, day, done)
    values (fid, uid, p_day, greatest(0, least(p_done, 200)))
    on conflict (owner_id, user_id, day) do update set done = greatest(public.family_daily.done, excluded.done);
  delete from public.family_daily where owner_id = fid and day < current_date - 60;
  return public.family_week();
end;
$$;

revoke all on function public.family_week() from public, anon;
revoke all on function public.family_report(date, int) from public, anon;
grant execute on function public.family_week() to authenticated;
grant execute on function public.family_report(date, int) to authenticated;

-- ===== 20261109000000_formuller =====
-- Formüller (2026-11-09): yumuşak seri bonusu 30·(1−e^(−n/15)). Telefondaki `streakBonus` (src/domain/play.ts) birebir aynı.
-- Supabase SQL Editor'de bir kez çalıştırılır. Yalnız play_award içindeki seri bonusu satırı değişti.
create or replace function public.play_award(p_kind text, p_ref text, p_day date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'utc')::date;
  pts integer;
  n integer;
  first boolean;
  inserted integer;
  streak integer := 0;
  d date;
  mult numeric;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  if p_kind not in ('gorev', 'spor', 'gunluk') then
    raise exception 'bad kind';
  end if;
  if p_day is null or p_day < today - 1 or p_day > today + 1 then
    raise exception 'bad day';
  end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));
  mult := case when public.is_premium(uid) then 1.5 else 1 end;

  p_ref := case when p_kind = 'gorev' then left(coalesce(nullif(p_ref, ''), '?'), 64) else p_kind end;
  pts := case p_kind when 'gorev' then 10 when 'spor' then 15 else 10 end;
  if p_kind = 'gorev' then
    select count(*) into n from public.play_events where user_id = uid and day = p_day and kind = 'gorev';
    if n >= 20 then
      return public.play_summary() || jsonb_build_object('awarded', false);
    end if;
    -- Azalan getiri: günün ilk 5 işi 10, sonraki 5 iş 5, kalan 10 iş 2 puan (günlük en çok 95).
    pts := case when n < 5 then 10 when n < 10 then 5 else 2 end;
  end if;

  first := not exists (select 1 from public.play_events where user_id = uid and day = p_day and kind <> 'dondur');
  insert into public.play_events (user_id, day, kind, ref, points)
    values (uid, p_day, p_kind, p_ref, round(pts * mult))
    on conflict do nothing;
  get diagnostics inserted = row_count;

  if inserted > 0 and first then
    d := p_day - 1;
    while exists (select 1 from public.play_events where user_id = uid and day = d) loop
      if exists (select 1 from public.play_events where user_id = uid and day = d and kind <> 'dondur') then
        streak := streak + 1;
      end if;
      d := d - 1;
    end loop;
    if streak > 0 then
      insert into public.play_events (user_id, day, kind, ref, points)
        values (uid, p_day, 'seri', 'seri', round(round(30 * (1 - exp(-streak / 15.0))) * mult))
        on conflict do nothing;
    end if;
  end if;

  return public.play_summary() || jsonb_build_object('awarded', inserted > 0);
end;
$$;
revoke all on function public.play_award(text, text, date) from public, anon;
grant execute on function public.play_award(text, text, date) to authenticated;

-- ===== 20261109120000_siralama_adil =====
-- Adil sıralama (2026-11-09): ev büyüklüğüne göre normalize + hesap yaşına göre tavan. Telefondaki `fairScore` (src/domain/formulas.ts) ile aynı.
-- 20261108000000_siralama.sql ve 20261108120000_siralama_moka.sql'den SONRA, Supabase SQL Editor'de bir kez çalıştır.
-- Puan = round(min(eşya+bahçe, yaş_gün*12+30) / clamp(sqrt(blok/24), 0.6, 1.6)) + temizlik. Haftalıkta yaş en çok 7 gün sayılır.

alter table public.lb_profiles add column if not exists cells integer not null default 24 check (cells between 1 and 400);

drop function if exists public.lb_publish(integer, integer);

create or replace function public.lb_publish(p_clean integer, p_xp integer default 0, p_cells integer default 24) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  row public.lb_profiles;
  today date := (now() at time zone 'utc')::date;
  lvl integer;
  str integer := 0;
  d date;
  c integer := greatest(0, least(100, coalesce(p_clean, 0)));
  xp integer;
  n integer := greatest(1, least(400, coalesce(p_cells, 24)));
begin
  if uid is null then return; end if;
  select * into row from public.lb_profiles where user_id = uid;
  if not found or row.updated_at > now() - interval '10 minutes' then return; end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));

  select count(distinct day) into lvl from public.play_events where user_id = uid;
  xp := greatest(0, least(coalesce(p_xp, 0), 28 * (lvl + 1)));
  lvl := least(100, lvl);
  d := case when exists (select 1 from public.play_events where user_id = uid and day >= today) then today else today - 1 end;
  while exists (select 1 from public.play_events where user_id = uid and day = d) loop
    str := str + 1;
    d := d - 1;
  end loop;

  update public.lb_profiles set clean = c, level = lvl, streak = str, moka_xp = xp, cells = n, updated_at = now() where user_id = uid;
  insert into public.lb_daily (user_id, day, clean) values (uid, today, c)
    on conflict (user_id, day) do update set clean = excluded.clean;
  delete from public.lb_daily where user_id = uid and day < today - 30;
end;
$$;
revoke all on function public.lb_publish(integer, integer, integer) from public, anon;
grant execute on function public.lb_publish(integer, integer, integer) to authenticated;

create or replace function public.lb_top(p_period text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  wk date := date_trunc('week', (now() at time zone 'utc'))::date;
  res jsonb;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if p_period not in ('hafta', 'hepsi') then raise exception 'bad args'; end if;

  with parts as (
    select p.user_id, p.nick, p.level, p.streak,
      floor(coalesce((select sum(price) from public.play_owned o
        where o.user_id = p.user_id and (p_period = 'hepsi' or o.created_at >= wk)), 0) / 10.0)::int as items,
      least(300, floor(coalesce((select sum(price) from public.play_spend g
        where g.user_id = p.user_id and (p_period = 'hepsi' or g.day >= wk)), 0) / 10.0))::int as garden,
      case when p_period = 'hepsi' then p.clean
           else round(coalesce((select avg(clean) from public.lb_daily x where x.user_id = p.user_id and x.day >= wk), 0))::int end as clean,
      p.cells,
      greatest(0, (now() at time zone 'utc')::date - coalesce((select u.created_at from auth.users u where u.id = p.user_id), p.joined_at)::date) as age
    from public.lb_profiles p
    where (select count(distinct day) from public.play_events e where e.user_id = p.user_id) >= 3
  ), fair as (
    select *,
      round(least(items + garden, (case when p_period = 'hepsi' then age else least(age, 7) end) * 12 + 30)
        / least(1.6, greatest(0.6, sqrt(cells / 24.0))))::int + clean as score
    from parts
  ), ranked as (
    select *, row_number() over (order by score desc, level desc, streak desc, user_id) as rank
    from fair
  )
  select jsonb_build_object(
    'top', coalesce((
      select jsonb_agg(jsonb_build_object('rank', rank, 'nick', nick, 'score', score, 'items', items, 'garden', garden,
        'clean', clean, 'level', level, 'streak', streak, 'me', user_id = uid) order by rank)
      from ranked where rank <= 50), '[]'::jsonb),
    'me', (select jsonb_build_object('rank', rank, 'nick', nick, 'score', score, 'items', items, 'garden', garden,
        'clean', clean, 'level', level, 'streak', streak) from ranked where user_id = uid),
    'joined', exists (select 1 from public.lb_profiles where user_id = uid),
    'nick', (select nick from public.lb_profiles where user_id = uid),
    'total', (select count(*) from ranked)
  ) into res;
  return res;
end;
$$;


-- ===== 20261110000000_ai_koruma =====
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

-- ===== 20261110100000_guvenlik_2 =====
-- Guvenlik incelemesi 2 (2026-11-10). Supabase SQL Editor'de bir kere calistir (tekrar calistirmak zararsiz).
-- Once 20261109120000_siralama_adil.sql ve 20261109000000_aile_haftasi.sql calismis olmali.
--
-- 1) Sonradan eklenen tablolarda gereksiz anon/authenticated yetkilerini kaldir (RLS'e ikinci kilit).
-- 2) Siralama takma adi: gorunmez/yon degistiren karakterler, kufur/nefret, taklit (admin, homezy...), ayni ad ikinci kez alinamaz.
-- 3) Siralama "temizlik yuzdesi" istemciden gelir; sunucudaki gercek aktiviteyle sinirlanir (sahte %100 engeli).
-- 4) Moderasyon: lb_profiles.hidden. Uygunsuz takma ad icin: select public.lb_hide('ad');
-- 5) family_report / goal_add: null parametre (least/greatest null'u yok sayar) en yuksek degere donusuyordu.
-- 6) Hesap silme: aile haftasi sayaclari da silinir.

/* ---------- 1) yetkiler ---------- */
revoke all on table public.lb_profiles, public.lb_daily, public.family_daily from anon, authenticated;

/* ---------- 2) takma ad ---------- */
alter table public.lb_profiles add column if not exists hidden boolean not null default false;

create or replace function public.lb_nick_ok(p_nick text) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  n text := btrim(coalesce(p_nick, ''));
  norm text;
  bad text;
begin
  if char_length(n) < 2 or char_length(n) > 16 then return false; end if;
  -- Kontrol, sifir genislikli ve yon degistiren (RTL) karakterler.
  if n ~ U&'[\0001-\001F\007F-\009F\200B-\200F\202A-\202E\2060-\206F\FEFF]' then return false; end if;
  if n ~* '(@|https?:|www\.|\.com|\.net|\.org|\.tr|t\.me|discord|whatsapp|instagram|telegram)' then return false; end if;
  -- Normalle: Turkce harfleri sadelestir, kucult, "leet" yazimini ac, harf/rakam disini at.
  norm := translate(n, U&'\0131\0130\015F\015E\011F\011E\00FC\00DC\00F6\00D6\00E7\00C7', 'iissgguuoocc');
  norm := lower(norm);
  norm := translate(norm, '013457$@!', 'oieastsai');
  norm := regexp_replace(norm, '[^a-z0-9]', '', 'g');
  foreach bad in array array[
    'orospu', 'orosbu', 'siktir', 'sikeyim', 'sikik', 'sikis', 'yarrak', 'yarak', 'amcik', 'ibne', 'pezevenk',
    'kahpe', 'gavat', 'gotveren', 'fuck', 'shit', 'bitch', 'cunt', 'pussy', 'nigger', 'nigga',
    'faggot', 'whore', 'slut', 'rapist', 'hitler', 'adolf', 'porn',
    'admin', 'moderator', 'homezy', 'meikai', 'destek', 'support', 'official'
  ] loop
    if position(bad in norm) > 0 then return false; end if;
  end loop;
  return true;
end;
$$;
revoke all on function public.lb_nick_ok(text) from public, anon;
grant execute on function public.lb_nick_ok(text) to authenticated;

create or replace function public.lb_join(p_nick text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  n text := btrim(coalesce(p_nick, ''));
begin
  if uid is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'account required';
  end if;
  if not public.lb_nick_ok(n) then
    raise exception 'bad nick';
  end if;
  perform pg_advisory_xact_lock(hashtext('lb_nick'));
  -- Baskasinin kullandigi ad (buyuk/kucuk harf farksiz) alinamaz: taklit engeli.
  if exists (select 1 from public.lb_profiles where lower(nick) = lower(n) and user_id <> uid) then
    raise exception 'bad nick';
  end if;
  insert into public.lb_profiles (user_id, nick) values (uid, n)
    on conflict (user_id) do update set nick = excluded.nick;
end;
$$;

-- Mevcut takma adlari tara: uygun olmayanlar gizlenir (silinmez; kullanici yeni ad secince tekrar gorunur).
update public.lb_profiles set hidden = true where not public.lb_nick_ok(nick);

-- Moderasyon (sadece SQL Editor / service role): takma adi listeden gizler.
create or replace function public.lb_hide(p_nick text) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  update public.lb_profiles set hidden = true where lower(nick) = lower(btrim(p_nick));
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.lb_hide(text) from public, anon, authenticated;

/* ---------- 3) temizlik yuzdesi gercek aktiviteye bagli ---------- */
-- Son 7 gunde puan alinan her gun icin en fazla %25: sahte %100 icin birkac gunluk gercek aktivite gerekir.
create or replace function public.lb_publish(p_clean integer, p_xp integer default 0, p_cells integer default 24) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  row public.lb_profiles;
  today date := (now() at time zone 'utc')::date;
  lvl integer;
  str integer := 0;
  d date;
  active7 integer;
  c integer;
  xp integer;
  n integer := greatest(1, least(400, coalesce(p_cells, 24)));
begin
  if uid is null then return; end if;
  select * into row from public.lb_profiles where user_id = uid;
  if not found or row.updated_at > now() - interval '10 minutes' then return; end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));

  select count(distinct day) into lvl from public.play_events where user_id = uid;
  select count(distinct day) into active7 from public.play_events
    where user_id = uid and kind <> 'dondur' and day > today - 7;
  c := least(greatest(0, least(100, coalesce(p_clean, 0))), active7 * 25);
  xp := greatest(0, least(coalesce(p_xp, 0), 28 * (lvl + 1)));
  lvl := least(100, lvl);
  d := case when exists (select 1 from public.play_events where user_id = uid and day >= today) then today else today - 1 end;
  while exists (select 1 from public.play_events where user_id = uid and day = d) loop
    str := str + 1;
    d := d - 1;
  end loop;

  update public.lb_profiles set clean = c, level = lvl, streak = str, moka_xp = xp, cells = n, updated_at = now() where user_id = uid;
  insert into public.lb_daily (user_id, day, clean) values (uid, today, c)
    on conflict (user_id, day) do update set clean = excluded.clean;
  delete from public.lb_daily where user_id = uid and day < today - 30;
end;
$$;
revoke all on function public.lb_publish(integer, integer, integer) from public, anon;
grant execute on function public.lb_publish(integer, integer, integer) to authenticated;

/* ---------- 4) listeler gizlenenleri gostermez ---------- */
create or replace function public.lb_top(p_period text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  wk date := date_trunc('week', (now() at time zone 'utc'))::date;
  res jsonb;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if p_period not in ('hafta', 'hepsi') then raise exception 'bad args'; end if;

  with parts as (
    select p.user_id, p.nick, p.level, p.streak,
      floor(coalesce((select sum(price) from public.play_owned o
        where o.user_id = p.user_id and (p_period = 'hepsi' or o.created_at >= wk)), 0) / 10.0)::int as items,
      least(300, floor(coalesce((select sum(price) from public.play_spend g
        where g.user_id = p.user_id and (p_period = 'hepsi' or g.day >= wk)), 0) / 10.0))::int as garden,
      case when p_period = 'hepsi' then p.clean
           else round(coalesce((select avg(clean) from public.lb_daily x where x.user_id = p.user_id and x.day >= wk), 0))::int end as clean,
      p.cells,
      greatest(0, (now() at time zone 'utc')::date - coalesce((select u.created_at from auth.users u where u.id = p.user_id), p.joined_at)::date) as age
    from public.lb_profiles p
    where not p.hidden
      and (select count(distinct day) from public.play_events e where e.user_id = p.user_id) >= 3
  ), fair as (
    select *,
      round(least(items + garden, (case when p_period = 'hepsi' then age else least(age, 7) end) * 12 + 30)
        / least(1.6, greatest(0.6, sqrt(cells / 24.0))))::int + clean as score
    from parts
  ), ranked as (
    select *, row_number() over (order by score desc, level desc, streak desc, user_id) as rank
    from fair
  )
  select jsonb_build_object(
    'top', coalesce((
      select jsonb_agg(jsonb_build_object('rank', rank, 'nick', nick, 'score', score, 'items', items, 'garden', garden,
        'clean', clean, 'level', level, 'streak', streak, 'me', user_id = uid) order by rank)
      from ranked where rank <= 50), '[]'::jsonb),
    'me', (select jsonb_build_object('rank', rank, 'nick', nick, 'score', score, 'items', items, 'garden', garden,
        'clean', clean, 'level', level, 'streak', streak) from ranked where user_id = uid),
    'joined', exists (select 1 from public.lb_profiles where user_id = uid),
    'nick', (select nick from public.lb_profiles where user_id = uid),
    'total', (select count(*) from ranked)
  ) into res;
  return res;
end;
$$;

create or replace function public.lb_moka_top() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  res jsonb;
begin
  if uid is null then raise exception 'not signed in'; end if;
  with ranked as (
    select p.user_id, p.nick, p.level, p.streak, p.moka_xp as xp, public.lb_moka_level(p.moka_xp) as moka,
      row_number() over (order by p.moka_xp desc, p.level desc, p.user_id) as rank
    from public.lb_profiles p
    where not p.hidden
      and (select count(distinct day) from public.play_events e where e.user_id = p.user_id) >= 3
  )
  select jsonb_build_object(
    'top', coalesce((
      select jsonb_agg(jsonb_build_object('rank', rank, 'nick', nick, 'score', moka, 'xp', xp, 'level', level, 'streak', streak, 'me', user_id = uid) order by rank)
      from ranked where rank <= 50), '[]'::jsonb),
    'me', (select jsonb_build_object('rank', rank, 'nick', nick, 'score', moka, 'xp', xp, 'level', level, 'streak', streak) from ranked where user_id = uid),
    'joined', exists (select 1 from public.lb_profiles where user_id = uid),
    'nick', (select nick from public.lb_profiles where user_id = uid),
    'total', (select count(*) from ranked)
  ) into res;
  return res;
end;
$$;
revoke all on function public.lb_top(text) from public, anon;
revoke all on function public.lb_moka_top() from public, anon;
grant execute on function public.lb_top(text) to authenticated;
grant execute on function public.lb_moka_top() to authenticated;

/* ---------- 5) null parametreler ---------- */
create or replace function public.family_report(p_day date, p_done int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  fid uuid := public.family_of(uid);
begin
  if fid is null then raise exception 'no family'; end if;
  if not public.is_premium_own(fid) then raise exception 'owner not premium'; end if;
  if p_day is null or p_done is null or p_day < current_date - 1 or p_day > current_date then raise exception 'bad day'; end if;
  insert into public.family_daily (owner_id, user_id, day, done)
    values (fid, uid, p_day, greatest(0, least(p_done, 200)))
    on conflict (owner_id, user_id, day) do update set done = greatest(public.family_daily.done, excluded.done);
  delete from public.family_daily where owner_id = fid and day < current_date - 60;
  return public.family_week();
end;
$$;
revoke all on function public.family_report(date, int) from public, anon;
grant execute on function public.family_report(date, int) to authenticated;

create or replace function public.goal_add(p_title text, p_emoji text, p_target int, p_unit text, p_due date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  fid uuid := public.family_of(uid);
begin
  if fid is null then raise exception 'no family'; end if;
  if not public.is_premium_own(fid) then raise exception 'owner not premium'; end if;
  if p_title is null or char_length(btrim(p_title)) = 0 or p_target is null then raise exception 'bad goal'; end if;
  if (select count(*) from public.family_goals where owner_id = fid and done_at is null) >= 20 then
    raise exception 'too many goals';
  end if;
  insert into public.family_goals (owner_id, title, emoji, target, unit, due, created_by)
    values (fid, left(btrim(p_title), 60), left(coalesce(nullif(btrim(p_emoji), ''), U&'\1F3AF'), 8),
            greatest(1, least(p_target, 10000)), left(coalesce(nullif(btrim(p_unit), ''), 'kez'), 16), p_due, uid);
  return public.goals_list();
end;
$$;
revoke all on function public.goal_add(text, text, int, text, date) from public, anon;
grant execute on function public.goal_add(text, text, int, text, date) to authenticated;

create or replace function public.goal_log(p_goal uuid, p_n int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  fid uuid := public.family_of(uid);
  g public.family_goals;
begin
  if fid is null then raise exception 'no family'; end if;
  if not public.is_premium_own(fid) then raise exception 'owner not premium'; end if;
  if p_n is null then raise exception 'bad amount'; end if;
  perform pg_advisory_xact_lock(hashtext(p_goal::text));
  select * into g from public.family_goals where id = p_goal and owner_id = fid;
  if not found then raise exception 'no goal'; end if;
  if (select count(*) from public.family_goal_logs where user_id = uid and created_at > now() - interval '1 day') >= 50 then
    raise exception 'rate limit';
  end if;
  insert into public.family_goal_logs (goal_id, user_id, n) values (p_goal, uid, greatest(1, least(p_n, 100)));
  if g.done_at is null and (select sum(n) from public.family_goal_logs where goal_id = p_goal) >= g.target then
    update public.family_goals set done_at = now() where id = p_goal;
  end if;
  return public.goals_list();
end;
$$;
revoke all on function public.goal_log(uuid, int) from public, anon;
grant execute on function public.goal_log(uuid, int) to authenticated;

/* ---------- 6) hesap silme ---------- */
-- lb_profiles / lb_daily auth.users'a "on delete cascade" ile baglidir. family_daily.user_id baglantisiz oldugu icin elle silinir.
create or replace function public.delete_me() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  delete from public.family_goal_logs where user_id = uid;
  delete from public.family_daily where user_id = uid;
  update public.shared_homes set updated_by = null where updated_by = uid;
  update public.family_goals set created_by = owner_id where created_by = uid and owner_id <> uid;
  delete from storage.objects where bucket_id = 'yedek' and (storage.foldername(name))[1] = uid::text;
  delete from auth.users where id = uid;
end;
$$;
revoke all on function public.delete_me() from public, anon;
grant execute on function public.delete_me() to authenticated;

-- ===== 20261110120000_magaza_eksik =====
-- Mağazada olup sunucu tablosunda eksik kalan eşyalar (src/domain/items.ts ile aynı).
-- Eksikken satın alma 'unknown item' hatası veriyordu. SQL Editor'da bir kere çalıştır; tekrar çalıştırmak zararsız.
insert into public.play_items (id, price, premium) values
  ('kahve_makinesi', 70, false),
  ('tv_unitesi', 110, false),
  ('teleskop', 140, false),
  ('avize', 170, true),
  ('bilardo', 220, true),
  ('orkide', 35, false),
  ('kaktus', 35, false),
  ('monstera', 45, false),
  ('sukulent', 30, false),
  ('komodin', 45, false),
  ('calisma_masasi', 85, false),
  ('berjer', 95, false),
  ('duvar_saati', 55, false),
  ('tablo', 75, false),
  ('ayna', 65, false),
  ('kulaklik', 60, false),
  ('muzik_kutusu', 85, false),
  ('hoparlor', 95, false),
  ('retro_radyo', 100, false),
  ('papagan', 130, false),
  ('akilli_mama', 75, false),
  ('kristal_kure', 160, true),
  ('gramofon', 190, true),
  ('sallanan_sandalye', 105, false),
  ('bonsai', 115, true),
  ('vazo', 50, false),
  ('oyun_konsolu', 180, true),
  ('fotograf_makinesi', 135, false),
  ('bambu', 90, false),
  ('duvar_rafi', 40, false),
  ('masa_lambasi', 50, false),
  ('koltuk_takimi', 140, false),
  ('yemek_masasi', 120, false),
  ('gardirop', 100, false),
  ('sehpa', 55, false),
  ('yatak_ranza', 90, false),
  ('kitap_koltugu', 75, false),
  ('sarkit_isik', 45, false),
  ('lava_lambasi', 65, false),
  ('zemin_lambasi', 80, false),
  ('mum', 25, false),
  ('fener', 40, false),
  ('duvar_halisi', 60, false),
  ('poster', 35, false),
  ('boy_ayna', 70, false),
  ('duvar_cicegi', 55, false),
  ('neon_yazi', 120, true),
  ('yucca', 50, false),
  ('sarmasik', 40, false),
  ('lavanta', 35, false),
  ('aloe', 30, false),
  ('limon_agaci', 130, true),
  ('palmiye', 85, false),
  ('kedi_yatagi', 45, false),
  ('kopek_yatagi', 45, false),
  ('tavsan', 110, false),
  ('hamster', 90, false),
  ('kus_yemligi', 60, false),
  ('yilbasi_agaci', 140, false),
  ('kar_adami', 90, false),
  ('balkabagi', 40, false),
  ('ramazan_feneri', 50, false),
  ('plaj_semsiyesi', 70, false),
  ('cicek_celengi', 60, false),
  ('bilgisayar_masasi', 160, false),
  ('spor_kosesi', 120, false),
  ('yoga_mati', 45, false),
  ('resim_sehpasi', 90, false),
  ('dikis_makinesi', 100, false),
  ('posta_kutusu', 40, false),
  ('cit', 60, false),
  ('bahce_lambasi', 55, false),
  ('kus_evi', 70, false),
  ('paspas', 25, false),
  ('salincak', 110, true)
on conflict (id) do update set price = excluded.price, premium = excluded.premium;

-- ===== 20261111000000_delete_me_duzelt =====
-- Hesap silme donuyordu / hata veriyordu: Supabase, storage.objects tablosundan doğrudan silmeye izin vermez
-- ("Direct deletion from storage tables is not allowed"). Yedek fotoğraflar uygulamada Storage API ile silinir
-- (src/sync/photos.ts removeAllPhotos); burada o satır kaldırıldı.
create or replace function public.delete_me() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  delete from public.family_goal_logs where user_id = uid;
  delete from public.family_daily where user_id = uid;
  update public.shared_homes set updated_by = null where updated_by = uid;
  update public.family_goals set created_by = owner_id where created_by = uid and owner_id <> uid;
  delete from auth.users where id = uid;
end;
$$;
revoke all on function public.delete_me() from public, anon;
grant execute on function public.delete_me() to authenticated;
