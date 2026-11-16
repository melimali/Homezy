-- Ücretsiz seri dondurma hakkı ayda 1'den 2'ye çıktı (Premium 3). Supabase SQL Editor'de çalıştır.
create or replace function public.play_freeze(p_day date) returns jsonb
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
  lim := case when public.is_premium(uid) then 3 else 2 end;
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
