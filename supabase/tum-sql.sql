-- Homezy: TUM Supabase SQL'leri tek dosyada (supabase/migrations/*.sql, tarih sirasiyla).
-- Supabase > SQL Editor > New query > yapistir > Run. Tekrar calistirmak guvenlidir
-- (IF NOT EXISTS / CREATE OR REPLACE / DROP ... IF EXISTS / ON CONFLICT kullanildi).
-- Bu dosya otomatik uretildi; kaynak: supabase/migrations. Elle duzenleme, yeniden uret.


-- =====================================================================
-- 20261020210000_hesap.sql
-- =====================================================================
-- Hesaplar, ev yedegi ve abonelik durumu.
-- Odeme / kart bilgisi hicbir tabloda yok: odemeyi App Store ve Google Play alir,
-- biz sadece RevenueCat'in bildirdigi "Premium etkin mi, ne zaman bitiyor" bilgisini tutariz.

-- Profil: ad. Kayitta auth.users'tan otomatik olusur.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  created_at timestamptz not null default now()
);

-- Ev verisinin bulut yedegi: kullanici basina tek satir, uygulamadaki state'in JSON hali.
create table if not exists public.homes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

-- Abonelik durumu. Sadece sunucu (RevenueCat webhook fonksiyonu) yazar, kullanici okur.
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  entitlement text not null default 'premium',
  active boolean not null default false,
  product_id text,
  store text,
  period_type text,
  expires_at timestamptz,
  will_renew boolean,
  last_event text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.homes enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists U&"profil: kendi sat\0131r\0131n\0131 okur" on public.profiles;
create policy U&"profil: kendi sat\0131r\0131n\0131 okur" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
drop policy if exists U&"profil: kendi sat\0131r\0131n\0131 g\00FCnceller" on public.profiles;
create policy U&"profil: kendi sat\0131r\0131n\0131 g\00FCnceller" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "ev: kendi evini okur" on public.homes;
create policy "ev: kendi evini okur" on public.homes
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "ev: kendi evini ekler" on public.homes;
create policy "ev: kendi evini ekler" on public.homes
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists U&"ev: kendi evini g\00FCnceller" on public.homes;
create policy U&"ev: kendi evini g\00FCnceller" on public.homes
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "abonelik: kendi durumunu okur" on public.subscriptions;
create policy "abonelik: kendi durumunu okur" on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);

-- updated_at'i her yazista tazele.
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists homes_touch on public.homes;
create trigger homes_touch before update on public.homes
  for each row execute function public.touch_updated_at();

-- Yeni kullaniciya profil satiri ac (anonim misafirler dahil).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name) values (new.id, new.raw_user_meta_data ->> 'name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();


-- =====================================================================
-- 20261020230000_delete_me.sql
-- =====================================================================
-- Uygulamadaki "Hesabimi sil" dugmesi (Apple App Review 5.1.1(v): hesap acilabiliyorsa uygulama icinden silinebilmeli).
-- Giris yapmis kullanici (anonim misafir dahil) sadece kendini silebilir. profiles, homes ve subscriptions
-- satirlari "on delete cascade" ile birlikte gider.
create or replace function public.delete_me() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_me() from public, anon;
grant execute on function public.delete_me() to authenticated;


-- =====================================================================
-- 20261021000000_puan.sql
-- =====================================================================
-- Puan, seri ve esya magazasi.
-- Puani sunucu sayar: uygulama sadece "su isi bugun yaptim" der, kac puan verilecegine ve
-- ayni isin o gun daha once puan alip almadigina sunucu karar verir. Telefonun saatini
-- degistirmek en fazla bir gunluk oynama payi birakir (saat dilimleri icin gerekli).
-- Tablolara uygulama dogrudan yazamaz; sadece asagidaki fonksiyonlar yazar.

-- Puan getiren her is: (kullanici, gun, tur, is) basina bir satir. Gunde bir kurali birincil anahtarla saglanir.
create table if not exists public.play_events (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('gorev', 'spor', 'gunluk', 'seri')),
  ref text not null,
  points integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, day, kind, ref)
);

-- Magazadaki esyalar. Uygulamadaki src/domain/items.ts ile ayni olmali.
create table if not exists public.play_items (
  id text primary key,
  price integer not null check (price > 0),
  premium boolean not null default false
);

insert into public.play_items (id, price, premium) values
  ('saksi', 30, false), ('puf', 40, false), ('hali', 50, false), ('abajur', 60, false),
  ('kitaplik', 80, false), ('gitar', 90, false), ('kedi', 120, false), ('kopek', 120, false),
  ('akvaryum', 150, true), ('somine', 200, true), ('piyano', 250, true)
on conflict (id) do nothing;

