// Hesap açma: Cloudflare Turnstile token'ını sunucuda doğrular, sonra Supabase Auth'ta kaydı yapar.
// Giriş, şifre yenileme ve misafir oturumu captcha istemez (Supabase > Attack Protection > Captcha KAPALI olmalı).
// Sınırlar: IP başına dakikada 5, günde 20 kayıt; e-posta başına dakikada 2; tüm uygulama günde 500 (ai_burst / ai_take).
// Gizli değişken: TURNSTILE_SECRET (Cloudflare secret key). SUPABASE_URL ve SUPABASE_ANON_KEY otomatik.
// İsteğe bağlı: SIGNUP_IP_DAILY, SIGNUP_GLOBAL_DAILY (sayı).

import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders, jsonResponse, readJson } from '../_shared/http.ts';
import { admin } from '../_shared/subscription.ts';

const num = (n: string, d: number) => {
  const v = Number(Deno.env.get(n));
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : d;
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const REDIRECTS = ['https://themeikai.com/'];

async function sha(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
}
const ipOf = (req: Request) =>
  (req.headers.get('cf-connecting-ip') ?? req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return jsonResponse(req, { error: 'method' }, 405);

  const parsed = await readJson(req, 4_000);
  if ('error' in parsed) return jsonResponse(req, { error: parsed.error }, 400);
  const b = parsed.body;
  const email = String(b.email ?? '').trim().toLowerCase();
  const password = String(b.password ?? '');
  const name = String(b.name ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 60);
  const token = typeof b.captchaToken === 'string' ? b.captchaToken.slice(0, 2100) : '';
  const redirectTo = String(b.redirectTo ?? '');
  if (!EMAIL.test(email) || email.length > 200) return jsonResponse(req, { error: 'validation_failed' }, 400);
  if (password.length < 8 || password.length > 200) return jsonResponse(req, { error: 'weak_password' }, 400);
  if (redirectTo && !REDIRECTS.some(p => redirectTo.startsWith(p))) return jsonResponse(req, { error: 'validation_failed' }, 400);

  // Hız sınırları (Turnstile'dan önce: doğrulama çağrısı da boşa harcanmasın).
  const ip = await sha(ipOf(req) || 'unknown');
  const burst = async (key: string, lim: number, secs: number) => {
    const { data, error } = await admin.rpc('ai_burst', { p_key: key, p_limit: lim, p_secs: secs });
    return error ? 'server' : data ? null : 'rate';
  };
  const take = async (key: string, lim: number) => {
    const { data, error } = await admin.rpc('ai_take', { p_key: key, p_limit: lim });
    return error ? 'server' : data ? null : 'rate';
  };
  const limited =
    (await burst(`su:ip:${ip}`, 5, 60)) ??
    (await burst(`su:em:${await sha(email)}`, 2, 60)) ??
    (await take(`su:ipd:${ip}`, num('SIGNUP_IP_DAILY', 20))) ??
    (await take('su:g', num('SIGNUP_GLOBAL_DAILY', 500)));
  if (limited === 'server') return jsonResponse(req, { error: 'server' }, 500);
  if (limited) return jsonResponse(req, { error: 'over_request_rate_limit' }, 429);

  // Turnstile doğrulaması (gizli anahtar yoksa kapalı kalır: kayıt açılmaz).
  const secret = Deno.env.get('TURNSTILE_SECRET');
  if (!secret) return jsonResponse(req, { error: 'server' }, 500);
  if (!token) return jsonResponse(req, { error: 'captcha_failed' }, 400);
  try {
    const form = new URLSearchParams({ secret, response: token });
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form, signal: AbortSignal.timeout(8_000) });
    const j = await r.json();
    if (!j?.success) return jsonResponse(req, { error: 'captcha_failed' }, 400);
  } catch {
    return jsonResponse(req, { error: 'server' }, 502);
  }

  // Kayıt: anon anahtarla, normal kayıt gibi (onay e-postası Supabase'den gider).
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name }, ...(redirectTo ? { emailRedirectTo: redirectTo } : {}) } });
  if (error) return jsonResponse(req, { error: error.code ?? 'unknown', status: error.status ?? 400 }, 400);
  return jsonResponse(req, {
    ok: true,
    session: data.session ? { access_token: data.session.access_token, refresh_token: data.session.refresh_token } : null,
  });
});
