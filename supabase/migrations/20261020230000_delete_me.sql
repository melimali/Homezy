-- Uygulamadaki "Hesabımı sil" düğmesi (Apple App Review 5.1.1(v): hesap açılabiliyorsa uygulama içinden silinebilmeli).
-- Giriş yapmış kullanıcı (anonim misafir dahil) sadece kendini silebilir. profiles, homes ve subscriptions
-- satırları "on delete cascade" ile birlikte gider.
create function public.delete_me() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_me() from public, anon;
grant execute on function public.delete_me() to authenticated;
