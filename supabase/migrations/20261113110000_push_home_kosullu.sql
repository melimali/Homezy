-- Bulut yedeginde kosullu yazma: istemci son gordugu updated_at'i gonderir; bulutta baska bir telefon
-- daha yeni yazdiysa satir degistirilmez (kontrol ile yazma tek atomik UPDATE, arada yaris olmaz).
-- Yeni fonksiyon; eski istemciler tabloya dogrudan yazmaya devam eder (geriye uyumlu). Yetkiler: sadece giris yapmis kullanici,
-- security invoker oldugu icin homes RLS ve homes_state_boyut kisiti aynen gecerli.
create or replace function public.push_home(p_state jsonb, p_expected timestamptz) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  ts timestamptz;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'auth');
  end if;
  if p_expected is null then
    -- Istemci bulutta satir olmadigini biliyor: sadece yoksa ekle.
    insert into public.homes (user_id, state) values (uid, p_state)
    on conflict (user_id) do nothing
    returning updated_at into ts;
  else
    update public.homes set state = p_state
     where user_id = uid and updated_at = p_expected
    returning updated_at into ts;
  end if;
  if ts is null then
    return jsonb_build_object('ok', false, 'reason', 'conflict');
  end if;
  return jsonb_build_object('ok', true, 'updated_at', ts);
end;
$$;
revoke all on function public.push_home(jsonb, timestamptz) from public, anon;
grant execute on function public.push_home(jsonb, timestamptz) to authenticated;
