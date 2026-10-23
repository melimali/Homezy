// Yapay zekâ ile fotoğraf taraması: buzdolabı (`fridge`) ya da kıyafet (`look`).
// Uygulama fotoğrafı ve evdeki mevcut listeyi gönderir; fonksiyon hakkı ayırır, fotoğrafı Claude'a
// sorar, JSON sonucu döner. Fotoğraf saklanmaz. Hata ya da boş sonuçta hak geri verilir.
// Ayrıntılar ve sınırlar: docs/premium.md. Kullanıcı oturumuyla çağrılır (JWT doğrulaması açık).
//
// Gizli değişken: ANTHROPIC_API_KEY. İsteğe bağlı: SCAN_MODEL (varsayılan claude-sonnet-5-5).
// SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY Supabase tarafından otomatik verilir.

import Anthropic from 'npm:@anthropic-ai/sdk';

import { admin } from '../_shared/subscription.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
const MODEL = Deno.env.get('SCAN_MODEL') ?? 'claude-sonnet-5-5';
/** Base64 olarak en fazla ~4,5 MB fotoğraf (Claude'un görsel sınırı 5 MB). */
const MAX_IMAGE = 6_000_000;
const MEDIA = ['image/jpeg', 'image/png', 'image/webp'] as const;
type Media = (typeof MEDIA)[number];
type Kind = 'fridge' | 'look';

/** Uygulamadaki gardırop kategorileri (src/domain/constants.ts, CATS) ve yıkama türleri (WASH). */
const CATS = ['Üst', 'Alt', 'Elbise / Takım', 'Dış giyim', 'Ev / Pijama', 'İç giyim', 'Ayakkabı', 'Aksesuar'];
const WASH = ['beyaz', 'renkli', 'koyu', 'hassas'];

const list = (known: string[]) => (known.length ? known.map(n => `- ${n}`).join('\n') : '(boş)');

function fridgePrompt(known: string[]) {
  return `Bu fotoğraf bir buzdolabının içi. Görünen yiyecek ve içecekleri çıkar, her birinin yaklaşık ne kadar kaldığını tahmin et.

Evdeki mevcut takip listesi:
${list(known)}

Kurallar:
- Sadece fotoğrafta gerçekten görünenleri yaz. Kapalı bir kutu ya da poşetin içi anlaşılmıyorsa tahmin etme, atla.
- name: kısa, genel Türkçe ad, marka yazma (ör. "Süt", "Beyaz peynir", "Domates"). Aynı üründen birden fazla varsa tek satırda topla.
- qty: kısa Türkçe miktar tahmini, ör. "6 adet", "yarım şişe", "1 paket", "dibinde biraz".
- lvl: "var" yeterince var, "az" bitmek üzere ya da üçte birden az kalmış, "yok" ambalaj boş görünüyor.
- match: ürün takip listesindeki bir ürünle aynıysa listedeki adı aynen yaz, değilse null.
- missing: takip listesinde olup fotoğrafta hiç göremediğin ürünlerin adları, listedeki yazımla.
- note: Türkçe, en fazla iki kısa cümle. Neyin azaldığını ve markette nelere bakmak gerektiğini söyle.
- Fotoğraf buzdolabı değilse items ve missing boş olsun, note bunu söylesin.

Sadece şu biçimde JSON döndür, başka metin yazma:
{"items":[{"name":"Süt","qty":"yarım şişe","lvl":"az","match":"Süt"}],"missing":["Tereyağı"],"note":"Süt azalmış, domates hiç yok."}`;
}

function lookPrompt(known: string[]) {
  return `Bu fotoğrafta kıyafetler var: ya bir kişinin üzerinde giyilmiş bir kombin ya da yan yana serilmiş parçalar. Görünen her kıyafet parçasını ve ayakkabıyı ayrı ayrı çıkar.

Dolaptaki mevcut parçalar:
${list(known)}

Kurallar:
- name: kısa Türkçe ad, renk + kumaş ya da tür, ör. "Lacivert keten gömlek". Marka yazma.
- cat: şu listeden biri: ${CATS.join(', ')}.
- wash: yıkama grubu, şu listeden biri: beyaz (beyaz ve krem), renkli, koyu (siyah, lacivert, koyu kot), hassas (yün, ipek, saten, kaşmir).
- match: parça dolaptaki bir parçayla büyük olasılıkla aynıysa dolaptaki adı aynen yaz, değilse null.
- worn: kıyafetler bir kişinin üzerinde giyiliyse true, serilmiş ya da askıdaysa false.
- note: Türkçe, en fazla iki kısa cümle. Fotoğraftaki parçaların renk ve kumaş uyumu hakkında yorum yap.
- Kişinin yüzü, bedeni ya da ortam hakkında yorum yapma. Fotoğrafta kıyafet yoksa pieces boş olsun, note bunu söylesin.

Sadece şu biçimde JSON döndür, başka metin yazma:
{"pieces":[{"name":"Beyaz pamuk gömlek","cat":"Üst","wash":"beyaz","match":"Beyaz gömlek"}],"worn":true,"note":"Beyaz gömlek ve koyu kot net bir kontrast kuruyor."}`;
}

