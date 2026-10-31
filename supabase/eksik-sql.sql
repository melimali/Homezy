-- Sadece buyuk ihtimalle eksik olanlar: bahce, aile evi, moka sohbet, yasal silme. Tekrar calistirmak guvenli.
-- Onkosul: puan, premium, scan bolumleri uygulanmis olmali (yoksa tum-sql.sql calistir).
-- =====================================================================
-- 20261027120000_bahce.sql
-- =====================================================================
-- Moka'nin bahcesi ve ev kisiligi.
-- Tohum ve gubre tekrar alinir: `play_owned` (kullanici + esya basina bir satir) bunu tutamaz, bu yuzden
-- ayri bir harcama tablosu var. Bahce susleri ve kisilikler bir kere alinir, mevcut `play_items` / `play_buy`
-- ile calisir. Puan = kazanilan - esyalar - bahce harcamalari. Uygulamadaki src/domain/garden.ts ve
-- src/domain/items.ts ile ayni olmali. Bu dosya bir kere calistirilir.

/* ---------- tek seferlik: susler ve kisilikler ---------- */

insert into public.play_items (id, price, premium) values
  ('sulama', 60, false), ('ugurbocegi', 90, false), ('hamak', 120, false), ('sera', 180, true),
  ('kisilik_sakin', 150, false), ('kisilik_neseli', 150, false)
on conflict (id) do update set price = excluded.price, premium = excluded.premium;

/* ---------- tekrar alinanlar: tohumlar ve gubre ---------- */

-- `daily_max`: bir gunde en fazla kac kez alinir (null: sinirsiz).
create table if not exists public.play_garden_items (
  id text primary key,
  price integer not null check (price > 0),
  premium boolean not null default false,
  daily_max integer check (daily_max > 0)
);

insert into public.play_garden_items (id, price, premium, daily_max) values
  ('papatya', 20, false, null), ('kardelen', 25, false, null), ('menekse', 30, false, null),
  ('lale', 40, false, null), ('nergis', 50, false, null), ('sumbul', 60, false, null),
  ('lavanta', 75, false, null), ('aycicegi', 90, false, null), ('gul', 110, false, null),
  ('yasemin', 130, false, null), ('krizantem', 140, false, null), ('kasimpati', 150, false, null),
  ('begonvil', 170, false, null), ('orkide', 200, true, null), ('nilufer', 250, true, null),
  ('ataturk', 300, true, null),
  ('gubre_avuc', 15, false, 2), ('gubre_torba', 40, false, 1)
on conflict (id) do nothing;

-- Her harcama bir satir. Gun, telefonun yerel gunu (gunluk sinir icin).
create table if not exists public.play_spend (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null references public.play_garden_items (id),
  price integer not null,
  day date not null,
  created_at timestamptz not null default now()
);
create index if not exists play_spend_user_day on public.play_spend (user_id, day);

alter table public.play_garden_items enable row level security;
alter table public.play_spend enable row level security;
drop policy if exists U&"bah\00E7e: herkes okur" on public.play_garden_items;
create policy U&"bah\00E7e: herkes okur" on public.play_garden_items
  for select to authenticated using (true);
drop policy if exists U&"bah\00E7e: kendi harcamalar\0131n\0131 okur" on public.play_spend;
create policy U&"bah\00E7e: kendi harcamalar\0131n\0131 okur" on public.play_spend
  for select to authenticated using ((select auth.uid()) = user_id);

-- Ozet (..._premium.sql'deki ile ayni), puandan bahce harcamalari da dusulur.
create or replace function public.play_summary() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'points',
      coalesce((select sum(points) from public.play_events where user_id = auth.uid()), 0)
      - coalesce((select sum(price) from public.play_owned where user_id = auth.uid()), 0)
      - coalesce((select sum(price) from public.play_spend where user_id = auth.uid()), 0),
    'days', coalesce((
      select jsonb_agg(to_char(d, 'YYYY-MM-DD') order by d)
      from (
        select distinct day as d from public.play_events
        where user_id = auth.uid() and kind <> 'dondur' and day > current_date - 400
      ) x
    ), '[]'::jsonb),
    'frozen', coalesce((
      select jsonb_agg(to_char(day, 'YYYY-MM-DD') order by day)
      from public.play_events
      where user_id = auth.uid() and kind = 'dondur' and day > current_date - 400
    ), '[]'::jsonb),
    'owned', coalesce((select jsonb_agg(item_id order by created_at) from public.play_owned where user_id = auth.uid()), '[]'::jsonb)
  );
$$;

