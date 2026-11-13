// Yapay zekâ ile fotoğraf taraması: buzdolabı (`fridge`) ya da kıyafet (`look`).
// Uygulama fotoğrafı ve evdeki mevcut listeyi gönderir; fonksiyon hakkı ayırır, fotoğrafı Claude'a
// sorar, JSON sonucu döner. Fotoğraf saklanmaz. Hata ya da boş sonuçta hak geri verilir.
// Ayrıntılar ve sınırlar: docs/premium.md. Kullanıcı oturumuyla çağrılır (JWT doğrulaması açık).
//
// Gizli değişken: ANTHROPIC_API_KEY. İsteğe bağlı: SCAN_MODEL (varsayılan claude-haiku-5-5; kalite yetmezse claude-sonnet-5-5).
// SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY Supabase tarafından otomatik verilir.

import Anthropic from 'npm:@anthropic-ai/sdk';

import { aiDisabled, corsHeaders, jsonResponse, readJson } from '../_shared/http.ts';
import { guard } from '../_shared/guard.ts';
import { admin } from '../_shared/subscription.ts';
import { KINDS, COLORS, FABRICS, SCHEMA, clean, parseJson, str } from './clean.ts';

// Zaman aşımı 60 sn, otomatik yeniden deneme yok (her deneme ayrıca ücretlendirilir).
const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY'), timeout: 60_000, maxRetries: 0 });
const MODEL = Deno.env.get('SCAN_MODEL') ?? 'claude-haiku-5-5';
// Güvenlik sınıflandırıcısı reddederse istek aynı çağrıda başka bir modelle tekrarlanır. Haiku bunu desteklemiyor.
const FALLBACK = MODEL.startsWith('claude-haiku')
  ? {}
  : { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const };
/** Base64 olarak en fazla ~4,5 MB fotoğraf (Claude'un görsel sınırı 5 MB). */
const MAX_IMAGE = 6_000_000;
const MEDIA = ['image/jpeg', 'image/png', 'image/webp'] as const;
type Media = (typeof MEDIA)[number];

/** İngilizce modda: kullanıcıya görünen metinler İngilizce olsun; `match`/`missing` listedeki yazımla kalır, enum alanlar (kind, color, fabric, pattern, wash, lvl) aynen kalır. */
const EN_RULE = `\n\nLANGUAGE RULE (overrides the Turkish instructions above): the user uses the app in English. Write name, qty and note in natural English (e.g. "Milk", "half a bottle", "Navy linen shirt"). Keep match and missing exactly as spelled in the lists above, and keep the enum fields (kind, color, fabric, pattern, wash, lvl, conf) exactly as specified, in Turkish.`;
const withLang = (prompt: string, lang: unknown) => (lang === 'en' ? prompt + EN_RULE : prompt);

const list = (known: string[]) => (known.length ? known.map(n => `- ${n}`).join('\n') : '(boş)');

