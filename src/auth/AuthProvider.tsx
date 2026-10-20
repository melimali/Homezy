import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { prefs, supabase } from '@/lib/supabase';

import { authErrorText } from './errors';

/**
 * - `signedOut`: tanıtımdan sonra giriş ekranı açılır.
 * - `guest`: hesapsız devam. Supabase anonim oturumu açılır (yapay zekâ taraması ve satın alma için
 *   bir kimlik gerekiyor); internet yoksa ya da sunucu bağlı değilse sadece telefonda çalışır.
 * - `account`: e-posta ve şifreyle açılmış hesap. Ev verisi buluta yedeklenir.
 */
export type AuthStatus = 'loading' | 'signedOut' | 'guest' | 'account';

type Result = { ok: true; needsConfirm?: boolean } | { ok: false; error: string };

type Auth = {
  status: AuthStatus;
  user: User | null;
  session: Session | null;
  introSeen: boolean;
  finishIntro: () => void;
  signUp: (name: string, email: string, password: string) => Promise<Result>;
  signIn: (email: string, password: string) => Promise<Result>;
  resetPassword: (email: string) => Promise<Result>;
  continueAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<Result>;
};

const AuthContext = createContext<Auth | null>(null);

const offline: Result = { ok: false, error: 'Hesap sunucusu henüz bağlanmadı. Şimdilik hesapsız devam edebilirsin.' };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [guest, setGuest] = useState(() => prefs.get('guest') === '1');
  const [introSeen, setIntroSeen] = useState(() => prefs.get('intro') === '1');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => {})
      .finally(() => setReady(true));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // Misafir olup anonim oturumu henüz açılamamışsa (ör. ilk açılışta internet yoktu) tekrar dene.
  useEffect(() => {
    if (supabase && ready && guest && !session) supabase.auth.signInAnonymously().catch(() => {});
  }, [ready, guest, session]);

  const user = session?.user ?? null;
  const status: AuthStatus = !ready
    ? 'loading'
    : user && !user.is_anonymous
      ? 'account'
      : user || guest
        ? 'guest'
        : 'signedOut';

  const setGuestFlag = (v: boolean) => {
    prefs.set('guest', v ? '1' : null);
    setGuest(v);
  };

  const finishIntro = useCallback(() => {
    prefs.set('intro', '1');
    setIntroSeen(true);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string): Promise<Result> => {
    if (!supabase) return offline;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    });
    if (error) return { ok: false, error: authErrorText(error) };
    // E-posta onayı açıksa oturum onaydan sonra, giriş yapınca açılır.
    if (!data.session) return { ok: true, needsConfirm: true };
    setGuestFlag(false);
    return { ok: true };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<Result> => {
    if (!supabase) return offline;
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { ok: false, error: authErrorText(error) };
    setGuestFlag(false);
    return { ok: true };
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<Result> => {
    if (!supabase) return offline;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) return { ok: false, error: authErrorText(error) };
    return { ok: true };
  }, []);

  const continueAsGuest = useCallback(async () => {
    setGuestFlag(true);
    if (supabase) await supabase.auth.signInAnonymously().catch(() => {});
  }, []);

  // Çıkış ve silme, uygulamayı ilk açılıştaki hâline döndürür: tanıtım yeniden görünür.
  const signOut = useCallback(async () => {
    setGuestFlag(false);
    prefs.set('intro', null);
    setIntroSeen(false);
    if (supabase) await supabase.auth.signOut().catch(() => {});
    setSession(null);
  }, []);

  const deleteAccount = useCallback(async (): Promise<Result> => {
    // Oturum yoksa (sunucu bağlı değil ya da misafir hiç bağlanamadı) silinecek bir şey sadece telefonda.
    if (supabase && session) {
      // Kullanıcıyı, profilini, ev yedeğini ve abonelik kaydını siler (supabase/migrations: delete_me).
      // Mağaza aboneliğini kullanıcı App Store / Google Play'den kendisi iptal eder; ekranda bunu söylüyoruz.
      const { error } = await supabase.rpc('delete_me');
      if (error) return { ok: false, error: 'Hesap silinemedi. İnternet bağlantını kontrol edip tekrar dene.' };
    }
    await signOut();
    return { ok: true };
  }, [session, signOut]);

  const value = useMemo<Auth>(
    () => ({ status, user, session, introSeen, finishIntro, signUp, signIn, resetPassword, continueAsGuest, signOut, deleteAccount }),
    [status, user, session, introSeen, finishIntro, signUp, signIn, resetPassword, continueAsGuest, signOut, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const a = useContext(AuthContext);
  if (!a) throw new Error('useAuth, AuthProvider içinde kullanılmalı');
  return a;
}

export const displayName = (u: User | null) =>
  (u?.user_metadata?.name as string | undefined)?.trim() || u?.email?.split('@')[0] || 'Misafir';
