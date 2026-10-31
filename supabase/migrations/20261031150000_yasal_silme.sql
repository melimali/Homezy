-- Yasal uyum (KVKK / GDPR / LGPD): "Hesabımı sil" kullanıcıya ait HER şeyi silsin.
-- Supabase SQL Editor'de bir kere çalıştır. Önce 20261031000000_aile_evi.sql çalışmış olmalı.
--
-- Zaten "on delete cascade" ile gidenler: profiles, homes, subscriptions, play_events, play_owned, play_spend,
-- scan_usage, chat_usage, families (ev sahibiyse aile, paylaşılan ev, ortak hedefler), family_members.
-- Bağlantısı olmayan ve burada elle silinenler: ortak hedeflere yazdığı ilerleme kayıtları, ortak evde "son düzenleyen" izi.
-- Storage'daki yedek fotoğraflar uygulamada silinir (src/sync/photos.ts removeAllPhotos); aşağıda yedek olarak SQL'den de silinir.

create or replace function public.delete_me() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  delete from public.family_goal_logs where user_id = uid;
  update public.shared_homes set updated_by = null where updated_by = uid;
  -- Bu kullanıcının eklediği hedefler başkalarının ailesinde kalıyorsa sahibi artık yok sayılmasın diye ev sahibine devret.
  update public.family_goals set created_by = owner_id where created_by = uid and owner_id <> uid;
  delete from storage.objects where bucket_id = 'yedek' and (storage.foldername(name))[1] = uid::text;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_me() from public, anon;
grant execute on function public.delete_me() to authenticated;
