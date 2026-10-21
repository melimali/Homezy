-- Premium özellikleri: seri dondurma, 1,5 kat puan, aile paylaşımı ve fotoğraf yedeği.
-- Sınırlar uygulamadaki src/domain/premium.ts (LIMITS) ile aynı olmalı.
-- Bu dosya …_puan.sql'den sonra çalıştırılır (play_* fonksiyonlarını günceller).

-- Kullanıcı şu an Premium mi? `subscriptions` satırını RevenueCat webhook'u ve subscription-sync yazar.
-- Sadece aşağıdaki fonksiyonlar içinden çağrılır; başkasının durumunu sorgulamak için açık değil.
create function public.is_premium(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = p_user and active and (expires_at is null or expires_at > now())
  );
$$;
revoke all on function public.is_premium(uuid) from public, anon, authenticated;

-- Depolama kuralları için: giriş yapan kullanıcı kendisi Premium mi?
create function public.i_am_premium() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_premium(auth.uid());
$$;
revoke all on function public.i_am_premium() from public, anon;
grant execute on function public.i_am_premium() to authenticated;

/* ---------- seri dondurma ve 1,5 kat puan ---------- */

-- 'dondur': o gün kaçırıldı ama seri dondurma hakkıyla korundu (0 puan).
alter table public.play_events drop constraint play_events_kind_check;
alter table public.play_events add constraint play_events_kind_check
  check (kind in ('gorev', 'spor', 'gunluk', 'seri', 'dondur'));

-- Özet: puan, puan alınan günler (dondurulanlar hariç), dondurulan günler ve eşyalar.
create or replace function public.play_summary() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'points',
      coalesce((select sum(points) from public.play_events where user_id = auth.uid()), 0)
      - coalesce((select sum(price) from public.play_owned where user_id = auth.uid()), 0),
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

-- …_puan.sql'deki kurallar aynen geçerli; Premium üyede iş puanı ve seri bonusu 1,5 kat.
-- Dondurulan günler seriyi bozmaz (seri döngüsü o günü de "bir şey var" sayar).
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
      pts := 0;
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

-- Kaçırılan bir günü (son 8 gün) seri dondurma hakkıyla korur. Ayda ücretsiz 1, Premium 3 hak.
create function public.play_freeze(p_day date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'utc')::date;
  used integer;
  lim integer;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  if p_day is null or p_day < today - 8 or p_day > today then
    raise exception 'bad day';
  end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));
  -- O gün zaten bir şey yapılmış ya da dondurulmuşsa hak harcanmaz.
  if exists (select 1 from public.play_events where user_id = uid and day = p_day) then
    return public.play_summary();
  end if;
  lim := case when public.is_premium(uid) then 3 else 1 end;
  select count(*) into used from public.play_events
    where user_id = uid and kind = 'dondur' and date_trunc('month', day) = date_trunc('month', p_day);
  if used >= lim then
    raise exception 'no freezes left';
  end if;
  insert into public.play_events (user_id, day, kind, ref, points) values (uid, p_day, 'dondur', 'dondur', 0);
  return public.play_summary();
end;
$$;

revoke all on function public.play_freeze(date) from public, anon;
grant execute on function public.play_freeze(date) to authenticated;

/* ---------- aile paylaşımı ---------- */

-- Ev sahibi başına bir aile. `home_id`: ev sahibinin telefonunda paylaşılan evin kimliği.
create table public.families (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  owner_name text not null,
  code text not null unique,
  home_id text not null,
  created_at timestamptz not null default now()
);

-- Katılanlar. Bir kullanıcı aynı anda tek bir aileye üye olabilir.
create table public.family_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  owner_id uuid not null references public.families (owner_id) on delete cascade,
  name text not null,
  joined_at timestamptz not null default now()
);

