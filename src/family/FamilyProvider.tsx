import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState as RNAppState } from 'react-native';

import { displayName, useAuth } from '@/auth/AuthProvider';
import type { FamilyInfo, SharedHome } from '@/domain/family';
import { dropShared, forShare, homeData, mergeHome, openShared, sharedHomeId } from '@/domain/homes';
import type { AppState, HomeData } from '@/domain/types';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/AppStore';

/**
 * Aile paylaşımı (Premium): ev sahibi bir evini paylaşır, bir kod alır; eşi, ev arkadaşı ya da
 * çocukları bu kodla katılır. Paylaşılan ev Supabase'deki `shared_homes` tablosunda tek satır;
 * herkesin telefonunda bir kopyası durur. Değişiklik olunca birkaç saniye sonra sunucuya yazılır,
 * uygulama öne gelince ve yarım dakikada bir sunucudan çekilir.
 *
 * Paylaşılan sadece ev: odalar, rutinler, gardırop, stok, bitkiler. Puan, seri, günlük, spor ve
 * ayarlar herkesin kendine ait. Katılanların Premium olması gerekmez; ev sahibinin Premium'u
 * bitince paylaşım durur, herkesin telefonundaki kopya kalır. Kurallar sunucuda (…_premium.sql).
 */
type Result = { ok: true } | { ok: false; error: string };

type FamilyCtx = {
  info: FamilyInfo | null;
  loading: boolean;
  /** Paylaşılan evin bu telefondaki kimliği. */
  sharedId: string | null;
  /** Açık ev paylaşılan ev mi. */
  sharing: boolean;
  refresh: () => Promise<void>;
  create: () => Promise<Result>;
  join: (code: string, name: string) => Promise<Result>;
  leave: () => Promise<Result>;
  kick: (userId: string) => Promise<Result>;
};

const FamilyContext = createContext<FamilyCtx | null>(null);

const DELAY = 2500;
const POLL = 30_000;

