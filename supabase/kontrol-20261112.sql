-- Birlesik SQL'den sonra calistir. Hepsi true olmali.
select
  to_regclass('public.lb_profiles') is not null as lb_profiles,
  to_regclass('public.lb_daily') is not null as lb_daily,
  to_regclass('public.family_daily') is not null as family_daily,
  to_regclass('public.ai_counter') is not null as ai_counter,
  to_regclass('public.ai_rate') is not null as ai_rate,
  to_regproc('public.lb_top') is not null as lb_top,
  to_regproc('public.lb_moka_top') is not null as lb_moka_top,
  to_regproc('public.lb_nick_ok') is not null as lb_nick_ok,
  to_regproc('public.family_week') is not null as family_week,
  to_regproc('public.ai_take') is not null as ai_take,
  (select prosrc like '%then 3 else 2%' from pg_proc where proname='play_freeze' and pronamespace='public'::regnamespace) as freeze_2,
  (select prosrc like '%lim int := 25;%' from pg_proc where proname='chat_reserve' and pronamespace='public'::regnamespace) as chat_25,
  (select prosrc like '%then 10 else 2%' from pg_proc where proname='scan_reserve' and pronamespace='public'::regnamespace) as scan_10,
  (select count(*) from public.play_items) >= 92 as items_ok;
