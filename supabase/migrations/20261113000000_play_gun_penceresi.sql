-- Çevrimdışı kalan kullanıcının puanı reddedilmesin (2026-11-13): izin verilen gün aralığı bugün-1 yerine bugün-7 … bugün+1.
-- Supabase SQL Editor'de bir kez çalıştırılır. Yalnız play_award içindeki gün kontrolü değişti; gerisi formuller.sql ile aynı.
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
  if p_day is null or p_day < today - 7 or p_day > today + 1 then
    raise exception 'bad day';
  end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));
  mult := case when public.is_premium(uid) then 1.5 else 1 end;

  p_ref := case when p_kind = 'gorev' then left(coalesce(nullif(p_ref, ''), '?'), 64) else p_kind end;
  pts := case p_kind when 'gorev' then 10 when 'spor' then 15 else 10 end;
  if p_kind = 'gorev' then
    select count(*) into n from public.play_events where user_id = uid and day = p_day and kind = 'gorev';
    if n >= 20 then
      return public.play_summary() || jsonb_build_object('awarded', false);
    end if;
    -- Azalan getiri: günün ilk 5 işi 10, sonraki 5 iş 5, kalan 10 iş 2 puan (günlük en çok 95).
    pts := case when n < 5 then 10 when n < 10 then 5 else 2 end;
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
        values (uid, p_day, 'seri', 'seri', round(round(30 * (1 - exp(-streak / 15.0))) * mult))
        on conflict do nothing;
    end if;
  end if;

  return public.play_summary() || jsonb_build_object('awarded', inserted > 0);
end;
$$;
revoke all on function public.play_award(text, text, date) from public, anon;
grant execute on function public.play_award(text, text, date) to authenticated;
