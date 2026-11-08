// Yapay zekâ çağrılarından önce maliyet koruması: kullanıcı ve IP başına dakika sınırı, IP başına günlük tavan,
// tüm uygulama için günlük tavan (harcama kesici). Sayaçlar `ai_take` / `ai_burst` (20261110000000_ai_koruma.sql).
// Kullanıcı hakkından (scan_reserve / chat_reserve) AYRI ve ek bir katmandır.
//
// İsteğe bağlı gizli değişkenler (sayı):
//   AI_DAILY_CAP_SCAN  Günde en fazla kaç tarama (tüm kullanıcılar toplam). Varsayılan 1500.
//   AI_DAILY_CAP_CHAT  Günde en fazla kaç sohbet mesajı (toplam). Varsayılan 4000.
//   AI_IP_DAILY        Bir IP'den günde en fazla kaç yapay zekâ isteği. Varsayılan 200 (operatör NAT'ında çok kişi aynı IP'yi paylaşır).
//   AI_IP_PER_MIN      Bir IP'den dakikada. Varsayılan 30.
// Acil durdurma: AI_DISABLED=1 (bkz. http.ts).

import { admin } from './subscription.ts';

export type Kind = 'scan' | 'chat';
const num = (name: string, d: number) => {
  const v = Number(Deno.env.get(name));
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : d;
};

async function sha(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
}

function clientIp(req: Request): string {
  const h = req.headers;
  const raw = h.get('cf-connecting-ip') ?? h.get('x-real-ip') ?? h.get('x-forwarded-for') ?? '';
  return raw.split(',')[0].trim() || 'unknown';
}

export type Guard =
  | { ok: true; release: () => Promise<void> }
  | { ok: false; status: number; error: 'rate' | 'capacity' | 'server' };

/** Modeli çağırmadan önce çağır. ok değilse isteği reddet. ok ise hata / boş sonuçta `release()` çağır. */
export async function guard(req: Request, userId: string, kind: Kind): Promise<Guard> {
  try {
    const ip = await sha(clientIp(req));
    const taken: string[] = [];
    const undo = async () => { for (const k of taken) await admin.rpc('ai_give_back', { p_key: k }); };

    // Dakika sınırları (sayaç geri verilmez; pencere kendiliğinden kapanır).
    const userMin = kind === 'scan' ? 4 : 8;
    for (const [key, lim] of [[`u:${kind}:${userId}`, userMin], [`ip:${ip}`, num('AI_IP_PER_MIN', 30)]] as const) {
      const { data, error } = await admin.rpc('ai_burst', { p_key: key, p_limit: lim, p_secs: 60 });
      if (error) return { ok: false, status: 500, error: 'server' };
      if (!data) return { ok: false, status: 429, error: 'rate' };
    }
    // Günlük tavanlar: IP, sonra tüm uygulama.
    const caps: [string, number][] = [
      [`ip:${ip}`, num('AI_IP_DAILY', 200)],
      [`g:${kind}`, kind === 'scan' ? num('AI_DAILY_CAP_SCAN', 1500) : num('AI_DAILY_CAP_CHAT', 4000)],
    ];
    for (const [key, lim] of caps) {
      const { data, error } = await admin.rpc('ai_take', { p_key: key, p_limit: lim });
      if (error) { await undo(); return { ok: false, status: 500, error: 'server' }; }
      if (!data) { await undo(); return { ok: false, status: 429, error: 'capacity' }; }
      taken.push(key);
    }
    // Kullanım günlüğü (Supabase > Functions > Logs): kimlik değil IP özeti ve tür.
    console.log(JSON.stringify({ ai: kind, ip, user: userId.slice(0, 8) }));
    let done = false;
    return { ok: true, release: async () => { if (!done) { done = true; await undo(); } } };
  } catch (e) {
    console.error('guard failed', e);
    return { ok: false, status: 500, error: 'server' };
  }
}
