import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState as RNAppState } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import type { AppState } from '@/domain/types';
import { prefs, supabase } from '@/lib/supabase';
import { useStore } from '@/store/AppStore';
import { appAlert } from '@/components/AppAlert';

/**
 * Ev verisinin bulut yedeği: Supabase'deki `homes` tablosunda kullanıcı başına tek satır (JSON).
 * Telefondaki veri asıl kaynak; değiştikçe birkaç saniye sonra buluta yazılır. Giriş yapınca
 * buluttaki ev geri yüklenir. Fotoğraflar (buzdolabı) telefonda kalır, yedeğe girmez.
 * Aile paylaşımındaki ortak ev ayrıca `shared_homes` tablosunda eşlenir (bkz. family/FamilyProvider.tsx).
 */
export type RemoteHome = { state: AppState; updatedAt: string };

export async function fetchHome(userId: string): Promise<RemoteHome | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('homes').select('state, updated_at').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data ? { state: data.state as AppState, updatedAt: data.updated_at as string } : null;
}

/** Bu telefonun bulutta en son gördüğü ya da yazdığı sürümün zamanı (başka telefon yazdıysa farklı çıkar). */
const STAMP = 'cloudStamp';

/** Bulut yedeğinin durumu (arayüz bağlamak için dışarı açılır). 'toolarge': ev verisi 2 MB sınırını aşıyor, yazılmaz. */
export type CloudStatus = 'idle' | 'syncing' | 'ok' | 'error' | 'toolarge' | 'conflict';
let cloudStatus: CloudStatus = 'idle';
const listeners = new Set<() => void>();
function setCloudStatus(s: CloudStatus) {
  if (cloudStatus === s) return;
  cloudStatus = s;
  listeners.forEach(l => l());
}
export const getCloudStatus = () => cloudStatus;
/** Bulut yedeğinin son durumunu verir; hata olunca kullanıcıya gösterge çizmek için. */
export function useCloudStatus(): CloudStatus {
  return useSyncExternalStore(
    cb => {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
    () => cloudStatus,
    () => cloudStatus,
  );
}

/** Veritabanındaki homes.state sınırı 2.000.000 bayt (homes_state_boyut); biraz pay bırakılır. */
export const HOME_MAX_BYTES = 1_950_000;
export class HomeTooLargeError extends Error {
  constructor() {
    super('home-too-large');
    this.name = 'HomeTooLargeError';
  }
}
function utf8Bytes(str: string) {
  let n = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff) {
      n += 4;
      i++;
    } else n += 3;
  }
  return n;
}

export async function pushHome(userId: string, S: AppState) {
  if (!supabase) return;
  const cloud = forCloud(S);
  if (utf8Bytes(JSON.stringify(cloud)) > HOME_MAX_BYTES) throw new HomeTooLargeError();
  const { data, error } = await supabase.from('homes').upsert({ user_id: userId, state: cloud }).select('updated_at').maybeSingle();
  if (error) throw error;
  if (data?.updated_at) prefs.set(STAMP, data.updated_at as string);
}

/** Buluttaki sürümün zamanı (satır yoksa null). Veriyi indirmeden bakılır. */
async function remoteStamp(userId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('homes').select('updated_at').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return (data?.updated_at as string | undefined) ?? null;
}

/**
 * Başka bir telefon bizden sonra yazdıysa ezmemek için önce sürüme bakar.
 * 'conflict': bulutta bu telefonun görmediği bir sürüm var, yazılmadı.
 */
async function pushChecked(userId: string, S: AppState): Promise<'ok' | 'conflict'> {
  const known = prefs.get(STAMP);
  const rs = await remoteStamp(userId);
  // Yerel damga yoksa (veri temizlendi, yeniden kurulum) bulutta satır varsa körlemesine ezme: kullanıcıya sor.
  if (rs && rs !== known) return 'conflict';
  // Sunucuda koşullu yazma (push_home) varsa kontrol ile yazma tek işlemde olur; yoksa (migration henüz uygulanmadıysa) eski yol.
  if (supabase) {
    const cloud = forCloud(S);
    if (utf8Bytes(JSON.stringify(cloud)) > HOME_MAX_BYTES) throw new HomeTooLargeError();
    const { data, error } = await supabase.rpc('push_home', { p_state: cloud, p_expected: rs });
    if (!error && data && typeof data === 'object') {
      const r = data as { ok?: boolean; updated_at?: string };
      if (r.ok && r.updated_at) {
        prefs.set(STAMP, r.updated_at);
        return 'ok';
      }
      return 'conflict';
    }
    const missing = error?.code === 'PGRST202' || error?.code === '42883' || /push_home/.test(error?.message ?? '');
    if (error && !missing) throw error;
  }
  await pushHome(userId, S);
  return 'ok';
}