function fridgePrompt(known: string[]) {
  return `Bu fotoğraf bir buzdolabının içi. Dikkatli bir envanter çıkar: görünen yiyecek ve içecekleri bul, her birinin yaklaşık ne kadar kaldığını tahmin et.

Evdeki mevcut takip listesi:
${list(known)}

Nasıl bak:
- Önce rafları yukarıdan aşağıya, sonra kapak raflarını ve sebzelik çekmecelerini tek tek tara. Arkada kalan ve üst üste duran ürünlere de bak.
- Birbirine benzeyen ürünleri ayır: süt / ayran / kefir, yoğurt / labne / krema, sirke / zeytinyağı, reçel / bal / tahin, beyaz peynir / kaşar. Ambalaj etiketi okunuyorsa etikete güven, rengi ve şekli tek başına yeterli sayma.
- Sadece fotoğrafta gerçekten görünenleri yaz. Uydurma, "muhtemelen vardır" diye ekleme.
- İçi anlaşılmayan kapaklı kap, kavanoz, folyo ve opak poşetleri atlama: şekline, rengine, boyutuna ve yanındakilere bakarak EN OLASI içeriği tahmin et, ama conf="tahmin" yaz (ör. "Yoğurt" ya da hiçbir ipucu yoksa "Kapaklı kap"). Kullanıcıya "Bu ne? Doğru mu?" diye sorulacak, bu yüzden tahmin etmekten çekinme.

Alanlar:
- name: kısa, genel Türkçe ad, marka yazma (ör. "Süt", "Beyaz peynir", "Domates"). Aynı üründen birden fazla varsa tek satırda topla.
- qty: HER üründe doldur. Sayabiliyorsan say ("6 adet", "2 şişe"); içi görünen ambalajda doluluğa bak ("yarım şişe", "dibinde biraz", "dolu paket"). Miktardan emin değilsen tahmin et ve başına "~" koy ("~2 adet", "~yarım paket"). Boş bırakma.
- lvl: "var" yeterince var, "az" bitmek üzere ya da üçte birden az kalmış (taze ürünlerde 1-2 adet kalmışsa da az), "yok" ambalaj boş görünüyor.
- conf: "kesin" ürünü net gördüysen; "tahmin" ürünün adını şekil/renk/bağlamdan çıkardıysan (içi görünmeyen kap, etiketi okunmayan ambalaj); "belirsiz" tahmin bile edemiyorsan ya da çok az görünüyorsa. Kullanıcı "tahmin" ve "belirsiz" satırlara ayrıca onay verir; emin olmadığın şeyi "kesin" yazma.
- exp: ambalajda açıkça okunan son kullanma tarihi, "YYYY-AA-GG" biçiminde; okunmuyorsa null. Tarihi tahmin etme.
- match: ürün takip listesindeki bir ürünle aynıysa (farklı yazılmış olsa da, ör. "Kaşar" ile "Kaşar peyniri") listedeki adı aynen yaz, değilse null. Emin değilsen null.
- missing: takip listesinde olup fotoğrafta hiç göremediğin ürünlerin adları, listedeki yazımla. Fotoğraf buzdolabının sadece bir kısmını gösteriyorsa missing boş olsun.
- note: Türkçe, en fazla iki kısa cümle. Neyin azaldığını, bozulabilecek (solmuş, sarkmış) bir şey varsa onu ve markette nelere bakılacağını söyle. Fotoğraf bulanık ya da karanlıksa bunu da söyle.
- Fotoğraf buzdolabı ya da yiyecek dolabı değilse items ve missing boş olsun, note bunu söylesin.

Sadece şu biçimde JSON döndür, başka metin yazma:
{"items":[{"name":"Süt","qty":"yarım şişe","lvl":"az","match":"Süt","conf":"kesin","exp":null}],"missing":["Tereyağı"],"note":"Süt azalmış, domates hiç yok."}`;
}

const METER_PROMPT = `Bu fotoğraf elektrik, su ya da doğalgaz sayacı mı? Sayaç göstergesi (rakamlı ekran ya da çarklar) görünüyorsa ok=true. Başka bir şeyin fotoğrafıysa (kişi, oda, yiyecek, manzara, boş ya da karanlık kare) ok=false.
Sadece JSON döndür: {"ok":true,"reason":"kısa Türkçe açıklama"}`;
const METER_SCHEMA = { type: 'object', properties: { ok: { type: 'boolean' }, reason: { type: 'string' } }, required: ['ok', 'reason'], additionalProperties: false };

