/**
 * Çalışma zamanı çevirisi (TR → EN). Uygulamadaki metinler Türkçe yazılı kalır;
 * dil İngilizce iken görünen her metin burada sözlükten çevrilir (src/i18n/en/*).
 * Anahtarda `{}` değişken yerini tutar: 'Tümü ({})' → 'All ({})'.
 * Sözlükte olmayan metin olduğu gibi (Türkçe) görünür.
 */
import { EN } from './en';
import { ES } from './es';

/** Uygulamada elle yazılmış iki dilli metinler ('tr' | 'en'); İspanyolca gibi ek diller burada İngilizceye düşer. */
export type AppLang = 'tr' | 'en';
/** Sözlükle çevrilen gerçek arayüz dili. */
export type UiLang = 'tr' | 'en' | 'es';
let UI: UiLang = deviceUiLang();
let LANG: AppLang = UI === 'tr' ? 'tr' : 'en';
const listeners = new Set<() => void>();

/** Cihaz dili: Türkçe ve İspanyolca desteklenir, geri kalan her şey İngilizce. */
export function deviceUiLang(): UiLang {
  try {
    const loc = (Intl.DateTimeFormat().resolvedOptions().locale || 'tr').toLowerCase();
    if (loc.startsWith('tr')) return 'tr';
    if (loc.startsWith('es')) return 'es';
    return 'en';
  } catch {
    return 'tr';
  }
}
/** Cihaz dili Türkçe değilse İngilizce (ayar kodu: 'tr' | 'en' | 'es'). */
export function deviceLang(): UiLang {
  return deviceUiLang();
}

/** Ayardaki dil kodunu (tr, en, es ya da başka) çalışan dile çevirir: desteklenmeyen her şey İngilizce. */
export function setLang(code: string | undefined) {
  const nextUi: UiLang = !code || code === 'tr' ? 'tr' : code === 'es' ? 'es' : 'en';
  if (nextUi === UI) return;
  UI = nextUi;
  LANG = nextUi === 'tr' ? 'tr' : 'en';
  cache.clear();
  listeners.forEach(l => l());
}
export const getLang = () => LANG;
/** Gerçek arayüz dili ('es' dahil); sunucuya gönderilen dil budur. */
export const getUiLang = () => UI;
export const isEn = () => LANG === 'en';
/** Yemek fiyatları TL tahminidir; İngilizcede yaklaşık dolar (40 TL = 1 $) gösterilir. */
export const tlText = (n: number) => (LANG === 'en' ? `$${Math.max(1, Math.round(n / 40))}` : `${n} TL`);
export const dateLocale = () => (UI === 'es' ? 'es-ES' : LANG === 'en' ? 'en-US' : 'tr-TR');
export const onLangChange = (fn: () => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};

const esc = (s: string) => s.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
/** Karşılaştırma için: kıvrık tırnak, üç nokta ve büyük/küçük harf farkını yok say. */
const norm = (s: string) => s.replace(/[’‘]/g, "'").replace(/\.\.\./g, '…').replace(/[“”]/g, '"');
const lower = (s: string) => norm(s).toLocaleLowerCase('tr-TR');
// Baştaki emoji/işaret ve sondaki noktalama dışarıda bırakılır ("‹ Geri", "İyi geceler!", "🧹 Süpür").
const LEAD = /^[^\p{L}\p{N}{]+/u;
const TRAIL = /[^\p{L}\p{N}}]+$/u;
const split = (s: string) => {
  const lead = LEAD.exec(s)?.[0] ?? '';
  const rest = s.slice(lead.length);
  const trail = TRAIL.exec(rest)?.[0] ?? '';
  return { lead, core: rest.slice(0, rest.length - trail.length), trail };
};
type Table = { exact: Map<string, string>; canon: Map<string, string>; patterns: { re: RegExp; out: string; lit: number }[] };
function build(dict: Record<string, string>): Table {
const exact = new Map<string, string>();
const canon = new Map<string, string>();
const patterns: { re: RegExp; out: string; lit: number }[] = [];
for (const [k0, v0] of Object.entries(dict)) {
  // Baştaki/sondaki boşluk eşleşmeyi bozmasın: çeviri çekirdek metin üzerinden aranır.
  const k = k0.trim() || k0;
  const v = k === k0 ? v0 : v0.trim();
  if (k.includes('{}')) {
    // Sondaki {} boş kalabilir ("... blok" + boş ek).
    const body = esc(norm(k));
    const tail = body.endsWith('{}');
    const head = tail ? body.slice(0, -2) : body;
    // Harfe bitişik {} ("iş{}") bir ek yuvasıdır; harfle başlayan metin ("işaretlersin") eşleşmesin.
    const LETTER = 'A-Za-zÇĞİÖŞÜçğıöşü';
    const isSlot = (before: string) => new RegExp('[' + LETTER + ']$').test(before);
    const slot = (before: string) => (isSlot(before) ? '(?![' + LETTER + '])' : '');
    // Ek yuvası boş olabilir ("{} iş bitti{}." + "3 iş bitti."), diğer {} en az bir karakter ister.
    const headRe = head.split('{}').map((part, i, arr) => (i < arr.length - 1 ? part + slot(part) + (isSlot(part) ? '([^\\n]*?)' : '([^·\\n]+?)') : part)).join('');
    const tailRe = tail ? slot(head) + '([^·\\n]*?)' : '';
    patterns.push({ re: new RegExp('^' + headRe + tailRe + '$', 'i'), out: v, lit: k.split('{}').join('').length });
  } else {
    exact.set(norm(k), v);
    const c = split(k).core;
    if (c) canon.set(lower(c), split(v).core || v);
  }
}
// Sabit metni daha uzun (daha belirgin) kalıplar önce denensin; yakalama grupları sayılmaz.
patterns.sort((a, b) => b.lit - a.lit);
return { exact, canon, patterns };
}
const TABLES: Partial<Record<'en' | 'es', Table>> = {};
/** Geçerli arayüz diline ait sözlük tablosu; ilk kullanımda kurulur. */
const T = (): Table => {
  const k = UI === 'es' ? 'es' : 'en';
  return (TABLES[k] ??= build(k === 'es' ? ES : EN));
};

