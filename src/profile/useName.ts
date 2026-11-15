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
export function ownTitle(name: string | null, what: 'Ev' | 'Oda' | 'Plan', generic: string, lang: string = 'tr'): string {
  const n = name?.trim();
  if (lang !== 'tr' && !n) return generic;
  const k = what === 'Ev' ? 0 : what === 'Oda' ? 1 : 2;
  switch (lang) {
    case 'en': return `${n}'s ${['Home', 'Room', 'Plan'][k]}`;
    case 'fr': return `${['Maison', 'Chambre', 'Plan'][k]} de ${n}`;
    case 'es': return `${['Casa', 'Habitación', 'Plan'][k]} de ${n}`;
    case 'pt': return `${['Casa', 'Quarto', 'Plano'][k]} de ${n}`;
    case 'de': return `${/[sßxz]$/i.test(n!) ? `${n}'` : `${n}s`} ${['Zuhause', 'Zimmer', 'Plan'][k]}`;
    case 'ja': return `${n}の${['家', '部屋', 'プラン'][k]}`;
    case 'ko': return `${n}의 ${['집', '방', '플랜'][k]}`;
    case 'ar': return `${['منزل', 'غرفة', 'خطة'][k]} ${n}`;
  }
  const p = possessive(name);
  if (!p) return generic;
  return `${p} ${what === 'Ev' ? 'Evi' : what === 'Oda' ? 'Odası' : 'Planı'}`;
}

/** Ev mi oda mı: öğrenci (yurt) kendi odasının sahibidir. */
export function useHomeWord(): 'Ev' | 'Oda' {
  const { answers, done } = usePersona();
  return done && answers.who === 'ogrenci' ? 'Oda' : 'Ev';
}

/** "Ayşe'nin Odaları" başlığı, her dilde. */
export function roomsTitle(name: string, lang: string = 'tr'): string {
  const n = name.trim();
  switch (lang) {
    case 'tr': return `${possessive(n)} Odaları`;
    case 'en': return `${n}'s Rooms`;
    case 'de': return `${/[sßxz]$/i.test(n) ? `${n}'` : `${n}s`} Räume`;
    case 'es': return `Habitaciones de ${n}`;
    case 'fr': return `Pièces de ${n}`;
    case 'pt': return `Cômodos de ${n}`;
    case 'ja': return `${n}の部屋`;
    case 'ko': return `${n}의 방`;
    default: return `غرف ${n}`;
  }
}