-- Tohum ya da gubre alma: puan yeterliyse, Premium'a ozelse Premium etkinse, gunluk sinir dolmadiysa.
create or replace function public.play_spend(p_item text, p_day date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'utc')::date;
  item public.play_garden_items;
  balance integer;
  n integer;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  if p_day is null or p_day < today - 1 or p_day > today + 1 then
    raise exception 'bad day';
  end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));
  select * into item from public.play_garden_items where id = p_item;
  if not found then
    raise exception 'unknown item';
  end if;
  if item.premium and not public.is_premium(uid) then
    raise exception 'premium required';
  end if;
  if item.daily_max is not null then
    select count(*) into n from public.play_spend where user_id = uid and item_id = p_item and day = p_day;
    if n >= item.daily_max then
      raise exception 'daily limit';
    end if;
  end if;
  balance := (public.play_summary() ->> 'points')::integer;
  if balance < item.price then
    raise exception 'not enough points';
  end if;
  insert into public.play_spend (user_id, item_id, price, day) values (uid, item.id, item.price, p_day);
  return public.play_summary();
end;
$$;

revoke all on function public.play_spend(text, date) from public, anon;
grant execute on function public.play_spend(text, date) to authenticated;


-- =====================================================================
-- 20261031000000_aile_evi.sql
-- =====================================================================
-- Aile evi, ikinci adim (docs/aile-evi.md). Supabase SQL Editor'de bir kere calistir.
-- Once 20261021100000_premium.sql calismis olmali.

/* ---------- Premium ev halkasina yayilir ---------- */

-- Kendi aboneligi (eski is_premium).
create or replace function public.is_premium_own(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = p_user and active and (expires_at is null or expires_at > now())
  );
$$;
revoke all on function public.is_premium_own(uuid) from public, anon, authenticated;

-- Premium: kendi aboneligi ya da ev sahibinin aboneligi (aile uyesiyse). Tarama hakki, 1,5 kat puan
-- ve depolama kurallari bunu kullanir, yani katilan kisi de Premium avantajini alir.
create or replace function public.is_premium(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_premium_own(p_user) or exists (
    select 1 from public.family_members m
    where m.user_id = p_user and public.is_premium_own(m.owner_id)
  );
$$;

-- Ev kurmak icin kisinin kendi aboneligi gerekir (uyelikten gelen Premium yetmez).
create or replace function public.family_create(p_home_id text, p_name text, p_state jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  k text;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  if not public.is_premium_own(uid) then
    raise exception 'premium required';
  end if;
  if exists (select 1 from public.family_members where user_id = uid) then
    delete from public.family_members where user_id = uid;
  end if;
  loop
    k := (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 6));
    exit when not exists (select 1 from public.families where code = k);
  end loop;
  insert into public.families (owner_id, owner_name, code, home_id)
    values (uid, left(coalesce(nullif(trim(p_name), ''), 'Ev sahibi'), 30), k, left(p_home_id, 64))
    on conflict (owner_id) do update set home_id = excluded.home_id, owner_name = excluded.owner_name;
  insert into public.shared_homes (owner_id, state, updated_by) values (uid, p_state, uid)
    on conflict (owner_id) do update set state = excluded.state, updated_at = now(), updated_by = uid;
  return public.family_info();
end;
$$;

/* ---------- Ortak hedefler ---------- */

create table if not exists public.family_goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.families (owner_id) on delete cascade,
  title text not null,
  emoji text not null default U&'\1F3AF',
  target int not null check (target between 1 and 10000),
  unit text not null default 'kez',
  due date,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index if not exists family_goals_owner on public.family_goals (owner_id);

create table if not exists public.family_goal_logs (
  id bigint generated always as identity primary key,
  goal_id uuid not null references public.family_goals (id) on delete cascade,
  user_id uuid not null,
  n int not null check (n between 1 and 100),
  created_at timestamptz not null default now()
);
create index if not exists family_goal_logs_goal on public.family_goal_logs (goal_id);

-- Tablolara dogrudan erisim yok; sadece fonksiyonlar.
alter table public.family_goals enable row level security;
alter table public.family_goal_logs enable row level security;

-- Cagiranin ailesinin hedefleri, toplam ve kisi basi ilerlemeyle.
create or replace function public.goals_list() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', g.id, 'title', g.title, 'emoji', g.emoji, 'target', g.target, 'unit', g.unit,
    'due', g.due, 'done', g.done_at is not null, 'createdBy', g.created_by,
    'total', coalesce((select sum(l.n) from public.family_goal_logs l where l.goal_id = g.id), 0),
    'byMember', coalesce((
      select jsonb_object_agg(x.user_id, x.s)
      from (select l.user_id, sum(l.n) as s from public.family_goal_logs l where l.goal_id = g.id group by l.user_id) x
    ), '{}'::jsonb)
  ) order by g.done_at is not null, g.created_at desc), '[]'::jsonb)
  from public.family_goals g
  where g.owner_id = public.family_of(auth.uid());
$$;

