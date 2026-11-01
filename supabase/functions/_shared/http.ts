// Edge Function'lar için ortak güvenlik yardımcıları: CORS izin listesi, gövde boyutu sınırı,
// sabit zamanlı karşılaştırma. Mobil uygulama tarayıcı değil; CORS sadece web önizlemesi için açılır.
//
// İsteğe bağlı gizli değişkenler:
//   ALLOWED_ORIGINS  Virgülle ayrılmış izinli web kökenleri (varsayılan: yerel Expo web önizlemesi).
//   AI_DISABLED=1    Acil durum anahtarı: yapay zekâ çağıran fonksiyonlar (scan, moka-chat) hemen kapanır.

const ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:8081,http://localhost:19006')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

export function corsHeaders(req: Request): Record<string, string> {
  const h: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  };
  const origin = req.headers.get('Origin');
  if (origin && ORIGINS.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

export function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } });
}

export const aiDisabled = () => Deno.env.get('AI_DISABLED') === '1';

/**
 * Gövdeyi JSON olarak okur; Content-Length ve gerçek boyut `maxBytes`'ı aşarsa reddeder.
 * Dönen `error`: 'too_large' | 'bad_request'.
 */
export async function readJson(req: Request, maxBytes: number): Promise<{ body: any } | { error: 'too_large' | 'bad_request' }> {
  const len = Number(req.headers.get('Content-Length') ?? 0);
  if (len > maxBytes) return { error: 'too_large' };
  try {
    const text = await req.text();
    if (text.length > maxBytes) return { error: 'too_large' };
    const body = JSON.parse(text);
    if (body === null || typeof body !== 'object') return { error: 'bad_request' };
    return { body };
  } catch {
    return { error: 'bad_request' };
  }
}

/** Sabit zamanlı metin karşılaştırması (gizli anahtar denemelerinde zamanlama sızıntısı olmasın). */
export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a), y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}
