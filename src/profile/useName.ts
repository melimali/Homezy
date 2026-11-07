import { useSyncExternalStore } from 'react';

import { displayName, useAuth } from '@/auth/AuthProvider';
import { prefs } from '@/lib/supabase';
import { usePersona } from '@/profile/usePersona';

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

const BACK = 'aıou';
const ROUND = 'ou';
const VOWELS = 'aeıioöuü';

/** Türkçe tamlama eki: Ayşe'nin, Ali'nin, Pınar'ın, Okan'ın, Ayşegül'ün. Ad yoksa null. */
export function possessive(name: string | null): string | null {
  const n = name?.trim();
  if (!n) return null;
  const low = n.toLocaleLowerCase('tr');
  const last = [...low].reverse().find(ch => VOWELS.includes(ch)) ?? 'e';
  const endsVowel = VOWELS.includes(low[low.length - 1]);
  const v = BACK.includes(last) ? (ROUND.includes(last) ? 'u' : 'ı') : 'öü'.includes(last) ? 'ü' : 'i';
  return `${n}'${endsVowel ? 'n' : ''}${v}n`;
}

/** "Ayşe'nin Evi" / yurt-öğrenci için "Ayşe'nin Odası". Ad yoksa genel başlık. */
export function ownTitle(name: string | null, what: 'Ev' | 'Oda' | 'Plan', generic: string): string {
  const p = possessive(name);
  if (!p) return generic;
  return `${p} ${what === 'Ev' ? 'Evi' : what === 'Oda' ? 'Odası' : 'Planı'}`;
}

/** Ev mi oda mı: öğrenci (yurt) kendi odasının sahibidir. */
export function useHomeWord(): 'Ev' | 'Oda' {
  const { answers, done } = usePersona();
  return done && answers.who === 'ogrenci' ? 'Oda' : 'Ev';
}
