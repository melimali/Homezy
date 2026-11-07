import { useEffect, useSyncExternalStore } from 'react';

import { prefs } from '@/lib/supabase';

/**
 * İlk açılış sırası: ekranı kaplayan bütün pencereler (karşılama, ruh hali, Premium seçimi, bildirim izni,
 * kutlamalar, Ben turu) buradan sırayla geçer. Aynı anda sadece biri görünür; biri kapanınca
 * `GAP` ms sonra sıradaki gelir (kapanış animasyonu bitsin, ekran nefes alsın).
 */
export const ORDER = ['welcome', 'welcomeBack', 'mood', 'choice', 'notif', 'celebrate', 'streak', 'levelUp', 'tabIntro', 'tour'] as const;
export type Step = (typeof ORDER)[number];
export const GAP = 380;

export type Queue = ReturnType<typeof createQueue>;

export function createQueue(setT: typeof setTimeout = setTimeout, clearT: typeof clearTimeout = clearTimeout) {
  const wants = new Set<Step>();
  const subs = new Set<() => void>();
  let current: Step | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const emit = () => subs.forEach(f => f());
  const best = () => ORDER.find(s => wants.has(s)) ?? null;

  const reconcile = () => {
    if (current && !wants.has(current)) {
      current = null;
      emit();
    }
    if (current == null && timer == null && best()) {
      timer = setT(() => {
        timer = null;
        if (current == null) {
          current = best();
          if (current) emit();
        }
      }, GAP);
    }
  };

  return {
    want(id: Step, on: boolean) {
      if (on === wants.has(id)) return;
      if (on) wants.add(id);
      else wants.delete(id);
      reconcile();
    },
    get current() {
      return current;
    },
    subscribe(f: () => void) {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
    reset() {
      wants.clear();
      if (timer) clearT(timer);
      timer = null;
      current = null;
    },
  };
}

const queue = createQueue();

/** Pencere gösterilmek istiyorsa `wants` true ver; sıra ona gelince true döner. */
export function useStep(id: Step, wants: boolean): boolean {
  useEffect(() => {
    queue.want(id, wants);
    return () => queue.want(id, false);
  }, [id, wants]);
  const cur = useSyncExternalStore(queue.subscribe, () => queue.current, () => null);
  return wants && cur === id;
}

/** Bu açılış kaçıncı? (1 = uygulama ilk kez açıldı.) Premium seçimi ilk açılışta çıkmaz. */
const SESSION_KEY = 'fr.sessions';
export const sessionNo = (() => {
  const n = (Number(prefs.get(SESSION_KEY)) || 0) + 1;
  prefs.set(SESSION_KEY, String(n));
  return n;
})();

export const flag = {
  has: (k: string) => prefs.get(`fr.${k}`) === '1',
  set: (k: string) => prefs.set(`fr.${k}`, '1'),
};
