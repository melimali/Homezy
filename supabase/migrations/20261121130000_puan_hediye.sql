-- Yönetici puan hediyesi: Melih SQL editöründen istediği kullanıcıya puan gönderir.
-- İstemci tabloya yazamaz (RLS açık, yazma politikası yok); sadece kendi hediyelerini okur ve "gördüm" der.
create table public.play_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  points integer not null check (points <> 0),
  note text,
  seen boolean not null default false,
  created_at timestamptz not null default now()
);
create index play_grants_user_idx on public.play_grants (user_id, seen);
alter table public.play_grants enable row level security;
create policy "hediye: kendi kayıtlarını okur" on public.play_grants
  for select to authenticated using ((select auth.uid()) = user_id);

-- Bakiye = kazanılan + hediye - harcanan. Diğer alanlar aynı.
create or replace function public.play_summary() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'points',
      coalesce((select sum(points) from public.play_events where user_id = auth.uid()), 0)
      + coalesce((select sum(points) from public.play_grants where user_id = auth.uid()), 0)
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

-- Görülmemiş hediyeleri tek seferde "görüldü" yapar ve döner (çift sayım olmaz; puan zaten bakiyede).
create function public.play_claim_grants() returns jsonb
language sql security definer set search_path = '' as $$
  with c as (
    update public.play_grants set seen = true
    where user_id = auth.uid() and not seen
    returning points, note
  )
  select jsonb_build_object(
    'points', coalesce(sum(points), 0),
    'notes', coalesce(jsonb_agg(note) filter (where note is not null and note <> ''), '[]'::jsonb)
  ) from c;
$$;
revoke all on function public.play_claim_grants() from public, anon;
grant execute on function public.play_claim_grants() to authenticated;

-- Yönetici fonksiyonu: sadece SQL editörü / service_role. Kullanıcıyı e-posta ya da UID ile bulur.
create function public.admin_grant_points(p_who text, p_points integer, p_note text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid;
begin
  select id into uid from auth.users
  where id::text = p_who or lower(email) = lower(p_who) limit 1;
  if uid is null then raise exception 'kullanıcı bulunamadı: %', p_who; end if;
  insert into public.play_grants (user_id, points, note) values (uid, p_points, p_note);
  return uid::text || ' +' || p_points;
end;
$$;
revoke all on function public.admin_grant_points(text, integer, text) from public, anon, authenticated;
grant execute on function public.admin_grant_points(text, integer, text) to service_role;

-- Kullanım (SQL editörü):
--   select public.admin_grant_points('kisi@mail.com', 500, 'Melih''den hediye');
--   select public.admin_grant_points('2e0adf84-6d7e-44bd-9b7e-67d243849efb', 500, null);
