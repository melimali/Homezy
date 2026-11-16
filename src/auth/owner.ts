import type { User } from '@supabase/supabase-js';

/** Gizli geliştirici araçları sadece sahibin hesabında görünür. Araçlar yalnızca kendi yerel ev seviyesini değiştirir. */
const OWNER_EMAILS = ['melihtugyan@gmail.com', 'uorigami@gmail.com'];
const OWNER_UID = '2e0adf84-6d7e-44bd-9b7e-67d243849efb';

/**
 * Üretim sürümünde sahip araçları kapalıdır. Sadece geliştirme sürümünde (`__DEV__`) ya da derleme sırasında
 * `EXPO_PUBLIC_OWNER_TOOLS=1` verilmişse açılır. Ortam değişkeni yoksa yalnız `__DEV__`.
 */
const toolsEnabled = __DEV__ || process.env.EXPO_PUBLIC_OWNER_TOOLS === '1';

export const isOwner = (u: User | null | undefined) =>
  toolsEnabled && !!u && (u.id === OWNER_UID || (OWNER_EMAILS.includes(u.email?.toLowerCase() ?? '') && !!u.email_confirmed_at));
