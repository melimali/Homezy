-- Guvenlik sertlestirme (docs/guvenlik-raporu.md). Supabase SQL Editor'de bir kere calistir (tekrar calistirmak zararsiz).
-- Once 20261031000000_aile_evi.sql, 20261101000000_ai_suistimal.sql ve 20261101000000_persona.sql calismis olmali.

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