function lookPrompt(known: string[]) {
  return `Bu fotoğrafta kıyafetler var: ya bir kişinin üzerinde giyilmiş bir kombin ya da yan yana serilmiş, askıda ya da dolapta duran parçalar. Görünen her kıyafet parçasını ve ayakkabıyı ayrı ayrı, dikkatle çıkar.

Dolaptaki mevcut parçalar:
${list(known)}

Nasıl bak:
- Parçaları tek tek ele al. Üst üste duran ya da kısmen görünen parçaları da say; ama görünmeyen bir şeyi (kapalı ceketin altındaki gömlek gibi) uydurma.
- Aynı parça iki kez yazılmasın. Birbirine benzeyen ama farklı iki parça varsa (iki farklı mavi gömlek) ikisini ayrı yaz.
- Rengi ışığa ve gölgeye göre değil kumaşın asıl rengine göre seç. Kumaşı doku, parlaklık, dikiş ve kalıba bakarak çıkar; emin değilsen conf="tahmin" yaz.

Alanlar:
- kind: şu listeden biri: ${Object.keys(KINDS).join(', ')}. Listede tam karşılığı yoksa en yakınını seç (hırka ve süveter: Kazak, yelek: Ceket, çanta, şapka, kemer, atkı: Aksesuar).
- color: parçanın baskın rengi, şu listeden en yakını: ${COLORS.join(', ')}.
- hex: baskın rengin "#RRGGBB" kodu; seçtiğin color ile uyumlu olsun.
- fabric: en olası kumaş, şu listeden biri: ${FABRICS.join(', ')}.
- pattern: "düz" ya da "desenli" (çizgili, kareli, çiçekli, baskılı vb.).
- name: kısa Türkçe ad, renk + tür, ör. "Lacivert keten gömlek". Marka yazma.
- wash: yıkama grubu, şu listeden biri: beyaz (beyaz ve krem), renkli, koyu (siyah, lacivert, koyu kot), hassas (yün, ipek, saten, kaşmir).
- conf: "kesin" tür, renk ve kumaşı net gördüysen; "tahmin" parça kısmen görünüyor ya da tür/kumaşı doku ve kalıptan çıkardıysan; "belirsiz" bulanık ya da çok az görünüyorsa. Kullanıcı "tahmin" ve "belirsiz" parçalara ayrıca onay verir.
- match: parça dolaptaki bir parçayla büyük olasılıkla aynıysa dolaptaki adı aynen yaz, değilse null. Emin değilsen null.
- worn: kıyafetler bir kişinin üzerinde giyiliyse true, serilmiş ya da askıdaysa false.
- note: Türkçe, en fazla iki kısa cümle. Parçaların renk, kumaş ve stil uyumu hakkında yorum yap; bir şey uymuyorsa nedenini söyle.
- Kişinin yüzü, bedeni ya da ortam hakkında yorum yapma. Fotoğrafta kıyafet yoksa pieces boş olsun, note bunu söylesin.

Sadece şu biçimde JSON döndür, başka metin yazma:
{"pieces":[{"name":"Beyaz pamuk gömlek","kind":"Gömlek","color":"beyaz","hex":"#F4F4F0","fabric":"Pamuk","pattern":"düz","wash":"beyaz","match":"Beyaz gömlek","conf":"kesin"}],"worn":true,"note":"Beyaz gömlek ve koyu kot net bir kontrast kuruyor."}`;
}

/** Base64 başlığından gerçek görsel türünü bulur (istemcinin söylediği tür güvenilmez). */
function sniff(b64: string): Media | null {
  let head: Uint8Array;
  try {
    head = Uint8Array.from(atob(b64.slice(0, 32)), c => c.charCodeAt(0));
  } catch {
    return null;
  }
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) return 'image/png';
  if (head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 && head[8] === 0x57 && head[9] === 0x45) return 'image/webp';
  return null;
}