create or replace function public.goal_add(p_title text, p_emoji text, p_target int, p_unit text, p_due date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  fid uuid := public.family_of(uid);
begin
  if fid is null then raise exception 'no family'; end if;
  if not public.is_premium_own(fid) then raise exception 'owner not premium'; end if;
  if (select count(*) from public.family_goals where owner_id = fid and done_at is null) >= 20 then
    raise exception 'too many goals';
  end if;
  insert into public.family_goals (owner_id, title, emoji, target, unit, due, created_by)
    values (fid, left(trim(p_title), 60), left(coalesce(nullif(trim(p_emoji), ''), U&'\1F3AF'), 8),
            greatest(1, least(p_target, 10000)), left(coalesce(nullif(trim(p_unit), ''), 'kez'), 16), p_due, uid);
  return public.goals_list();
end;
$$;

-- Hedefe ilerleme yaz (or. "3 kitap okudum"). Hedef dolunca tamamlandi olur.
create or replace function public.goal_log(p_goal uuid, p_n int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  fid uuid := public.family_of(uid);
  g public.family_goals;
begin
  if fid is null then raise exception 'no family'; end if;
  if not public.is_premium_own(fid) then raise exception 'owner not premium'; end if;
  perform pg_advisory_xact_lock(hashtext(p_goal::text));
  select * into g from public.family_goals where id = p_goal and owner_id = fid;
  if not found then raise exception 'no goal'; end if;
  insert into public.family_goal_logs (goal_id, user_id, n) values (p_goal, uid, greatest(1, least(p_n, 100)));
  if g.done_at is null and (select sum(n) from public.family_goal_logs where goal_id = p_goal) >= g.target then
    update public.family_goals set done_at = now() where id = p_goal;
  end if;
  return public.goals_list();
end;
$$;

-- Hedefi ekleyen ya da ev sahibi silebilir.
create or replace function public.goal_delete(p_goal uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  fid uuid := public.family_of(uid);
begin
  delete from public.family_goals
    where id = p_goal and owner_id = fid and (created_by = uid or owner_id = uid);
  return public.goals_list();
end;
$$;

revoke all on function public.goals_list() from public, anon;
revoke all on function public.goal_add(text, text, int, text, date) from public, anon;
revoke all on function public.goal_log(uuid, int) from public, anon;
revoke all on function public.goal_delete(uuid) from public, anon;
grant execute on function public.goals_list() to authenticated;
grant execute on function public.goal_add(text, text, int, text, date) to authenticated;
grant execute on function public.goal_log(uuid, int) to authenticated;
grant execute on function public.goal_delete(uuid) to authenticated;


-- =====================================================================
-- 20261031120000_moka_chat.sql
-- =====================================================================
-- Moka sohbet botu: kullanici basina gunluk mesaj siniri (Turkiye saatine gore gun).
-- Ucretsiz gunde 15, Premium gunde 150. Sinirlar uygulamadaki src/domain/premium.ts (LIMITS.*.chats) ile ayni olmali.
-- Sadece fonksiyon yazar; mesaj icerigi saklanmaz, sadece sayac tutulur.

create table if not exists public.chat_usage (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  n int not null default 0,
  primary key (user_id, day)
);
alter table public.chat_usage enable row level security;
-- Hicbir politika yok: istemci okuyamaz ya da yazamaz, service role atlar.

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

-- Cevap alinamazsa hak geri verilir.
create or replace function public.chat_release(p_user uuid, p_day date) returns void
language sql security definer set search_path = '' as $$
  update public.chat_usage set n = greatest(0, n - 1) where user_id = p_user and day = p_day;
$$;
revoke all on function public.chat_release(uuid, date) from public, anon, authenticated;


-- =====================================================================
-- 20261031150000_yasal_silme.sql
-- =====================================================================
-- Yasal uyum (KVKK / GDPR / LGPD): "Hesabimi sil" kullaniciya ait HER seyi silsin.
-- Supabase SQL Editor'de bir kere calistir. Once 20261031000000_aile_evi.sql calismis olmali.
--
-- Zaten "on delete cascade" ile gidenler: profiles, homes, subscriptions, play_events, play_owned, play_spend,
-- scan_usage, chat_usage, families (ev sahibiyse aile, paylasilan ev, ortak hedefler), family_members.
-- Baglantisi olmayan ve burada elle silinenler: ortak hedeflere yazdigi ilerleme kayitlari, ortak evde "son duzenleyen" izi.
-- Storage'daki yedek fotograflar uygulamada silinir (src/sync/photos.ts removeAllPhotos); asagida yedek olarak SQL'den de silinir.

create or replace function public.delete_me() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  delete from public.family_goal_logs where user_id = uid;
  update public.shared_homes set updated_by = null where updated_by = uid;
  -- Bu kullanicinin ekledigi hedefler baskalarinin ailesinde kaliyorsa sahibi artik yok sayilmasin diye ev sahibine devret.
  update public.family_goals set created_by = owner_id where created_by = uid and owner_id <> uid;
  delete from storage.objects where bucket_id = 'yedek' and (storage.foldername(name))[1] = uid::text;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_me() from public, anon;
grant execute on function public.delete_me() to authenticated;
