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
