import { useSyncExternalStore } from 'react';

/** Açılıştaki Ücretsiz / Premium seçimi ekranda mı? Açıkken diğer pencereler (ör. ruh hali sorusu) beklesin. */
let open = false;
const subs = new Set<() => void>();

export function setLaunchChoiceOpen(v: boolean) {
  if (open === v) return;
  open = v;
  subs.forEach(f => f());
}

export const useLaunchChoiceOpen = () =>
  useSyncExternalStore(
    f => {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
    () => open,
    () => false,
  );
