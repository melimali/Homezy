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

