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
  lim := case when public.is_premium(uid) then 3 else 1 end;
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
