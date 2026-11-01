import { getLang, tx } from '@/i18n/runtime';
import { FunctionsHttpError } from '@supabase/supabase-js';

import type { ChatAction, ChatCtx, ChatMsg } from '@/domain/chat';
import { CHAT_ACCOUNT_NEEDED } from '@/domain/chatGate';
import { ensureAiConsent } from '@/lib/consent';
import { supabase } from '@/lib/supabase';

/**
 * Moka sohbeti. Mesajlar `moka-chat` sunucu fonksiyonuna gider (supabase/functions/moka-chat); API anahtarı
 * uygulamada yok. Sadece üyelik + Premium; sınır sunucuda (günde 150 mesaj, dakikada 6).
 */
type Ok = { ok: true; reply: string; actions: ChatAction[]; used: number; limit: number; premium: boolean };
type Fail = { ok: false; message: string; limit?: boolean; account?: boolean; premium?: boolean };

const TIMEOUT = 45_000;

export async function askMoka(messages: ChatMsg[], ctx: ChatCtx): Promise<Ok | Fail> {
  if (!supabase) return { ok: false, message: tx('Sohbet bu sürümde kullanılamıyor.') };
  if (!(await ensureAiConsent('chat'))) return { ok: false, message: tx('Sohbet için mesajlarının yapay zekâ ile işlenmesini kabul etmen gerekiyor. Tekrar yazınca yeniden sorarım.') };
  // Hesapsız (anonim) oturum sohbete giremez; sunucu da reddeder.
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session || auth.session.user.is_anonymous) return { ok: false, account: true, message: tx(CHAT_ACCOUNT_NEEDED) };
  const { data, error } = await supabase.functions.invoke('moka-chat', { body: { messages, ctx, lang: getLang() }, timeout: TIMEOUT });
  if (!error) return { ok: true, reply: String(data.reply ?? ''), actions: Array.isArray(data.actions) ? data.actions : [], used: data.used, limit: data.limit, premium: !!data.premium };

  if (!(error instanceof FunctionsHttpError)) return { ok: false, message: tx('Bağlantıda bir sorun oldu. İnternetini kontrol edip tekrar dene.') };
  const status = error.context.status as number;
  const body = await error.context.json().catch(() => ({}));
  if (status === 403 && body.error === 'account_required') return { ok: false, account: true, message: tx(CHAT_ACCOUNT_NEEDED) };
  if (status === 403 && body.error === 'premium_required') return { ok: false, premium: true, message: tx("Sohbet Premium'a özel ☕") };
  if (status === 413) return { ok: false, message: tx('Mesajın çok uzun. Biraz kısaltıp tekrar dene.') };
  if (status === 429 && body.error === 'rate') return { ok: false, message: tx('Çok hızlı yazıyorsun, bir dakika nefes alalım ☕ Birazdan tekrar dene.') };
  if (status === 429) {
    return {
      ok: false,
      limit: true,
      message: body.premium
        ? `Bugünkü ${body.limit} mesajını kullandın. Yarın yine buradayım ☕`
        : `Bugünkü mesaj hakkın doldu. Yarın yine buradayım ☕`,
    };
  }
  if (status === 401) return { ok: false, message: tx('Oturumun kapanmış. Uygulamayı kapatıp açtıktan sonra tekrar dene.') };
  if (status === 502 && body.error === 'busy') return { ok: false, message: tx('Şu an çok yoğunum. Bir dakika sonra tekrar dene; hakkından düşmedi.') };
  if (status === 503 && body.error === 'not_configured') return { ok: false, message: tx('Sohbet henüz açılmadı (yapay zekâ anahtarı girilmemiş).') };
  if (status === 404) return { ok: false, message: tx('Sohbet şu an kullanılamıyor.') };
  return { ok: false, message: tx('Şu an cevap veremedim. Biraz sonra tekrar dene; hakkından düşmedi.') };
}