/** Yeniden deneme beklemesi: 30 sn'den başlayıp ikiye katlanır, en çok 10 dk. */
export const backoff = (fails: number) => Math.min(600_000, 30_000 * 2 ** Math.max(0, fails - 1));

/**
 * Evi siler: buluttaki satır boş bir evle (setup: false) değiştirilir. Kullanıcı başına tek satır
 * olduğu için yeni çizilen ev aynı satıra yazılır; başka telefonda girişte eski ev geri gelmez.
 */
export async function deleteHome(userId: string | undefined, fresh: AppState) {
  if (userId && prefs.get('cloudUser') === userId) await pushHome(userId, fresh);
}

const noPhotos = (mod: AppState['mod']) =>
  Object.fromEntries(Object.entries(mod).map(([k, m]) => [k, { ...m, photo: null, photoAt: null }]));

/**
 * Telefona özel alanları (buzdolabı fotoğraf yolları) yedekten çıkarır. Günlük fotoğrafları
 * Premium'da ayrıca Supabase Storage'a yedeklenir (`photoKey`, bkz. sync/photos.ts).
 */
function forCloud(S: AppState): AppState {
  const noCarePhotos = (care: AppState['care']) => (care || []).map(t => ({ ...t, photo: null }));
  return {
    // İlaç bilgisi sağlık verisi; sadece telefonda kalır.
    ...S, meds: [], medLog: {}, mod: noPhotos(S.mod), care: noCarePhotos(S.care),
    others: (S.others ?? []).map(h => ({ ...h, mod: noPhotos(h.mod), care: noCarePhotos(h.care) })),
  };
}

/** Bulut yedeğini telefondaki veriyle birleştirirken fotoğrafları korur. */
export function mergeFromCloud(remote: AppState, local: AppState): AppState {
  const S: AppState = JSON.parse(JSON.stringify(remote));
  for (const [k, m] of Object.entries(S.mod)) {
    const l = local.mod[k];
    if (l?.photo) S.mod[k] = { ...m, photo: l.photo, photoAt: l.photoAt ?? null };
  }
  S.meds = local.meds ?? [];
  S.medLog = local.medLog ?? {};
  for (const t of S.care || []) {
    const l = local.care?.find(x => x.id === t.id);
    if (l?.photo) t.photo = l.photo;
  }
  return S;
}

const DELAY = 3000;

/**
 * Hesapla giriş yapılmışsa ev verisini bulutla eşler. Kök layout'ta bir kere çağrılır.
 * Bu telefonda bu hesapla ilk kez eşleşirken buluttaki eve bakar: sadece bulutta varsa onu yükler,
 * iki tarafta da varsa kullanıcıya hangisini kullanacağını sorar. Eşleşmeden önce hiçbir şey yazmaz,
 * böylece buluttaki ev yanlışlıkla ezilmez.
 */
