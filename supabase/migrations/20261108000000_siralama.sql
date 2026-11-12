-- Global ev sıralaması (isteğe bağlı), tek "ev puanı"na göre.
-- Gizlilik: yalnız hesaplı kullanıcı, kendi isteğiyle katılır. Takma ad dışında kimlik, konum ya da ev planı yok.
-- Güven: seviye ve seri, sunucudaki puan kayıtlarından (play_events) hesaplanır; uygulamadan sadece
-- temizlik yüzdesi gelir ve 0-100'e kırpılır. Tablolara uygulama doğrudan yazamaz/okuyamaz; sadece fonksiyonlar.
-- Hızlı tamamla uyarısında geri alınan işler play_events'ten de silindiği için sıralamaya yansımaz.

create table if not exists public.lb_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nick text not null check (char_length(nick) between 2 and 16),
  clean integer not null default 0 check (clean between 0 and 100),
  level integer not null default 0,
  streak integer not null default 0,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Günlük temizlik görüntüsü (haftalık "en temiz" için). Kullanıcı başına günde bir satır.
create table if not exists public.lb_daily (
  user_id uuid not null references public.lb_profiles (user_id) on delete cascade,
  day date not null,
  clean integer not null check (clean between 0 and 100),
  primary key (user_id, day)
);

alter table public.lb_profiles enable row level security;
alter table public.lb_daily enable row level security;
-- Politika yok: doğrudan okuma/yazma kapalı. Erişim yalnız security definer fonksiyonlarla.

-- Katıl / takma adı değiştir.
create or replace function public.lb_join(p_nick text) returns void
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
create or replace function public.lb_leave() returns void
language sql security definer set search_path = '' as $$
  delete from public.lb_profiles where user_id = auth.uid();
$$;

-- Puan gönder. Seviye = puan alınan gün sayısı (en çok 100), seri = üst üste gün; ikisi de sunucuda hesaplanır.
-- En az 10 dakikada bir işlenir. Katılmamışsa hiçbir şey yapmaz.
create or replace function public.lb_publish(p_clean integer) returns void
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
