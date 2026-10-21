import type { AuthError } from '@supabase/supabase-js';

/** Supabase hata kodlarını Türkçe, kullanıcıya gösterilecek metne çevirir. */
export function authErrorText(e: AuthError): string {
  switch (e.code) {
    case 'invalid_credentials':
      return 'E-posta ya da şifre yanlış.';
    case 'email_not_confirmed':
      return 'E-postanı henüz onaylamadın. Gelen kutundaki bağlantıya dokunup tekrar dene.';
    case 'user_already_exists':
    case 'email_exists':
      return 'Bu e-postayla zaten bir hesap var. Giriş yapmayı dene.';
    case 'weak_password':
      return 'Şifre çok zayıf. En az 8 karakter, harf ve rakam kullan.';
    case 'email_address_invalid':
    case 'validation_failed':
      return 'E-posta adresini kontrol et.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Çok fazla deneme oldu. Birkaç dakika sonra tekrar dene.';
    case 'signup_disabled':
      return 'Yeni hesap açma şu an kapalı.';
  }
  if (e.name === 'AuthRetryableFetchError' || /network|fetch/i.test(e.message)) {
    return 'İnternete bağlanılamadı. Bağlantını kontrol edip tekrar dene.';
  }
  return 'Bir sorun oldu. Biraz sonra tekrar dene.';
}

export const validEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
