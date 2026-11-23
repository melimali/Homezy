import { getUiLang, tx } from '@/i18n/runtime';
import { FunctionsHttpError } from '@supabase/supabase-js';

import type { ChatAction, ChatCtx, ChatMsg } from '@/domain/chat';
import { isRoomExpression, type RoomExpression } from '@/constants/room-expression';
import { CHAT_ACCOUNT_NEEDED } from '@/domain/chatGate';
import { ensureAiConsent } from '@/lib/consent';
import { offlineMsg, online } from '@/lib/net';
import { supabase } from '@/lib/supabase';

/**
 * Moka sohbeti. Mesajlar `moka-chat` sunucu fonksiyonuna gider (supabase/functions/moka-chat); API anahtarı
 * uygulamada yok. Sadece üyelik + Premium; sınır sunucuda (günde 25, ayda 750 mesaj, dakikada 6).
 */
type Ok = { ok: true; reply: string; actions: ChatAction[]; mood?: RoomExpression; used: number; limit: number; mused?: number; mlimit?: number; premium: boolean };
type Fail = { ok: false; message: string; limit?: boolean; account?: boolean; premium?: boolean; /** Günlük hak doldu: Moka vedalaşır, giriş yarına kadar kilitlenir. */ daily?: boolean };

const TIMEOUT = 45_000;

/** Günlük sohbet hakkı sunucuda Türkiye saatiyle gece yarısı yenilenir (chat_reserve: Europe/Istanbul) = 21:00 UTC. */
export function chatResetAt(now = new Date()): Date {
  const r = new Date(now);
  r.setUTCHours(21, 0, 0, 0);
  if (r.getTime() <= now.getTime()) r.setUTCDate(r.getUTCDate() + 1);
  return r;
}

export async function askMoka(messages: ChatMsg[], ctx: ChatCtx): Promise<Ok | Fail> {
  if (!supabase) return { ok: false, message: tx('Sohbet bu sürümde kullanılamıyor.') };
  if (!(await online())) return { ok: false, message: offlineMsg() };
  if (!(await ensureAiConsent('chat'))) return { ok: false, message: tx('Sohbet için mesajlarının yapay zekâ ile işlenmesini kabul etmen gerekiyor. Tekrar yazınca yeniden sorarım.') };
  // Hesapsız (anonim) oturum sohbete giremez; sunucu da reddeder.
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session || auth.session.user.is_anonymous) return { ok: false, account: true, message: tx(CHAT_ACCOUNT_NEEDED) };
  const { data, error } = await supabase.functions.invoke('moka-chat', { body: { messages, ctx, lang: getUiLang() }, timeout: TIMEOUT });
  if (!error) {
    const d = (data ?? {}) as Record<string, any>;
    const num = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) ? v : def);
    return { ok: true, reply: String(d.reply ?? ''), actions: Array.isArray(d.actions) ? d.actions : [], mood: isRoomExpression(d.mood) ? d.mood : undefined, used: num(d.used, 0), limit: num(d.limit, 0), mused: d.mused == null ? undefined : num(d.mused, 0), mlimit: d.mlimit == null ? undefined : num(d.mlimit, 0), premium: !!d.premium };
  }

  if (!(error instanceof FunctionsHttpError)) return { ok: false, message: tx('Bağlantıda bir sorun oldu. İnternetini kontrol edip tekrar dene.') };
  const status = error.context.status as number;
  const body = await error.context.json().catch(() => ({}));
  if (status === 403 && body.error === 'account_required') return { ok: false, account: true, message: tx(CHAT_ACCOUNT_NEEDED) };
  if (status === 403 && body.error === 'premium_required') return { ok: false, premium: true, message: tx("Sohbet Premium'a özel ☕") };
  if (status === 413) return { ok: false, message: tx('Mesajın çok uzun. Biraz kısaltıp tekrar dene.') };
  if (status === 429 && body.error === 'rate') return { ok: false, message: tx('Çok hızlı yazıyorsun, bir dakika nefes alalım ☕ Birazdan tekrar dene.') };
  if (status === 429 && body.error === 'capacity') return { ok: false, message: tx('Yapay zekâ bugün çok yoğun. Yarın tekrar dene; hakkından düşmedi.') };
  if (status === 429 && body.error === 'limit_month') {
    return { ok: false, limit: true, message: tx('Bu ayki sohbet hakkımızı doldurduk, çok keyifliydi ☕ Yeni ayda yine buradayım. İşlerin için uygulama hep açık 💛') };
  }
  if (status === 429) {
    return {
      ok: false,
      limit: true,
      daily: !!body.premium,
      message: body.premium
        ? tx('Moka yoruldu 😴 Yarın tekrar gel, seni bekliyor olacağım ☕💛')
        : tx('Bugünkü mesaj hakkın doldu. Yarın yine buradayım ☕'),
    };
  }
  if (status === 401) return { ok: false, message: tx('Oturumun kapanmış. Uygulamayı kapatıp açtıktan sonra tekrar dene.') };
  if (status === 502 && body.error === 'busy') return { ok: false, message: tx('Şu an çok yoğunum. Bir dakika sonra tekrar dene; hakkından düşmedi.') };
  if (status === 503 && body.error === 'not_configured') return { ok: false, message: tx('Sohbet henüz açılmadı (yapay zekâ anahtarı girilmemiş).') };
  if (status === 404) return { ok: false, message: tx('Sohbet şu an kullanılamıyor.') };
  return { ok: false, message: tx('Şu an cevap veremedim. Biraz sonra tekrar dene; hakkından düşmedi.') };
}
