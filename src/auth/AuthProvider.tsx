import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { offlineMsg, online, withTimeout } from '@/lib/net';
import { prefs, supabase } from '@/lib/supabase';
import { removeAllPhotos } from '@/sync/photos';

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

/** Onay e-postasındaki bağlantı buraya düşer (themeikai.com/homezy). Supabase > URL Configuration > Redirect URLs'e de eklenmeli. */
const EMAIL_CONFIRMED_URL = 'https://themeikai.com/homezy/eposta-onayi';

const offline: Result = { ok: false, error: 'Hesap sunucusu henüz bağlanmadı. Şimdilik hesapsız devam edebilirsin.' };
const noNet = async (): Promise<Result | null> => ((await online()) ? null : { ok: false, error: offlineMsg() });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [guest, setGuest] = useState(() => prefs.get('guest') === '1');
  const [introSeen, setIntroSeen] = useState(() => prefs.get('intro') === '1');

  useEffect(() => {
    if (!supabase) return;
    // İnternet yoksa ya da sunucu yanıt vermezse 4 sn sonra yerel oturumla açılır; açılış asla takılmaz.
    withTimeout(
      supabase.auth.getSession().then(({ data }) => data.session),
      4000,
      null as Session | null,
    ).then(s => {
      if (s) setSession(s);
      setReady(true);
    });
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
    const off = await noNet();
    if (off) return off;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() }, emailRedirectTo: EMAIL_CONFIRMED_URL },
    });
    if (error) return { ok: false, error: authErrorText(error) };
    // E-posta onayı açıksa oturum onaydan sonra, giriş yapınca açılır.
    if (!data.session) return { ok: true, needsConfirm: true };
    setGuestFlag(false);
    return { ok: true };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<Result> => {
    if (!supabase) return offline;
    const off = await noNet();
    if (off) return off;
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { ok: false, error: authErrorText(error) };
    setGuestFlag(false);
    return { ok: true };
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<Result> => {
    if (!supabase) return offline;
    const off = await noNet();
    if (off) return off;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: EMAIL_CONFIRMED_URL });
    if (error) return { ok: false, error: authErrorText(error) };
    return { ok: true };
  }, []);

  const continueAsGuest = useCallback(async () => {
    setGuestFlag(true);
    if (supabase) await withTimeout(supabase.auth.signInAnonymously(), 5000, null);
  }, []);

  // Çıkış ve silme, uygulamayı ilk açılıştaki hâline döndürür: tanıtım yeniden görünür.
  const signOut = useCallback(async () => {
    setGuestFlag(false);
    prefs.set('intro', null);
    setIntroSeen(false);
    if (supabase) await withTimeout(supabase.auth.signOut(), 4000, null);
    setSession(null);
  }, []);

  const deleteAccount = useCallback(async (): Promise<Result> => {
    // Oturum yoksa (sunucu bağlı değil ya da misafir hiç bağlanamadı) silinecek bir şey sadece telefonda.
    if (supabase && session) {
      const off = await noNet();
      if (off) return off;
      // Kullanıcıyı, profilini, ev yedeğini ve abonelik kaydını siler (supabase/migrations: delete_me).
      // Mağaza aboneliğini kullanıcı App Store / Google Play'den kendisi iptal eder; ekranda bunu söylüyoruz.
      await removeAllPhotos(session.user.id);
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
