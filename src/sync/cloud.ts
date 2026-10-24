import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Alert, AppState as RNAppState } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import type { AppState } from '@/domain/types';
import { prefs, supabase } from '@/lib/supabase';
import { useStore } from '@/store/AppStore';

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

export async function pushHome(userId: string, S: AppState) {
  if (!supabase) return;
  const { error } = await supabase.from('homes').upsert({ user_id: userId, state: forCloud(S) });
  if (error) throw error;
}

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
  return { ...S, mod: noPhotos(S.mod), others: (S.others ?? []).map(h => ({ ...h, mod: noPhotos(h.mod) })) };
}

/** Bulut yedeğini telefondaki veriyle birleştirirken fotoğrafları korur. */
export function mergeFromCloud(remote: AppState, local: AppState): AppState {
  const S: AppState = JSON.parse(JSON.stringify(remote));
  for (const [k, m] of Object.entries(S.mod)) {
    const l = local.mod[k];
    if (l?.photo) S.mod[k] = { ...m, photo: l.photo, photoAt: l.photoAt ?? null };
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
        replace(mergeFromCloud(remote.state, local));
        link(userId);
      } else {
        Alert.alert(
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
  }, [userId, linked, link, replace]);

  const active = userId && linked === userId ? userId : undefined;

  // Değişiklikleri birkaç saniye bekleyip yaz.
  useEffect(() => {
    if (!active || !state.setup) return;
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      pushHome(active, latest.current)
        .then(() => void (dirty.current = false))
        .catch(e => console.warn('Layfapp: bulut yedeği yazılamadı', e));
    }, DELAY);
  }, [active, state]);

  // Uygulama arka plana geçerken bekleyen yedeği hemen yaz.
  useEffect(() => {
    if (!active) return;
    const sub = RNAppState.addEventListener('change', s => {
      if (s !== 'active' && dirty.current && latest.current.setup) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        pushHome(active, latest.current).then(() => void (dirty.current = false)).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [active]);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
}

/** Çıkmadan önce bekleyen değişiklikleri buluta yazar. */
export async function flush(userId: string | undefined, S: AppState) {
  if (userId && prefs.get('cloudUser') === userId && S.setup) await pushHome(userId, S).catch(() => {});
}