export function useCloudSync() {
  const { status, user } = useAuth();
  const { state, replace } = useStore();
  const userId = status === 'account' ? user?.id : undefined;
  const [linked, setLinked] = useState<string | null>(() => prefs.get('cloudUser'));
  // İnternet gelince (uygulama öne gelince ya da 30 sn'de bir) bekleyen eşleşme ve yedek yeniden denenir.
  const [tick, setTick] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(state);
  const dirty = useRef(false);
  useLayoutEffect(() => {
    latest.current = state;
  });

  const link = useCallback((id: string) => {
    prefs.set('cloudUser', id);
    setLinked(id);
  }, []);

  // Çıkış yapılınca eşleşme unutulur; aynı hesapla tekrar girilirse ev buluttan yeniden yüklenir.
  const signedOut = status === 'signedOut' || status === 'guest';
  const [wasSignedOut, setWasSignedOut] = useState(signedOut);
  if (wasSignedOut !== signedOut) {
    setWasSignedOut(signedOut);
    if (signedOut) setLinked(null);
  }
  useEffect(() => {
    if (signedOut) prefs.set('cloudUser', null);
  }, [signedOut]);

  // İlk eşleşme.
  useEffect(() => {
    if (!userId || linked === userId) return;
    let alive = true;
    (async () => {
      let remote: RemoteHome | null;
      try {
        remote = await fetchHome(userId);
      } catch {
        return; // İnternet yoksa sonraki açılışta tekrar dener; o zamana kadar buluta yazmaz.
      }
      if (!alive) return;
      const local = latest.current;
      if (!remote?.state.setup) {
        if (local.setup) await pushHome(userId, local).catch(() => {});
        link(userId);
      } else if (!local.setup) {
        prefs.set(STAMP, remote.updatedAt);
        replace(mergeFromCloud(remote.state, local));
        link(userId);
      } else {
        appAlert(
          'Bu hesapta kayıtlı bir ev var',
          'Buluttaki evini mi kullanalım, yoksa bu telefondaki evi mi? Seçmediğin silinir.',
          [
            {
              text: 'Telefondakini',
              onPress: () => {
                pushHome(userId, latest.current).catch(() => {});
                link(userId);
              },
            },
            {
              text: 'Buluttakini',
              style: 'default',
              onPress: () => {
                prefs.set(STAMP, remote.updatedAt);
                replace(mergeFromCloud(remote.state, latest.current));
                link(userId);
              },
            },
          ],
          { cancelable: false },
        );
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId, linked, link, replace, tick]);

  const active = userId && linked === userId ? userId : undefined;
  const fails = useRef(0);
  const asking = useRef(false);
  const skip = useRef(false);

  // Başka telefonda değişiklik varsa kullanıcıya sorulur; sorulmadan hiçbir taraf ezilmez.
  const resolveConflict = useCallback((uid: string) => {
    if (asking.current) return;
    asking.current = true;
    const done = () => void (asking.current = false);
    appAlert(
      'Başka bir telefonda değişiklik var',
      'Bu hesapla başka bir cihazda evi değiştirmişsin. Hangisini tutalım? Seçmediğin değişiklikler kaybolur.',
      [
        {
          text: 'Bu telefondakini',
          onPress: () => {
            pushHome(uid, latest.current)
              .then(() => {
                dirty.current = false;
                setCloudStatus('ok');
              })
              .catch(() => setCloudStatus('error'))
              .finally(done);
          },
        },
        {
          text: 'Diğer cihazdakini',
          onPress: () => {
            fetchHome(uid)
              .then(r => {
                if (!r) return;
                prefs.set(STAMP, r.updatedAt);
                skip.current = true;
                dirty.current = false;
                replace(mergeFromCloud(r.state, latest.current));
              })
              .catch(() => {})
              .finally(done);
          },
        },
      ],
      { cancelable: false },
    );
  }, [replace]);

  const writeNow = useCallback(async (uid: string) => {
    setCloudStatus('syncing');
    try {
      const r = await pushChecked(uid, latest.current);
      if (r === 'conflict') {
        setCloudStatus('conflict');
        return resolveConflict(uid);
      }
      dirty.current = false;
      fails.current = 0;
      setCloudStatus('ok');
    } catch (e) {
      if (e instanceof HomeTooLargeError) {
        // Tekrar denemenin anlamı yok: veri küçülmeden yazılamaz. Değişince (state) yeniden denenir.
        setCloudStatus('toolarge');
        console.warn('Homezy: ev verisi bulut yedeği sınırını aşıyor');
        return;
      }
      setCloudStatus('error');
      fails.current++;
      console.warn('Homezy: bulut yedeği yazılamadı', e);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setTick(t => t + 1), backoff(fails.current));
    }
  }, [resolveConflict]);

  // Değişiklikleri birkaç saniye bekleyip yaz.
  useEffect(() => {
    if (!active || !state.setup) return;
    if (skip.current) {
      skip.current = false;
      return;
    }
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void writeNow(active);
    }, DELAY);
  }, [active, state, tick, writeNow]);

  // Eşleşme internetsizlikten yapılamadıysa 30 sn'de bir tekrar dene.
  useEffect(() => {
    if (!userId || linked === userId) return;
    const t = setInterval(() => setTick(x => x + 1), 30_000);
    return () => clearInterval(t);
  }, [userId, linked]);

  // Uygulama öne gelince: bekleyen yedek varsa yaz; yoksa başka telefonda yeni sürüm olup olmadığına bak ve sessizce al.
  // Arka plana geçerken bekleyen yedek hemen yazılır.
  useEffect(() => {
    if (!active) return;
    const pull = async () => {
      try {
        const known = prefs.get(STAMP);
        const rs = await remoteStamp(active);
        if (!rs || rs === known || dirty.current) return;
        const r = await fetchHome(active);
        if (!r?.state.setup || dirty.current) return;
        prefs.set(STAMP, r.updatedAt);
        skip.current = true;
        replace(mergeFromCloud(r.state, latest.current));
      } catch {
        /* internet yok: sonra tekrar bakılır */
      }
    };
    const sub = RNAppState.addEventListener('change', s => {
      if (s === 'active') {
        if (dirty.current) setTick(t => t + 1);
        else void pull();
      }
      if (s !== 'active' && dirty.current && latest.current.setup) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        void writeNow(active);
      }
    });
    return () => sub.remove();
  }, [active, replace, writeNow]);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
}

/** Çıkmadan önce bekleyen değişiklikleri buluta yazar. */
export async function flush(userId: string | undefined, S: AppState) {
  if (userId && prefs.get('cloudUser') === userId && S.setup) await pushHome(userId, S).catch(() => {});
}
