-- Hesaplar, ev yedeği ve abonelik durumu.
-- Ödeme / kart bilgisi hiçbir tabloda yok: ödemeyi App Store ve Google Play alır,
-- biz sadece RevenueCat'in bildirdiği "Premium etkin mi, ne zaman bitiyor" bilgisini tutarız.

-- Profil: ad. Kayıtta auth.users'tan otomatik oluşur.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  created_at timestamptz not null default now()
);

-- Ev verisinin bulut yedeği: kullanıcı başına tek satır, uygulamadaki state'in JSON hâli.
create table public.homes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

-- Abonelik durumu. Sadece sunucu (RevenueCat webhook fonksiyonu) yazar, kullanıcı okur.
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  entitlement text not null default 'premium',
  active boolean not null default false,
  product_id text,
  store text,
  period_type text,
  expires_at timestamptz,
  will_renew boolean,
  last_event text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.homes enable row level security;
alter table public.subscriptions enable row level security;

create policy "profil: kendi satırını okur" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profil: kendi satırını günceller" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "ev: kendi evini okur" on public.homes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "ev: kendi evini ekler" on public.homes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "ev: kendi evini günceller" on public.homes
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "abonelik: kendi durumunu okur" on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);

-- updated_at'i her yazışta tazele.
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger homes_touch before update on public.homes
  for each row execute function public.touch_updated_at();

-- Yeni kullanıcıya profil satırı aç (anonim misafirler dahil).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name) values (new.id, new.raw_user_meta_data ->> 'name');
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