/** Cevaptaki ilk JSON nesnesini okur (kod bloğu ya da açıklama eklenmişse de). */
function parseJson(text: string): Record<string, unknown> | null {
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try {
    return JSON.parse(text.slice(a, b + 1));
  } catch {
    return null;
  }
}

const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
const nameOrNull = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 60) : null);

/** Modelin cevabını uygulamanın beklediği biçime indirir; tanınmayan alanları atar. */
function clean(kind: Kind, r: Record<string, unknown>) {
  const note = str(r.note, 240);
  if (kind === 'fridge') {
    const items = (Array.isArray(r.items) ? r.items : []).slice(0, 40).flatMap(x => {
      const name = str(x?.name, 40);
      if (!name) return [];
      const lvl = ['var', 'az', 'yok'].includes(x?.lvl) ? x.lvl : 'var';
      return [{ name, qty: str(x?.qty, 30), lvl, match: nameOrNull(x?.match) }];
    });
    const missing = (Array.isArray(r.missing) ? r.missing : []).map(x => str(x, 60)).filter(Boolean).slice(0, 40);
    return { items, missing, note };
  }
  const pieces = (Array.isArray(r.pieces) ? r.pieces : []).slice(0, 20).flatMap(x => {
    const name = str(x?.name, 40);
    if (!name) return [];
    return [{
      name,
      cat: CATS.includes(x?.cat) ? x.cat : 'Aksesuar',
      wash: WASH.includes(x?.wash) ? x.wash : null,
      match: nameOrNull(x?.match),
    }];
  });
  return { pieces, worn: r.worn === true, note };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
  const { data: auth, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !auth.user) return json({ error: 'unauthorized' }, 401);
  const userId = auth.user.id;

  let body: { kind?: string; image?: string; mediaType?: string; known?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const kind = body.kind === 'fridge' || body.kind === 'look' ? body.kind : null;
  const image = typeof body.image === 'string' ? body.image : '';
  const mediaType = (MEDIA as readonly string[]).includes(body.mediaType ?? '') ? (body.mediaType as Media) : 'image/jpeg';
  if (!kind || !image) return json({ error: 'bad_request' }, 400);
  if (image.length > MAX_IMAGE) return json({ error: 'too_large' }, 413);
  const known = (Array.isArray(body.known) ? body.known : []).map(x => str(x, 60)).filter(Boolean).slice(0, 80);

  const { data: slot, error: slotErr } = await admin.rpc('scan_reserve', { p_user: userId, p_kind: kind });
  if (slotErr) return json({ error: 'server' }, 500);
  if (!slot.ok) return json({ error: 'limit', premium: slot.premium, limit: slot.limit }, 429);
  const release = () => admin.rpc('scan_release', { p_user: userId, p_period: slot.period, p_kind: kind });

  try {
    const res = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: 'low' },
      // Güvenlik sınıflandırıcısı reddederse istek aynı çağrıda başka bir modelle tekrarlanır.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
          { type: 'text', text: kind === 'fridge' ? fridgePrompt(known) : lookPrompt(known) },
        ],
      }],
    });
    const text = res.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('');
    const parsed = res.stop_reason === 'refusal' ? null : parseJson(text);
    if (!parsed) {
      await release();
      return json({ error: 'unreadable' }, 422);
    }
    const result = clean(kind, parsed);
    // Sadece başarılı tarama hak yer: hiçbir şey tanınmadıysa hak geri verilir.
    const empty = kind === 'fridge' ? !('items' in result) || !result.items.length : !('pieces' in result) || !result.pieces.length;
    if (empty) await release();
    return json({ result, used: empty ? slot.used - 1 : slot.used, limit: slot.limit, premium: slot.premium });
  } catch (e) {
    await release();
    console.error('scan failed', e);
    return json({ error: e instanceof Anthropic.RateLimitError ? 'busy' : 'ai' }, 502);
  }
});
