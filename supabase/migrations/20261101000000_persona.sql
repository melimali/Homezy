-- "Seni tanıyalım" cevapları: kullanıcı hesabına bağlı, kendi satırını okur/günceller (mevcut profil politikaları yeter).
alter table public.profiles add column if not exists persona jsonb;
