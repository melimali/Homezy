import type { User } from '@supabase/supabase-js';

/** Gizli geliştirici araçları sadece sahibin hesabında görünür. Araçlar yalnızca kendi yerel ev seviyesini değiştirir. */
const OWNER_EMAILS = ['melihtugyan@gmail.com', 'uorigami@gmail.com'];
const OWNER_UID = '2e0adf84-6d7e-44bd-9b7e-67d243849efb';

export const isOwner = (u: User | null | undefined) =>
  !!u && (u.id === OWNER_UID || (OWNER_EMAILS.includes(u.email?.toLowerCase() ?? '') && !!u.email_confirmed_at));