-- Alinan esyalar. Fiyat alindigi andaki haliyle saklanir.
create table if not exists public.play_owned (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null references public.play_items (id),
  price integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.play_events enable row level security;
alter table public.play_items enable row level security;
alter table public.play_owned enable row level security;

drop policy if exists U&"puan: kendi kay\0131tlar\0131n\0131 okur" on public.play_events;
create policy U&"puan: kendi kay\0131tlar\0131n\0131 okur" on public.play_events
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists U&"ma\011Faza: herkes okur" on public.play_items;
create policy U&"ma\011Faza: herkes okur" on public.play_items
  for select to authenticated using (true);
drop policy if exists U&"e\015Fya: kendi e\015Fyalar\0131n\0131 okur" on public.play_owned;
create policy U&"e\015Fya: kendi e\015Fyalar\0131n\0131 okur" on public.play_owned
  for select to authenticated using ((select auth.uid()) = user_id);

-- Kullanicinin puani (kazanilan - harcanan), puan alinan gunler (son 400 gun) ve esyalari.
create or replace function public.play_summary() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'points',
      coalesce((select sum(points) from public.play_events where user_id = auth.uid()), 0)
      - coalesce((select sum(price) from public.play_owned where user_id = auth.uid()), 0),
    'days', coalesce((
      select jsonb_agg(to_char(d, 'YYYY-MM-DD') order by d)
      from (select distinct day as d from public.play_events where user_id = auth.uid() and day > current_date - 400) x
    ), '[]'::jsonb),
    'owned', coalesce((select jsonb_agg(item_id order by created_at) from public.play_owned where user_id = auth.uid()), '[]'::jsonb)
  );
$$;

-- "Bugun sunu yaptim". Gun, telefonun yerel gunudur; sunucunun gununden en fazla bir gun farkli olabilir.
-- Her is gunde bir kez puan verir: rutin/bitki 10, spor 15, gunluk 10. Bir gunde en fazla 20 is puan verir.
-- Gunun ilk isinde seri bonusu: onceki ust uste gun sayisi x 2, en fazla 20.
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
  -- Ayni kullanicinin ayni anda gelen istekleri sirayla islensin.
  perform pg_advisory_xact_lock(hashtext(uid::text));

  p_ref := case when p_kind = 'gorev' then left(coalesce(nullif(p_ref, ''), '?'), 64) else p_kind end;
  pts := case p_kind when 'gorev' then 10 when 'spor' then 15 else 10 end;
  if p_kind = 'gorev' then
    select count(*) into n from public.play_events where user_id = uid and day = p_day and kind = 'gorev';
    if n >= 20 then
      pts := 0;
    end if;
  end if;

  first := not exists (select 1 from public.play_events where user_id = uid and day = p_day);
  insert into public.play_events (user_id, day, kind, ref, points)
    values (uid, p_day, p_kind, p_ref, pts)
    on conflict do nothing;
  get diagnostics inserted = row_count;

  if inserted > 0 and first then
    d := p_day - 1;
    while exists (select 1 from public.play_events where user_id = uid and day = d) loop
      streak := streak + 1;
      d := d - 1;
    end loop;
    if streak > 0 then
      insert into public.play_events (user_id, day, kind, ref, points)
        values (uid, p_day, 'seri', 'seri', least(20, streak * 2))
        on conflict do nothing;
    end if;
  end if;

  return public.play_summary() || jsonb_build_object('awarded', inserted > 0);
end;
$$;

-- Esya satin alma: puan yeterliyse ve esya Premium'a ozelse Premium etkinse.
create or replace function public.play_buy(p_item text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  item public.play_items;
  balance integer;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));
  select * into item from public.play_items where id = p_item;
  if not found then
    raise exception 'unknown item';
  end if;
  if exists (select 1 from public.play_owned where user_id = uid and item_id = p_item) then
    return public.play_summary();
  end if;
  if item.premium and not exists (
    select 1 from public.subscriptions
    where user_id = uid and active and (expires_at is null or expires_at > now())
  ) then
    raise exception 'premium required';
  end if;
  balance := (public.play_summary() ->> 'points')::integer;
  if balance < item.price then
    raise exception 'not enough points';
  end if;
  insert into public.play_owned (user_id, item_id, price) values (uid, item.id, item.price);
  return public.play_summary();
end;
$$;

revoke all on function public.play_summary() from public, anon;
revoke all on function public.play_award(text, text, date) from public, anon;
revoke all on function public.play_buy(text) from public, anon;
grant execute on function public.play_summary() to authenticated;
grant execute on function public.play_award(text, text, date) to authenticated;
grant execute on function public.play_buy(text) to authenticated;


-- =====================================================================
-- 20261021100000_premium.sql
-- =====================================================================
-- Premium ozellikleri: seri dondurma, 1,5 kat puan, aile paylasimi ve fotograf yedegi.
-- Sinirlar uygulamadaki src/domain/premium.ts (LIMITS) ile ayni olmali.
-- Bu dosya ..._puan.sql'den sonra calistirilir (play_* fonksiyonlarini gunceller).