const errText = (m: string) =>
  m.includes('owner not premium') ? 'Bu ailenin Premium üyeliği bitmiş, şu an katılınamıyor.'
  : m.includes('premium') ? 'Aile paylaşımı için Premium üyelik gerekiyor ⭐'
  : m.includes('bad code') ? 'Bu kodla bir aile bulunamadı. Kodu kontrol et.'
  : m.includes('full') ? 'Bu aile dolu (en fazla 6 kişi).'
  : m.includes('own family') ? 'Bu senin kendi ailenin kodu 🙂'
  : 'Bağlanılamadı. İnternet bağlantını kontrol edip tekrar dene.';

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { session, user } = useAuth();
  const { state, update, get } = useStore();
  const [raw, setInfo] = useState<FamilyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const uid = session?.user.id;
  // Çıkış yapınca aile bilgisi de gider.
  const info = uid ? raw : null;

  const fetchInfo = useCallback(async (): Promise<FamilyInfo | null | undefined> => {
    if (!supabase || !uid) return null;
    const { data, error } = await supabase.rpc('family_info');
    // Tablo henüz kurulmamışsa (SQL çalıştırılmadıysa) aile özelliği sessizce kapalı kalır.
    return error ? undefined : ((data as FamilyInfo | null) ?? null);
  }, [uid]);

  const refresh = useCallback(async () => {
    const fi = await fetchInfo();
    if (fi !== undefined) setInfo(fi);
  }, [fetchInfo]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const fi = await fetchInfo();
      if (!alive) return;
      if (fi !== undefined) setInfo(fi);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [fetchInfo]);

  const sharedId = info ? (info.role === 'owner' ? info.homeId : sharedHomeId(info.ownerId)) : null;
  const sharing = !!info?.active && state.homeId === sharedId;

  /* ---------- eşleme ---------- */

  // Sunucudaki son sürüm (çakışma kontrolü için) ve en son gönderilen ev.
  const base = useRef<string | null>(null);
  const sent = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const live = useRef({ sharing, sharedId });
  useLayoutEffect(() => {
    live.current = { sharing, sharedId };
  });

  /** Sunucudaki evi telefondakiyle birleştirip açar. */
  const applyRemote = useCallback(
    (remote: SharedHome) => {
      base.current = remote.updatedAt;
      update(D => {
        if (D.homeId !== live.current.sharedId) return;
        Object.assign(D, mergeHome(remote.state, homeData(D)));
      });
      sent.current = JSON.stringify(forShare(get()));
    },
    [update, get],
  );

  const pull = useCallback(async () => {
    if (!supabase || !live.current.sharing) return;
    const { data, error } = await supabase.rpc('family_load');
    if (error || !data) return;
    const remote = data as SharedHome;
    if (remote.updatedAt !== base.current) applyRemote(remote);
  }, [applyRemote]);

  const push = useCallback(async () => {
    // Biri bizden önce kaydettiyse birleştirip tekrar dener (en fazla üç kez).
    for (let attempt = 0; attempt < 3; attempt++) {
      if (!supabase || !live.current.sharing) return;
      const body = forShare(get());
      const json = JSON.stringify(body);
      if (json === sent.current) return;
      const { data, error } = await supabase.rpc('family_save', { p_state: body, p_base: base.current });
      if (error) return;
      const r = data as { conflict: boolean; updatedAt: string; state?: HomeData };
      if (!r.conflict || !r.state) {
        base.current = r.updatedAt;
        sent.current = json;
        return;
      }
      applyRemote({ state: r.state, updatedAt: r.updatedAt });
      sent.current = null;
    }
  }, [get, applyRemote]);

  // Paylaşılan eve geçince (ya da açılışta) sunucudan çek.
  useEffect(() => {
    if (!sharing) return;
    base.current = null;
    sent.current = null;
    pull();
    const t = setInterval(pull, POLL);
    const sub = RNAppState.addEventListener('change', s => {
      if (s === 'active') pull();
      else push();
    });
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, [sharing, pull, push]);

  // Ev değişince birkaç saniye bekleyip gönder. Sadece ev kısmı karşılaştırılır.
  const house = sharing ? JSON.stringify(forShare(state)) : null;
  useEffect(() => {
    if (!house || base.current === null) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      push();
    }, DELAY);
  }, [house, push]);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  /* ---------- işlemler ---------- */

  const create = useCallback(async (): Promise<Result> => {
    if (!supabase || !uid) return { ok: false, error: 'Aile paylaşımı için internet ve giriş gerekiyor.' };
    const S = get();
    const { error } = await supabase.rpc('family_create', { p_home_id: S.homeId, p_name: displayName(user), p_state: forShare(S) });
    if (error) return { ok: false, error: errText(error.message) };
    await refresh();
    return { ok: true };
  }, [uid, user, get, refresh]);

  const join = useCallback(
    async (code: string, name: string): Promise<Result> => {
      if (!supabase || !uid) return { ok: false, error: 'Aileye katılmak için internet ve giriş gerekiyor.' };
      const { data, error } = await supabase.rpc('family_join', { p_code: code.trim().toUpperCase(), p_name: name.trim() || displayName(user) });
      if (error) return { ok: false, error: errText(error.message) };
      const fi = data as FamilyInfo;
      const loaded = await supabase.rpc('family_load');
      if (loaded.error || !loaded.data) return { ok: false, error: errText(loaded.error?.message ?? '') };
      const remote = loaded.data as SharedHome;
      const id = sharedHomeId(fi.ownerId);
      update((D: AppState) => openShared(D, id, `${fi.ownerName} ile evimiz`, remote.state));
      setInfo(fi);
      return { ok: true };
    },
    [uid, user, update],
  );

  const leave = useCallback(async (): Promise<Result> => {
    if (!supabase || !info) return { ok: true };
    const { error } = await supabase.rpc('family_leave');
    if (error) return { ok: false, error: errText(error.message) };
    // Üye çıkınca paylaşılan evin kopyası silinir; ev sahibinin evi kendisinde kalır.
    if (info.role === 'member') update(D => dropShared(D, sharedHomeId(info.ownerId)));
    setInfo(null);
    return { ok: true };
  }, [info, update]);

  const kick = useCallback(
    async (userId: string): Promise<Result> => {
      if (!supabase) return { ok: false, error: '' };
      const { error } = await supabase.rpc('family_kick', { p_user: userId });
      if (error) return { ok: false, error: errText(error.message) };
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  const value = useMemo(
    () => ({ info, loading, sharedId, sharing, refresh, create, join, leave, kick }),
    [info, loading, sharedId, sharing, refresh, create, join, leave, kick],
  );
  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

export function useFamily() {
  const f = useContext(FamilyContext);
  if (!f) throw new Error('useFamily, FamilyProvider içinde kullanılmalı');
  return f;
}
