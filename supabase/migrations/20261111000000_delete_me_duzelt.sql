-- Hesap silme donuyordu / hata veriyordu: Supabase, storage.objects tablosundan doğrudan silmeye izin vermez
-- ("Direct deletion from storage tables is not allowed"). Yedek fotoğraflar uygulamada Storage API ile silinir
-- (src/sync/photos.ts removeAllPhotos); burada o satır kaldırıldı.
create or replace function public.delete_me() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  delete from public.family_goal_logs where user_id = uid;
  delete from public.family_daily where user_id = uid;
  update public.shared_homes set updated_by = null where updated_by = uid;
  update public.family_goals set created_by = owner_id where created_by = uid and owner_id <> uid;
  delete from auth.users where id = uid;
end;
$$;
revoke all on function public.delete_me() from public, anon;
grant execute on function public.delete_me() to authenticated;
