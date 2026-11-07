import { useSyncExternalStore } from 'react';

import { displayName, useAuth } from '@/auth/AuthProvider';
import { prefs } from '@/lib/supabase';

/** Takma ad: "Seni tanıyalım"da sorulur, yalnız telefonda tutulur (şema değişmez). Misafir de adıyla çağrılır. */
const KEY = 'nick';
let cur: string | null = prefs.get(KEY);
const subs = new Set<() => void>();

export function saveNickname(n: string) {
  const v = n.trim().slice(0, 20);
  cur = v || null;
  prefs.set(KEY, cur);
  subs.forEach(f => f());
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};

export function useNickname(): string | null {
  return useSyncExternalStore(subscribe, () => cur, () => cur);
}

/** Selam için ad: önce takma ad, sonra hesap adı; yoksa null (misafir adsız). */
export function useName(): string | null {
  const { status, user } = useAuth();
  const nick = useNickname();
  if (nick) return nick;
  return status === 'account' ? displayName(user) : null;
}