-- Kullanici su an Premium mi? `subscriptions` satirini RevenueCat webhook'u ve subscription-sync yazar.
-- Sadece asagidaki fonksiyonlar icinden cagrilir; baskasinin durumunu sorgulamak icin acik degil.
create or replace function public.is_premium(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = p_user and active and (expires_at is null or expires_at > now())
  );
$$;
revoke all on function public.is_premium(uuid) from public, anon, authenticated;

-- Depolama kurallari icin: giris yapan kullanici kendisi Premium mi?
create or replace function public.i_am_premium() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_premium(auth.uid());
$$;
revoke all on function public.i_am_premium() from public, anon;
grant execute on function public.i_am_premium() to authenticated;

/* ---------- seri dondurma ve 1,5 kat puan ---------- */

-- 'dondur': o gun kacirildi ama seri dondurma hakkiyla korundu (0 puan).
alter table public.play_events drop constraint if exists play_events_kind_check;
alter table public.play_events add constraint play_events_kind_check
  check (kind in ('gorev', 'spor', 'gunluk', 'seri', 'dondur'));

-- Ozet: puan, puan alinan gunler (dondurulanlar haric), dondurulan gunler ve esyalar.
create or replace function public.play_summary() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'points',
      coalesce((select sum(points) from public.play_events where user_id = auth.uid()), 0)
      - coalesce((select sum(price) from public.play_owned where user_id = auth.uid()), 0),
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

-- ..._puan.sql'deki kurallar aynen gecerli; Premium uyede is puani ve seri bonusu 1,5 kat.
-- Dondurulan gunler seriyi bozmaz (seri dongusu o gunu de "bir sey var" sayar).
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
      pts := 0;
    end if;
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
        values (uid, p_day, 'seri', 'seri', round(least(20, streak * 2) * mult))
        on conflict do nothing;
    end if;
  end if;

  return public.play_summary() || jsonb_build_object('awarded', inserted > 0);
end;
$$;

-- Kacirilan bir gunu (son 8 gun) seri dondurma hakkiyla korur. Ayda ucretsiz 1, Premium 3 hak.
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
  -- O gun zaten bir sey yapilmis ya da dondurulmussa hak harcanmaz.
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

/* ---------- aile paylasimi ---------- */

-- Ev sahibi basina bir aile. `home_id`: ev sahibinin telefonunda paylasilan evin kimligi.
create table if not exists public.families (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  owner_name text not null,
  code text not null unique,
  home_id text not null,
  created_at timestamptz not null default now()
);

-- Katilanlar. Bir kullanici ayni anda tek bir aileye uye olabilir.
create table if not exists public.family_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  owner_id uuid not null references public.families (owner_id) on delete cascade,
  name text not null,
  joined_at timestamptz not null default now()
);