Deno.serve(async req => {
  const json = (body: unknown, status = 200) => jsonResponse(req, body, status);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  // Acil durum anahtarı (AI_DISABLED=1) ve anahtar girilmeden hak ayrılmasın.
  if (aiDisabled()) return json({ error: 'not_configured' }, 503);
  if (!Deno.env.get('ANTHROPIC_API_KEY')) return json({ error: 'not_configured' }, 503);
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
  const { data: auth, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !auth.user) return json({ error: 'unauthorized' }, 401);
  const userId = auth.user.id;

  // Gövde boyutu, kimlik doğrulamadan sonra ve JSON ayrıştırılmadan önce sınırlanır.
  const parsed0 = await readJson(req, MAX_IMAGE + 20_000);
  if ('error' in parsed0) return json({ error: parsed0.error }, parsed0.error === 'too_large' ? 413 : 400);
  const body = parsed0.body as { kind?: string; image?: string; mediaType?: string; known?: unknown; lang?: unknown };
  const isMeter = body.kind === 'meter';
  const kind = body.kind === 'fridge' || body.kind === 'look' ? body.kind : null;
  const image = typeof body.image === 'string' ? body.image : '';
  if ((!kind && !isMeter) || !image) return json({ error: 'bad_request' }, 400);
  if (image.length > MAX_IMAGE) return json({ error: 'too_large' }, 413);
  // Sadece gerçek JPEG / PNG / WebP kabul edilir; hak ayrılmadan önce kontrol edilir.
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(image) || image.length % 4 === 1) return json({ error: 'bad_image' }, 400);
  const mediaType = sniff(image);
  if (!mediaType) return json({ error: 'bad_image' }, 415);
  const known = (Array.isArray(body.known) ? body.known : []).map(x => str(x, 60)).filter(Boolean).slice(0, 80);

  // Sayaç kontrolü: ucuz tek soru (evet/hayır). Tarama hakkından düşmez; sadece guard (dakika/IP/genel tavan) uygulanır. Misafir de kullanabilir.
  if (isMeter) {
    const gm = await guard(req, userId, 'scan');
    if (!gm.ok) return json({ error: gm.error }, gm.status);
    try {
      const res = await anthropic.beta.messages.create({
        model: MODEL,
        max_tokens: 300,
        output_config: { effort: 'low', format: { type: 'json_schema', schema: METER_SCHEMA } },
        ...FALLBACK,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
          { type: 'text', text: METER_PROMPT },
        ] }],
      });
      const r = parseJson(res.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join(''));
      if (!r || typeof r.ok !== 'boolean') { await gm.release(); return json({ error: 'unreadable' }, 422); }
      return json({ ok: r.ok, reason: str(r.reason, 120) });
    } catch (e) {
      await gm.release();
      console.error('meter failed', e);
      return json({ error: 'ai' }, 502);
    }
  }
  if (auth.user.is_anonymous) return json({ error: 'account_required' }, 403);
  if (!kind) return json({ error: 'bad_request' }, 400);

  // Maliyet koruması: dakika sınırı, IP ve genel günlük tavan (kullanıcı hakkından önce, ucuz kontrol).
  const g = await guard(req, userId, 'scan');
  if (!g.ok) return json({ error: g.error }, g.status);
  const { data: slot, error: slotErr } = await admin.rpc('scan_reserve', { p_user: userId, p_kind: kind });
  if (slotErr) { await g.release(); return json({ error: 'server' }, 500); }
  if (!slot.ok) { await g.release(); return json({ error: 'limit', premium: slot.premium, limit: slot.limit }, 429); }
  const release = async () => { await g.release(); await admin.rpc('scan_release', { p_user: userId, p_period: slot.period, p_kind: kind }); };

  try {
    const res = await anthropic.beta.messages.create({
      model: MODEL,
      // Düşünme payı dahil; JSON yarıda kesilmesin ama maliyet de sınırlı kalsın.
      max_tokens: 6000,
      // 'low' ürünleri ve kumaşları sık atlıyordu; tarama başına birkaç saniye daha uzun ama daha isabetli.
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA[kind] } },
      ...FALLBACK,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
          { type: 'text', text: withLang(kind === 'fridge' ? fridgePrompt(known) : lookPrompt(known), body.lang) },
        ],
      }],
    });
    const text = res.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('');
    const parsed = res.stop_reason === 'refusal' || res.stop_reason === 'max_tokens' ? null : parseJson(text);
    if (!parsed) {
      console.error('scan unreadable', res.stop_reason, text.slice(0, 200));
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
