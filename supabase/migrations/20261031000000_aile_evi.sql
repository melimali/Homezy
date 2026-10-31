-- Aile evi, ikinci adım (docs/aile-evi.md). Supabase SQL Editor'de bir kere çalıştır.
-- Önce 20261021100000_premium.sql çalışmış olmalı.

/* ---------- Premium ev halkasına yayılır ---------- */

-- Kendi aboneliği (eski is_premium).
create function public.is_premium_own(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = p_user and active and (expires_at is null or expires_at > now())
  );
$$;
revoke all on function public.is_premium_own(uuid) from public, anon, authenticated;

-- Premium: kendi aboneliği ya da ev sahibinin aboneliği (aile üyesiyse). Tarama hakkı, 1,5 kat puan
-- ve depolama kuralları bunu kullanır, yani katılan kişi de Premium avantajını alır.
create or replace function public.is_premium(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_premium_own(p_user) or exists (
    select 1 from public.family_members m
    where m.user_id = p_user and public.is_premium_own(m.owner_id)
  );
$$;

-- Ev kurmak için kişinin kendi aboneliği gerekir (üyelikten gelen Premium yetmez).
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

create table public.family_goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.families (owner_id) on delete cascade,
  title text not null,
  emoji text not null default '🎯',
  target int not null check (target between 1 and 10000),
  unit text not null default 'kez',
  due date,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index family_goals_owner on public.family_goals (owner_id);

create table public.family_goal_logs (
  id bigint generated always as identity primary key,
  goal_id uuid not null references public.family_goals (id) on delete cascade,
  user_id uuid not null,
  n int not null check (n between 1 and 100),
  created_at timestamptz not null default now()
);
create index family_goal_logs_goal on public.family_goal_logs (goal_id);

-- Tablolara doğrudan erişim yok; sadece fonksiyonlar.
alter table public.family_goals enable row level security;
alter table public.family_goal_logs enable row level security;

-- Çağıranın ailesinin hedefleri, toplam ve kişi başı ilerlemeyle.
create function public.goals_list() returns jsonb
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

create function public.goal_add(p_title text, p_emoji text, p_target int, p_unit text, p_due date) returns jsonb
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
    values (fid, left(trim(p_title), 60), left(coalesce(nullif(trim(p_emoji), ''), '🎯'), 8),
            greatest(1, least(p_target, 10000)), left(coalesce(nullif(trim(p_unit), ''), 'kez'), 16), p_due, uid);
  return public.goals_list();
end;
$$;

-- Hedefe ilerleme yaz (ör. "3 kitap okudum"). Hedef dolunca tamamlandı olur.
create function public.goal_log(p_goal uuid, p_n int) returns jsonb
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
create function public.goal_delete(p_goal uuid) returns jsonb
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
