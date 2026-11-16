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