-- Paylaşılan ev: sadece ev kısmı (odalar, rutinler, gardırop, stok, bitkiler). Puan ve günlük girmez.
create table public.shared_homes (
  owner_id uuid primary key references public.families (owner_id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- Tablolara doğrudan erişim yok; sadece aşağıdaki fonksiyonlar okur ve yazar.
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.shared_homes enable row level security;

-- Çağıranın ailesi (ev sahibi ya da üye). Yoksa null.
create function public.family_of(p_user uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select owner_id from public.families where owner_id = p_user),
    (select owner_id from public.family_members where user_id = p_user)
  );
$$;
revoke all on function public.family_of(uuid) from public, anon, authenticated;

create function public.family_info() returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when f.owner_id is null then null else jsonb_build_object(
    'role', case when f.owner_id = auth.uid() then 'owner' else 'member' end,
    'ownerId', f.owner_id,
    'ownerName', f.owner_name,
    'code', case when f.owner_id = auth.uid() then f.code end,
    'homeId', f.home_id,
    'active', public.is_premium(f.owner_id),
    'members', jsonb_build_array(jsonb_build_object('id', f.owner_id, 'name', f.owner_name, 'owner', true)) || coalesce((
      select jsonb_agg(jsonb_build_object('id', m.user_id, 'name', m.name, 'owner', false) order by m.joined_at)
      from public.family_members m where m.owner_id = f.owner_id
    ), '[]'::jsonb)
  ) end
  from (select public.family_of(auth.uid()) as id) x
  left join public.families f on f.owner_id = x.id;
$$;

-- Ev sahibi (Premium) açık evini paylaşır ve bir davet kodu alır. Zaten paylaşıyorsa paylaşılan evi değiştirir.
create function public.family_create(p_home_id text, p_name text, p_state jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  k text;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  if not public.is_premium(uid) then
    raise exception 'premium required';
  end if;
  if exists (select 1 from public.family_members where user_id = uid) then
    delete from public.family_members where user_id = uid;
  end if;
  -- Karışmasın diye 0/O, 1/I yok.
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

-- Koda katıl. Ev sahibinin Premium'u sürmeli; ailede en fazla 6 kişi (ev sahibi dahil).
create function public.family_join(p_code text, p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  fam public.families;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  select * into fam from public.families where code = upper(trim(p_code));
  if not found then
    raise exception 'bad code';
  end if;
  if fam.owner_id = uid then
    raise exception 'own family';
  end if;
  if not public.is_premium(fam.owner_id) then
    raise exception 'owner not premium';
  end if;
  perform pg_advisory_xact_lock(hashtext(fam.owner_id::text));
  if (select count(*) from public.family_members where owner_id = fam.owner_id and user_id <> uid) >= 5 then
    raise exception 'family full';
  end if;
  -- Kendi ailesi varsa (ev sahibiyse) önce o kapanır.
  delete from public.families where owner_id = uid;
  insert into public.family_members (user_id, owner_id, name)
    values (uid, fam.owner_id, left(coalesce(nullif(trim(p_name), ''), 'Aile üyesi'), 30))
    on conflict (user_id) do update set owner_id = excluded.owner_id, name = excluded.name, joined_at = now();
  return public.family_info();
end;
$$;

-- Ev sahibi çağırırsa paylaşım kapanır (herkesin kopyası telefonunda kalır); üye çağırırsa aileden çıkar.
create function public.family_leave() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.families where owner_id = auth.uid();
  delete from public.family_members where user_id = auth.uid();
end;
$$;

create function public.family_kick(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.family_members where owner_id = auth.uid() and user_id = p_user;
end;
$$;

-- Paylaşılan evi oku. Ev sahibinin Premium'u bittiyse paylaşım durur.
create function public.family_load() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  fid uuid := public.family_of(auth.uid());
  h public.shared_homes;
begin
  if fid is null or not public.is_premium(fid) then
    return null;
  end if;
  select * into h from public.shared_homes where owner_id = fid;
  if not found then
    return null;
  end if;
  return jsonb_build_object('state', h.state, 'updatedAt', h.updated_at);
end;
$$;

-- Paylaşılan evi yaz. `p_base`: telefonun bildiği son sürüm; arada başkası yazdıysa yazmaz,
-- güncel evi döner (telefon birleştirip tekrar gönderir).
create function public.family_save(p_state jsonb, p_base timestamptz) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  fid uuid := public.family_of(uid);
  h public.shared_homes;
begin
  if fid is null then
    raise exception 'no family';
  end if;
  if not public.is_premium(fid) then
    raise exception 'owner not premium';
  end if;
  if octet_length(p_state::text) > 500000 then
    raise exception 'too large';
  end if;
  perform pg_advisory_xact_lock(hashtext(fid::text));
  select * into h from public.shared_homes where owner_id = fid;
  if found and p_base is not null and h.updated_at > p_base then
    return jsonb_build_object('conflict', true, 'state', h.state, 'updatedAt', h.updated_at);
  end if;
  insert into public.shared_homes (owner_id, state, updated_by) values (fid, p_state, uid)
    on conflict (owner_id) do update set state = excluded.state, updated_at = now(), updated_by = uid
    returning * into h;
  return jsonb_build_object('conflict', false, 'updatedAt', h.updated_at);
end;
$$;

revoke all on function public.family_info() from public, anon;
revoke all on function public.family_create(text, text, jsonb) from public, anon;
revoke all on function public.family_join(text, text) from public, anon;
revoke all on function public.family_leave() from public, anon;
revoke all on function public.family_kick(uuid) from public, anon;
revoke all on function public.family_load() from public, anon;
revoke all on function public.family_save(jsonb, timestamptz) from public, anon;
grant execute on function public.family_info() to authenticated;
grant execute on function public.family_create(text, text, jsonb) to authenticated;
grant execute on function public.family_join(text, text) to authenticated;
grant execute on function public.family_leave() to authenticated;
grant execute on function public.family_kick(uuid) to authenticated;
grant execute on function public.family_load() to authenticated;
grant execute on function public.family_save(jsonb, timestamptz) to authenticated;

/* ---------- fotoğraf yedeği (Premium) ---------- */

-- Özel kova: herkes sadece kendi klasörünü (`<kullanıcı id>/…`) görür. Yazmak Premium.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('yedek', 'yedek', false, 3145728, array['image/jpeg'])
  on conflict (id) do nothing;

create policy "yedek: kendi fotoğraflarını görür" on storage.objects
  for select to authenticated
  using (bucket_id = 'yedek' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "yedek: Premium kendi klasörüne yükler" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'yedek' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.i_am_premium()));
create policy "yedek: Premium kendi fotoğrafını günceller" on storage.objects
  for update to authenticated
  using (bucket_id = 'yedek' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'yedek' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.i_am_premium()));
create policy "yedek: kendi fotoğrafını siler" on storage.objects
  for delete to authenticated
  using (bucket_id = 'yedek' and (storage.foldername(name))[1] = (select auth.uid())::text);