const cache = new Map<string, string>();

function matchPattern(s: string, depth: number): string | undefined {
  for (const p of T().patterns) {
    const m = p.re.exec(s);
    if (m) {
      let i = 1;
      return p.out.replace(/\{\}/g, () => {
        const part = m[i++] ?? '';
        return depth < 3 ? translate(part, depth + 1) : part;
      });
    }
  }
  return undefined;
}

const isUpper = (s: string) => s === s.toLocaleUpperCase('tr-TR') && s !== s.toLocaleLowerCase('tr-TR');

function direct(s: string, depth: number): string | undefined {
  const n = norm(s);
  const hit = T().exact.get(n);
  if (hit !== undefined) return hit;
  const pat = matchPattern(n, depth);
  if (pat !== undefined) return pat;
  const { lead, core, trail } = split(s);
  if (!core) return undefined;
  const c = T().canon.get(lower(core));
  if (c !== undefined) return lead + (isUpper(core) ? c.toLocaleUpperCase(UI === 'es' ? 'es-ES' : 'en-US') : c) + trail;
  if (lead || trail) {
    const p2 = matchPattern(norm(core), depth);
    if (p2 !== undefined) return lead + p2 + trail;
  }
  return undefined;
}

function translate(s: string, depth = 0): string {
  if (!s) return s;
  const lead = /^\s*/.exec(s)![0];
  const trail = /\s*$/.exec(s)![0];
  const core = s.trim();
  if (!core) return s;
  let r = direct(core, depth);
  if (r === undefined) {
    // Cümle ve parça parça dene: "A. B" / "A · B" / "A! B" / satırlar.
    const parts = core.split(/(\n+| · |[.!?…] | — |: |, )/);
    if (parts.length > 1) {
      let changed = false;
      const out = parts.map((p, i) => {
        if (i % 2 === 1 || !p) return p;
        const tr = direct(p, depth) ?? direct(p + '.', depth)?.replace(/\.$/, '');
        if (tr !== undefined) { changed = true; return tr; }
        return p;
      });
      if (changed) r = out.join('');
    }
  }
  return r === undefined ? s : lead + r + trail;
}

/** Metni geçerli dile çevirir. Türkçe iken olduğu gibi döner. */
export function tx<T>(s: T): T {
  if (LANG !== 'en' || typeof s !== 'string') return s;
  const hit = cache.get(s);
  if (hit !== undefined) return hit as T;
  // İngilizcede yüzde sayıdan sonra yazılır (%50 → 50%), İspanyolcada boşlukla (50 %).
  const r = translate(s).replace(/(^|[^\w%])%(\d+(?:[.,]\d+)?)/g, UI === 'es' ? '$1$2 %' : '$1$2%');
  if (cache.size > 4000) cache.clear();
  cache.set(s, r);
  return r as T;
}