-- Paylasilan ev: sadece ev kismi (odalar, rutinler, gardirop, stok, bitkiler). Puan ve gunluk girmez.
create table if not exists public.shared_homes (
  owner_id uuid primary key references public.families (owner_id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- Tablolara dogrudan erisim yok; sadece asagidaki fonksiyonlar okur ve yazar.
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.shared_homes enable row level security;

-- Cagiranin ailesi (ev sahibi ya da uye). Yoksa null.
create or replace function public.family_of(p_user uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select owner_id from public.families where owner_id = p_user),
    (select owner_id from public.family_members where user_id = p_user)
  );
$$;
revoke all on function public.family_of(uuid) from public, anon, authenticated;

create or replace function public.family_info() returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when f.owner_id is null then null else jsonb_build_object(
    'role', case when f.owner_id = auth.uid() then 'owner' else 'member' end,
    'ownerId', f.owner_id,
    'ownerName', f.owner_name,
    'code', case when f.owner_id = auth.uid() then f.code end,
    'homeId', f.home_id,
    'active', public.is_premium(f.owner_id),
    'members', jsonb_build_array(jsonb_build_object('id', f.owner_id, 'name', f.owner_name, 'owner', true)) || coalesce((
      select jsonb_agg(jsonb_build_object('id', m.user_id, 'name', m.name, 'owner', false) order by m.joined_at)
      from public.family_members m where m.owner_id = f.owner_id
    ), '[]'::jsonb)
  ) end
  from (select public.family_of(auth.uid()) as id) x
  left join public.families f on f.owner_id = x.id;
$$;

-- Ev sahibi (Premium) acik evini paylasir ve bir davet kodu alir. Zaten paylasiyorsa paylasilan evi degistirir.
create or replace function public.family_create(p_home_id text, p_name text, p_state jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  k text;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  if not public.is_premium(uid) then
    raise exception 'premium required';
  end if;
  if exists (select 1 from public.family_members where user_id = uid) then
    delete from public.family_members where user_id = uid;
  end if;
  -- Karismasin diye 0/O, 1/I yok.
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

-- Koda katil. Ev sahibinin Premium'u surmeli; ailede en fazla 6 kisi (ev sahibi dahil).
create or replace function public.family_join(p_code text, p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  fam public.families;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  select * into fam from public.families where code = upper(trim(p_code));
  if not found then
    raise exception 'bad code';
  end if;
  if fam.owner_id = uid then
    raise exception 'own family';
  end if;
  if not public.is_premium(fam.owner_id) then
    raise exception 'owner not premium';
  end if;
  perform pg_advisory_xact_lock(hashtext(fam.owner_id::text));
  if (select count(*) from public.family_members where owner_id = fam.owner_id and user_id <> uid) >= 5 then
    raise exception 'family full';
  end if;
  -- Kendi ailesi varsa (ev sahibiyse) once o kapanir.
  delete from public.families where owner_id = uid;
  insert into public.family_members (user_id, owner_id, name)
    values (uid, fam.owner_id, left(coalesce(nullif(trim(p_name), ''), U&'Aile \00FCyesi'), 30))
    on conflict (user_id) do update set owner_id = excluded.owner_id, name = excluded.name, joined_at = now();
  return public.family_info();
end;
$$;

-- Ev sahibi cagirirsa paylasim kapanir (herkesin kopyasi telefonunda kalir); uye cagirirsa aileden cikar.
create or replace function public.family_leave() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.families where owner_id = auth.uid();
  delete from public.family_members where user_id = auth.uid();
end;
$$;

create or replace function public.family_kick(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.family_members where owner_id = auth.uid() and user_id = p_user;
end;
$$;

-- Paylasilan evi oku. Ev sahibinin Premium'u bittiyse paylasim durur.
create or replace function public.family_load() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  fid uuid := public.family_of(auth.uid());
  h public.shared_homes;
begin
  if fid is null or not public.is_premium(fid) then
    return null;
  end if;
  select * into h from public.shared_homes where owner_id = fid;
  if not found then
    return null;
  end if;
  return jsonb_build_object('state', h.state, 'updatedAt', h.updated_at);
end;
$$;

-- Paylasilan evi yaz. `p_base`: telefonun bildigi son surum; arada baskasi yazdiysa yazmaz,
-- guncel evi doner (telefon birlestirip tekrar gonderir).
create or replace function public.family_save(p_state jsonb, p_base timestamptz) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  fid uuid := public.family_of(uid);
  h public.shared_homes;
begin
  if fid is null then
    raise exception 'no family';
  end if;
  if not public.is_premium(fid) then
    raise exception 'owner not premium';
  end if;
  if octet_length(p_state::text) > 500000 then
    raise exception 'too large';
  end if;
  perform pg_advisory_xact_lock(hashtext(fid::text));
  select * into h from public.shared_homes where owner_id = fid;
  if found and p_base is not null and h.updated_at > p_base then
    return jsonb_build_object('conflict', true, 'state', h.state, 'updatedAt', h.updated_at);
  end if;
  insert into public.shared_homes (owner_id, state, updated_by) values (fid, p_state, uid)
    on conflict (owner_id) do update set state = excluded.state, updated_at = now(), updated_by = uid
    returning * into h;
  return jsonb_build_object('conflict', false, 'updatedAt', h.updated_at);
end;
$$;

revoke all on function public.family_info() from public, anon;
revoke all on function public.family_create(text, text, jsonb) from public, anon;
revoke all on function public.family_join(text, text) from public, anon;
revoke all on function public.family_leave() from public, anon;
revoke all on function public.family_kick(uuid) from public, anon;
revoke all on function public.family_load() from public, anon;
revoke all on function public.family_save(jsonb, timestamptz) from public, anon;
grant execute on function public.family_info() to authenticated;
grant execute on function public.family_create(text, text, jsonb) to authenticated;
grant execute on function public.family_join(text, text) to authenticated;
grant execute on function public.family_leave() to authenticated;
grant execute on function public.family_kick(uuid) to authenticated;
grant execute on function public.family_load() to authenticated;
grant execute on function public.family_save(jsonb, timestamptz) to authenticated;

/* ---------- fotograf yedegi (Premium) ---------- */

-- Ozel kova: herkes sadece kendi klasorunu (`<kullanici id>/...`) gorur. Yazmak Premium.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('yedek', 'yedek', false, 3145728, array['image/jpeg'])
  on conflict (id) do nothing;

drop policy if exists U&"yedek: kendi foto\011Fraflar\0131n\0131 g\00F6r\00FCr" on storage.objects;
create policy U&"yedek: kendi foto\011Fraflar\0131n\0131 g\00F6r\00FCr" on storage.objects
  for select to authenticated
  using (bucket_id = 'yedek' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists U&"yedek: Premium kendi klas\00F6r\00FCne y\00FCkler" on storage.objects;
create policy U&"yedek: Premium kendi klas\00F6r\00FCne y\00FCkler" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'yedek' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.i_am_premium()));
drop policy if exists U&"yedek: Premium kendi foto\011Fraf\0131n\0131 g\00FCnceller" on storage.objects;
create policy U&"yedek: Premium kendi foto\011Fraf\0131n\0131 g\00FCnceller" on storage.objects
  for update to authenticated
  using (bucket_id = 'yedek' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'yedek' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.i_am_premium()));
drop policy if exists U&"yedek: kendi foto\011Fraf\0131n\0131 siler" on storage.objects;
create policy U&"yedek: kendi foto\011Fraf\0131n\0131 siler" on storage.objects
  for delete to authenticated
  using (bucket_id = 'yedek' and (storage.foldername(name))[1] = (select auth.uid())::text);


-- =====================================================================
-- 20261023000000_scan.sql
-- =====================================================================
-- Yapay zeka ile fotograf taramasi (buzdolabi ve kiyafet) icin hak sayaci. Ayrintilar: docs/premium.md.
-- Ucretsiz: haftada 2 (pazartesi yenilenir). Premium: gunde 2 (Turkiye saatiyle gece yarisi yenilenir).
-- Iki tur ayni hakki paylasir. Sinirlar uygulamadaki src/domain/premium.ts (LIMITS.*.scans) ile ayni olmali.
-- Sadece `scan` fonksiyonu (service_role) yazar; fotograf saklanmaz, sadece sayac tutulur.

create table if not exists public.scan_usage (
  user_id uuid not null references auth.users on delete cascade,
  -- Premium icin o gunun tarihi, ucretsiz icin o haftanin pazartesisi.
  period date not null,
  n int not null default 0,
  -- Sadece istatistik; sinira etki etmez.
  fridge int not null default 0,
  look int not null default 0,
  primary key (user_id, period)
);
alter table public.scan_usage enable row level security;
drop policy if exists U&"tarama: kendi sayac\0131n\0131 okur" on public.scan_usage;
create policy U&"tarama: kendi sayac\0131n\0131 okur" on public.scan_usage
  for select to authenticated using (user_id = auth.uid());

-- Tek islemde hak ayirir: satir yoksa n = 1, varsa ve n < sinir ise n + 1. Iki hizli dokunus iki hak
-- kullandiramaz, sinir da asilamaz. Donen `ok` false ise hak kalmamistir.
create or replace function public.scan_reserve(p_user uuid, p_kind text) returns jsonb
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

-- Tarama basarisiz olursa (hata, bos sonuc) ayrilan hakki geri verir.
create or replace function public.scan_release(p_user uuid, p_period date, p_kind text) returns void
language sql security definer set search_path = '' as $$
  update public.scan_usage
  set n = greatest(n - 1, 0),
      fridge = greatest(fridge - (p_kind = 'fridge')::int, 0),
      look = greatest(look - (p_kind = 'look')::int, 0)
  where user_id = p_user and period = p_period;
$$;
revoke all on function public.scan_release(uuid, date, text) from public, anon, authenticated;


-- =====================================================================
-- 20261025120000_scan_premium_50.sql
-- =====================================================================
-- Premium tarama siniri gunde 2'den gunde 50'ye cikti (Melih, 2026-10-25). Ucretsiz hala haftada 2.
-- Sinirlar uygulamadaki src/domain/premium.ts (LIMITS.*.scans) ile ayni olmali. Ayrintilar: docs/premium.md.

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


-- =====================================================================
-- 20261101000000_ai_suistimal.sql
-- =====================================================================
-- 20261101000000_persona.sql
-- =====================================================================
-- "Seni taniyalim" cevaplari: kullanici hesabina bagli, kendi satirini okur/gunceller (mevcut profil politikalari yeter).
alter table public.profiles add column if not exists persona jsonb;

-- =====================================================================
-- Yapay zeka suistimalini engeller. Supabase SQL Editor'de bir kere calistir (tekrar calistirmak zararsiz).
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

-- 2026-11-01: "Seni taniyalim" cevaplari (kisilik tipi uygulamada hesaplanir, sunucuda tutulmaz).
alter table public.profiles add column if not exists persona jsonb;

-- =====================================================================
-- 20261101120000_guvenlik.sql
-- =====================================================================
-- Guvenlik sertlestirme (docs/guvenlik-raporu.md). Supabase SQL Editor'de bir kere calistir (tekrar calistirmak zararsiz).
-- Once 20261031000000_aile_evi.sql ve 20261101000000_ai_suistimal.sql calismis olmali.

/* ---------- 1) Tablo yetkileri: RLS'e ek ikinci kilit ---------- */
-- Supabase yeni tablolara anon/authenticated icin tum yetkileri verir; sadece RLS koruyor. Gereksiz yetkileri kaldir:
-- RLS politikasi yanlislikla eksik kalsa bile istemci yazamaz. SECURITY DEFINER fonksiyonlar etkilenmez.
do $$
declare t text;
begin
  foreach t in array array[
    'subscriptions', 'play_events', 'play_owned', 'play_spend', 'scan_usage', 'chat_usage',
    'families', 'family_members', 'shared_homes', 'family_goals', 'family_goal_logs', 'family_join_attempts'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('revoke all on table public.%I from anon, authenticated', t);
    end if;
  end loop;
end $$;

-- Okuma gereken tablolar: sadece select (RLS satiri yine kisitlar).
grant select on public.subscriptions, public.play_events, public.play_owned, public.play_spend, public.scan_usage to authenticated;

-- Magaza ve bahce katalogu herkese acik okunur, yazilamaz.
revoke all on table public.play_items, public.play_garden_items from anon, authenticated;
grant select on public.play_items, public.play_garden_items to anon, authenticated;

-- Profil: sadece ad ve persona guncellenebilir (id, created_at degismez). Ekleme ve silme tetikleyici / delete_me ile.
revoke all on table public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name, persona) on public.profiles to authenticated;

-- Ev yedegi: anon hic erisemez; kullanici sadece kendi satirini okur / yazar.
revoke all on table public.homes from anon, authenticated;
grant select, insert, update on public.homes to authenticated;

/* ---------- 2) Boyut sinirlari (depolama sisirme) ---------- */
alter table public.homes drop constraint if exists homes_state_boyut;
alter table public.homes add constraint homes_state_boyut
  check (jsonb_typeof(state) = 'object' and octet_length(state::text) <= 2000000) not valid;
alter table public.shared_homes drop constraint if exists shared_homes_state_boyut;
alter table public.shared_homes add constraint shared_homes_state_boyut
  check (jsonb_typeof(state) = 'object' and octet_length(state::text) <= 500000) not valid;
alter table public.profiles drop constraint if exists profiles_ad_boyut;
alter table public.profiles add constraint profiles_ad_boyut check (name is null or char_length(name) <= 60) not valid;
alter table public.profiles drop constraint if exists profiles_persona_boyut;
alter table public.profiles add constraint profiles_persona_boyut check (persona is null or octet_length(persona::text) <= 4000) not valid;

/* ---------- 3) Aile kodu kaba kuvvet korumasi ---------- */
-- Basarisiz denemeler kaydedilir (hata firlatmak islemi geri alirdi, bu yuzden hata jsonb olarak doner).
-- Kisi basina 15 dakikada 5, tum sistemde 10 dakikada 60 basarisiz deneme; sonrasinda kod dogru olsa bile reddedilir.
-- Hesapsiz (anonim) misafir katilamaz: sinirsiz anonim hesapla kisi basi siniri asmak engellenir.
create table if not exists public.family_join_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now()
);
create index if not exists family_join_attempts_at on public.family_join_attempts (at);
create index if not exists family_join_attempts_user on public.family_join_attempts (user_id, at);
alter table public.family_join_attempts enable row level security;
revoke all on table public.family_join_attempts from anon, authenticated;

create or replace function public.family_join(p_code text, p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  fam public.families;
  code text := upper(left(trim(coalesce(p_code, '')), 12));
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'account required';
  end if;
  if (select count(*) from public.family_join_attempts where user_id = uid and at > now() - interval '15 minutes') >= 5
     or (select count(*) from public.family_join_attempts where at > now() - interval '10 minutes') >= 60 then
    return jsonb_build_object('error', 'too many attempts');
  end if;
  select * into fam from public.families where families.code = family_join.code;
  if not found then
    insert into public.family_join_attempts (user_id) values (uid);
    -- Eski kayitlari temizle.
    delete from public.family_join_attempts where at < now() - interval '1 day';
    return jsonb_build_object('error', 'bad code');
  end if;
  if fam.owner_id = uid then
    raise exception 'own family';
  end if;
  if not public.is_premium_own(fam.owner_id) then
    raise exception 'owner not premium';
  end if;
  perform pg_advisory_xact_lock(hashtext(fam.owner_id::text));
  if (select count(*) from public.family_members where owner_id = fam.owner_id and user_id <> uid) >= 5 then
    raise exception 'family full';
  end if;
  delete from public.families where owner_id = uid;
  insert into public.family_members (user_id, owner_id, name)
    values (uid, fam.owner_id, left(coalesce(nullif(trim(p_name), ''), U&'Aile \00FCyesi'), 30))
    on conflict (user_id) do update set owner_id = excluded.owner_id, name = excluded.name, joined_at = now();
  return public.family_info();
end;
$$;
revoke all on function public.family_join(text, text) from public, anon;
grant execute on function public.family_join(text, text) to authenticated;

-- Ev sahibi paylasimi: boyut ve tur kontrolu (family_save ile ayni sinir).
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
  if p_state is null or jsonb_typeof(p_state) <> 'object' or octet_length(p_state::text) > 500000 then
    raise exception 'too large';
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
revoke all on function public.family_create(text, text, jsonb) from public, anon;
grant execute on function public.family_create(text, text, jsonb) to authenticated;

/* ---------- 4) Puan: satir sisirme ve ortak hedef spam'i ---------- */
-- Gunde 20 isten sonra puansiz satir da yazilmasin (eskiden ayri p_ref ile sinirsiz satir eklenebiliyordu).
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
        values (uid, p_day, 'seri', 'seri', round(least(20, streak * 2) * mult))
        on conflict do nothing;
    end if;
  end if;

  return public.play_summary() || jsonb_build_object('awarded', inserted > 0);
end;
$$;
revoke all on function public.play_award(text, text, date) from public, anon;
grant execute on function public.play_award(text, text, date) to authenticated;

-- Ortak hedefe ilerleme: kisi basi gunde en fazla 50 kayit.
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

/* ---------- 5) Foto yedegi: kullanici basi dosya siniri ---------- */
-- Kova zaten 3 MB / sadece JPEG ile sinirli; bir de kisi basi en fazla 500 dosya.
drop policy if exists U&"yedek: Premium kendi klas\00F6r\00FCne y\00FCkler" on storage.objects;
create policy U&"yedek: Premium kendi klas\00F6r\00FCne y\00FCkler" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'yedek'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.i_am_premium())
    and (select count(*) from storage.objects o
         where o.bucket_id = 'yedek' and (storage.foldername(o.name))[1] = (select auth.uid())::text) < 500
  );

