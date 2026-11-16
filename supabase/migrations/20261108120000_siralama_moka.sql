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
