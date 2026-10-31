-- Moka'nın bahçesi ve ev kişiliği.
-- Tohum ve gübre tekrar alınır: `play_owned` (kullanıcı + eşya başına bir satır) bunu tutamaz, bu yüzden
-- ayrı bir harcama tablosu var. Bahçe süsleri ve kişilikler bir kere alınır, mevcut `play_items` / `play_buy`
-- ile çalışır. Puan = kazanılan - eşyalar - bahçe harcamaları. Uygulamadaki src/domain/garden.ts ve
-- src/domain/items.ts ile aynı olmalı. Bu dosya bir kere çalıştırılır.

/* ---------- tek seferlik: süsler ve kişilikler ---------- */

insert into public.play_items (id, price, premium) values
  ('sulama', 60, false), ('ugurbocegi', 90, false), ('hamak', 120, false), ('sera', 180, true),
  ('kisilik_sakin', 150, false), ('kisilik_neseli', 150, false)
on conflict (id) do update set price = excluded.price, premium = excluded.premium;

/* ---------- tekrar alınanlar: tohumlar ve gübre ---------- */

-- `daily_max`: bir günde en fazla kaç kez alınır (null: sınırsız).
create table public.play_garden_items (
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
  ('gubre_avuc', 15, false, 2), ('gubre_torba', 40, false, 1);

-- Her harcama bir satır. Gün, telefonun yerel günü (günlük sınır için).
create table public.play_spend (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null references public.play_garden_items (id),
  price integer not null,
  day date not null,
  created_at timestamptz not null default now()
);
create index play_spend_user_day on public.play_spend (user_id, day);

alter table public.play_garden_items enable row level security;
alter table public.play_spend enable row level security;
create policy "bahçe: herkes okur" on public.play_garden_items
  for select to authenticated using (true);
create policy "bahçe: kendi harcamalarını okur" on public.play_spend
  for select to authenticated using ((select auth.uid()) = user_id);

-- Özet (…_premium.sql'deki ile aynı), puandan bahçe harcamaları da düşülür.
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

-- Tohum ya da gübre alma: puan yeterliyse, Premium'a özelse Premium etkinse, günlük sınır dolmadıysa.
create function public.play_spend(p_item text, p_day date) returns jsonb
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