/* ---------- 6) Eski anonim hesaplari temizle ---------- */
-- Anonim giris spam'i auth.users'i sisirir. 60 gundur giris yapmayan, aboneligi / ev yedegi / ailesi olmayan
-- anonim hesaplar silinir. Elle ya da pg_cron ile calistirilir (adimlar docs/guvenlik-raporu.md).
create or replace function public.cleanup_anonymous() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  with gone as (
    delete from auth.users u
    where u.is_anonymous
      and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '60 days'
      and not exists (select 1 from public.subscriptions s where s.user_id = u.id)
      and not exists (select 1 from public.homes h where h.user_id = u.id)
      and not exists (select 1 from public.families f where f.owner_id = u.id)
      and not exists (select 1 from public.family_members m where m.user_id = u.id)
    returning 1
  )
  select count(*) into n from gone;
  return n;
end;
$$;
revoke all on function public.cleanup_anonymous() from public, anon, authenticated;
-- Zamanlamak icin (Database > Extensions > pg_cron acik olmali), istege bagli:
-- select cron.schedule('anonim-temizlik', '30 3 * * *', $$select public.cleanup_anonymous()$$);

-- 20261103000000_moka_aylik_limit.sql
-- Moka sohbet: aylik ust sinir (sabahtan aksama surekli konusulmasin) + gunluk 40.
-- Premium: gunde 40, ayda 600 mesaj, dakikada 6. Ay = Europe/Istanbul takvim ayi.
-- src/domain/premium.ts LIMITS.premium.chats / chatsMonth ile ayni tutulmali.
create or replace function public.chat_reserve(p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  prem boolean := public.is_premium(p_user);
  today date := (now() at time zone 'Europe/Istanbul')::date;
  lim int := 40;
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


-- =====================================================================
-- 20261104000000_ai_limits.sql
-- =====================================================================
-- Premium yapay zeka sinirlari (Melih, 2026-11-04): foto taramasi gunde 5, Moka sohbeti gunde 10 mesaj (ayda 300, dakikada 6).
-- Ucretsiz hala haftada 2 tarama. Sinirlar uygulamadaki src/domain/premium.ts (LIMITS) ile ayni olmali.

create or replace function public.scan_reserve(p_user uuid, p_kind text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  prem boolean := public.is_premium(p_user);
  today date := (now() at time zone 'Europe/Istanbul')::date;
  per date := case when prem then today else date_trunc('week', today)::date end;
  lim int := case when prem then 5 else 2 end;
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
  lim int := 10;
  mlim int := 300;
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


-- =====================================================================
-- 20261107000000_dondurma_2.sql
-- =====================================================================
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


-- =====================================================================
-- 20261107120000_ai_limits_25_10.sql
-- =====================================================================
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


-- =====================================================================
-- 20261108000000_siralama.sql
-- =====================================================================
-- Global ev sıralaması (isteğe bağlı), tek "ev puanı"na göre.
-- Gizlilik: yalnız hesaplı kullanıcı, kendi isteğiyle katılır. Takma ad dışında kimlik, konum ya da ev planı yok.
-- Güven: seviye ve seri, sunucudaki puan kayıtlarından (play_events) hesaplanır; uygulamadan sadece
-- temizlik yüzdesi gelir ve 0-100'e kırpılır. Tablolara uygulama doğrudan yazamaz/okuyamaz; sadece fonksiyonlar.
-- Hızlı tamamla uyarısında geri alınan işler play_events'ten de silindiği için sıralamaya yansımaz.

create table public.lb_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nick text not null check (char_length(nick) between 2 and 16),
  clean integer not null default 0 check (clean between 0 and 100),
  level integer not null default 0,
  streak integer not null default 0,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Günlük temizlik görüntüsü (haftalık "en temiz" için). Kullanıcı başına günde bir satır.
create table public.lb_daily (
  user_id uuid not null references public.lb_profiles (user_id) on delete cascade,
  day date not null,
  clean integer not null check (clean between 0 and 100),
  primary key (user_id, day)
);

alter table public.lb_profiles enable row level security;
alter table public.lb_daily enable row level security;
-- Politika yok: doğrudan okuma/yazma kapalı. Erişim yalnız security definer fonksiyonlarla.

-- Katıl / takma adı değiştir.
create function public.lb_join(p_nick text) returns void
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
create function public.lb_leave() returns void
language sql security definer set search_path = '' as $$
  delete from public.lb_profiles where user_id = auth.uid();
$$;

-- Puan gönder. Seviye = puan alınan gün sayısı (en çok 100), seri = üst üste gün; ikisi de sunucuda hesaplanır.
-- En az 10 dakikada bir işlenir. Katılmamışsa hiçbir şey yapmaz.
create function public.lb_publish(p_clean integer) returns void
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
create function public.lb_top(p_period text) returns jsonb
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


-- =====================================================================
-- 20261108120000_siralama_moka.sql
-- =====================================================================
-- Sıralama 2: "Moka Şampiyonları" (Moka seviyesine göre). 20261108000000_siralama.sql'den SONRA çalıştır.
-- Moka exp'i telefonda tutulur; sunucu gelen toplamı "günde en çok 28 exp" sınırıyla kırpar
-- (src/domain/mokaLevel.ts DAILY_XP_CAP toplamı: 12 + 10 + 6) ve puan alınan gün sayısıyla çarpar.

alter table public.lb_profiles add column moka_xp integer not null default 0 check (moka_xp >= 0);

drop function public.lb_publish(integer);

create function public.lb_publish(p_clean integer, p_xp integer default 0) returns void
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
create function public.lb_moka_level(p_xp integer) returns integer
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
create function public.lb_moka_top() returns jsonb
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


-- =====================================================================
-- 20261108130000_magaza_cesit.sql
-- =====================================================================
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


-- =====================================================================
-- 20261108140000_puan_dengesi.sql
-- =====================================================================
-- Puan dengesi (2026-11-08): azalan getiri + biraz daha cömert seri bonusu.
-- Günün ilk 5 işi 10, sonraki 5 iş 5, kalan 10 iş 2 puan; günlük görev tavanı 200 yerine 95.
-- Seri bonusu üst sınırı 20 yerine 30 (15. günde dolar). Premium çarpanı (1,5x) aynen sürer.
-- Telefondaki hesap src/domain/play.ts içinde (`taskPoints`, `streakBonus`) birebir aynıdır.
-- Supabase SQL Editor'de bir kez çalıştırılır.

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
        values (uid, p_day, 'seri', 'seri', round(least(30, streak * 2) * mult))
        on conflict do nothing;
    end if;
  end if;

  return public.play_summary() || jsonb_build_object('awarded', inserted > 0);
end;
$$;
revoke all on function public.play_award(text, text, date) from public, anon;
grant execute on function public.play_award(text, text, date) to authenticated;


-- =====================================================================
-- 20261109000000_aile_haftasi.sql
-- =====================================================================
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


-- =====================================================================
-- 20261109000000_formuller.sql
-- =====================================================================
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


-- =====================================================================
-- 20261109120000_siralama_adil.sql
-- =====================================================================
-- Adil sıralama (2026-11-09): ev büyüklüğüne göre normalize + hesap yaşına göre tavan. Telefondaki `fairScore` (src/domain/formulas.ts) ile aynı.
-- 20261108000000_siralama.sql ve 20261108120000_siralama_moka.sql'den SONRA, Supabase SQL Editor'de bir kez çalıştır.
-- Puan = round(min(eşya+bahçe, yaş_gün*12+30) / clamp(sqrt(blok/24), 0.6, 1.6)) + temizlik. Haftalıkta yaş en çok 7 gün sayılır.

alter table public.lb_profiles add column cells integer not null default 24 check (cells between 1 and 400);

drop function public.lb_publish(integer, integer);

create function public.lb_publish(p_clean integer, p_xp integer default 0, p_cells integer default 24) returns void
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



-- =====================================================================
-- 20261110000000_ai_koruma.sql
-- =====================================================================
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


-- =====================================================================
-- 20261110100000_guvenlik_2.sql
-- =====================================================================
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
