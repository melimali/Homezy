import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { loadState, saveState } from '@/data/db';
import { seed } from '@/domain/logic';
import type { AppState } from '@/domain/types';

type Store = {
  state: AppState;
  /** Taslak üzerinde değişiklik yapar, ekranı yeniler ve veritabanına yazar. */
  update: (fn: (draft: AppState) => void) => AppState;
  replace: (next: AppState) => void;
};

const StoreContext = createContext<Store | null>(null);

const clone = (S: AppState): AppState => JSON.parse(JSON.stringify(S));

/** Kayıtları sıraya koyar; arka arkaya gelen değişikliklerde yalnızca en sonuncusu yazılır. */
function createSaver() {
  let pending: AppState | null = null;
  let running = false;
  return async function save(S: AppState) {
    pending = S;
    if (running) return;
    running = true;
    try {
      while (pending) {
        const next = pending;
        pending = null;
        try {
          await saveState(next);
        } catch (e) {
          console.warn('Layfapp: kayıt başarısız', e);
        }
      }
    } finally {
      running = false;
    }
  };
}

export function AppStoreProvider({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [saver] = useState(createSaver);
  // En güncel state; arka arkaya gelen değişikliklerin (ör. parmakla boyama) hepsi bunun üzerinden çalışır.
  const current = useRef<AppState | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      let S: AppState | null = null;
      try {
        S = await loadState();
      } catch (e) {
        console.warn('Layfapp: veri okunamadı', e);
      }
      if (!S) {
        S = seed();
        saver(S);
      }
      if (alive) {
        current.current = S;
        setState(S);
      }
    })();
    return () => {
      alive = false;
    };
  }, [saver]);

  const update = useCallback(
    (fn: (draft: AppState) => void) => {
      const prev = current.current;
      if (!prev) throw new Error('Veri henüz yüklenmedi');
      const draft = clone(prev);
      fn(draft);
      current.current = draft;
      setState(draft);
      saver(draft);
      return draft;
    },
    [saver],
  );

  const replace = useCallback(
    (next: AppState) => {
      current.current = next;
      saver(next);
      setState(next);
    },
    [saver],
  );

  if (!state) return <>{fallback ?? null}</>;
  return <StoreContext.Provider value={{ state, update, replace }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore, AppStoreProvider içinde kullanılmalı');
  return s;
}
