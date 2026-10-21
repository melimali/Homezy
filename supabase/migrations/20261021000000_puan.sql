-- Puan, seri ve eşya mağazası.
-- Puanı sunucu sayar: uygulama sadece "şu işi bugün yaptım" der, kaç puan verileceğine ve
-- aynı işin o gün daha önce puan alıp almadığına sunucu karar verir. Telefonun saatini
-- değiştirmek en fazla bir günlük oynama payı bırakır (saat dilimleri için gerekli).
-- Tablolara uygulama doğrudan yazamaz; sadece aşağıdaki fonksiyonlar yazar.

-- Puan getiren her iş: (kullanıcı, gün, tür, iş) başına bir satır. Günde bir kuralı birincil anahtarla sağlanır.
create table public.play_events (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('gorev', 'spor', 'gunluk', 'seri')),
  ref text not null,
  points integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, day, kind, ref)
);

-- Mağazadaki eşyalar. Uygulamadaki src/domain/items.ts ile aynı olmalı.
create table public.play_items (
  id text primary key,
  price integer not null check (price > 0),
  premium boolean not null default false
);

insert into public.play_items (id, price, premium) values
  ('saksi', 30, false), ('puf', 40, false), ('hali', 50, false), ('abajur', 60, false),
  ('kitaplik', 80, false), ('gitar', 90, false), ('kedi', 120, false), ('kopek', 120, false),
  ('akvaryum', 150, true), ('somine', 200, true), ('piyano', 250, true);

-- Alınan eşyalar. Fiyat alındığı andaki hâliyle saklanır.
create table public.play_owned (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null references public.play_items (id),
  price integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.play_events enable row level security;
alter table public.play_items enable row level security;
alter table public.play_owned enable row level security;

create policy "puan: kendi kayıtlarını okur" on public.play_events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "mağaza: herkes okur" on public.play_items
  for select to authenticated using (true);
create policy "eşya: kendi eşyalarını okur" on public.play_owned
  for select to authenticated using ((select auth.uid()) = user_id);

-- Kullanıcının puanı (kazanılan - harcanan), puan alınan günler (son 400 gün) ve eşyaları.
create function public.play_summary() returns jsonb
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

-- "Bugün şunu yaptım". Gün, telefonun yerel günüdür; sunucunun gününden en fazla bir gün farklı olabilir.
-- Her iş günde bir kez puan verir: rutin/bitki 10, spor 15, günlük 10. Bir günde en fazla 20 iş puan verir.
-- Günün ilk işinde seri bonusu: önceki üst üste gün sayısı × 2, en fazla 20.
create function public.play_award(p_kind text, p_ref text, p_day date) returns jsonb
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
  -- Aynı kullanıcının aynı anda gelen istekleri sırayla işlensin.
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

-- Eşya satın alma: puan yeterliyse ve eşya Premium'a özelse Premium etkinse.
create function public.play_buy(p_item text) returns jsonb
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
