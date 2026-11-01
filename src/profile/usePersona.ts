import { useEffect, useSyncExternalStore } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { DEFAULT_ANSWERS, personaOf, type Answers, type Persona } from '@/domain/persona';
import { prefs, supabase } from '@/lib/supabase';

/**
 * "Seni tanıyalım" cevapları. Önce telefonda (prefs) tutulur; hesap açılınca / girilince
 * Supabase `profiles.persona` sütununa eşlenir. Misafirken yalnız yerelde kalır.
 */
export type Saved = { answers: Answers; done: boolean; at: number; skipped?: boolean };

const KEY = 'persona';
const norm = (a: Partial<Answers> | undefined): Answers => ({ ...DEFAULT_ANSWERS, ...a, tastes: a?.tastes ?? [] });

function read(): Saved | null {
  try {
    const raw = prefs.get(KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as Saved;
    return { answers: norm(j.answers), done: !!j.done, at: j.at || 0, skipped: !!j.skipped };
  } catch {
    return null;
  }
}

let cur: Saved | null = read();
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());

/** Cevapları kaydeder (yerelde); hesap varsa senkron hook'u buluta yazar. */
export function savePersona(answers: Answers, done = true) {
  cur = { answers: norm(answers), done, at: Date.now() };
  prefs.set(KEY, JSON.stringify(cur));
  emit();
}

/** "Şimdilik geç": sorular bir daha zorlanmaz, kişiye özel ayar yapılmaz. */
export function skipPersona() {
  cur = { answers: norm(cur?.answers), done: false, at: Date.now(), skipped: true };
  prefs.set(KEY, JSON.stringify(cur));
  emit();
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};

/** Kayıtlı cevaplar ve kişilik tipi (kullanıcıya gösterilmez). */
export function usePersona(): { saved: Saved | null; answers: Answers; persona: Persona | null; done: boolean; seen: boolean } {
  const saved = useSyncExternalStore(subscribe, () => cur, () => cur);
  const done = !!saved?.done;
  const answers = saved?.answers ?? DEFAULT_ANSWERS;
  return { saved, answers, done, seen: done || !!saved?.skipped, persona: done ? personaOf(answers) : null };
}

/** Hesapla giriş yapılmışsa cevapları buluta yazar; bulutta daha yeni kayıt varsa onu alır. */
export function usePersonaSync() {
  const { status, user } = useAuth();
  const uid = status === 'account' ? user?.id : undefined;
  const { saved } = usePersona();
  const at = saved?.at ?? 0;
  const done = saved?.done ?? false;

  // Girişte: buluttaki kayıt yerelden yeniyse (ya da yerelde yoksa) buluttakini al.
  useEffect(() => {
    if (!supabase || !uid) return;
    let off = false;
    supabase.from('profiles').select('persona').eq('id', uid).maybeSingle().then(({ data, error }) => {
      if (off || error || !data?.persona) return;
      const r = data.persona as Saved;
      if (r?.done && (r.at ?? 0) > (cur?.at ?? 0)) {
        cur = { answers: norm(r.answers), done: true, at: r.at };
        prefs.set(KEY, JSON.stringify(cur));
        emit();
      }
    }, () => {});
    return () => void (off = true);
  }, [uid]);

  // Yerel kayıt değişince buluta yaz (hesaplıysa). Sütun yoksa sessizce atlanır.
  useEffect(() => {
    if (!supabase || !uid || !done || !cur) return;
    const t = setTimeout(() => {
      if (cur) supabase!.from('profiles').update({ persona: cur }).eq('id', uid).then(() => {}, () => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [uid, at, done]);
}
