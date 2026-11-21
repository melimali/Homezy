/**
 * Çalışma zamanı çevirisi (TR → EN). Uygulamadaki metinler Türkçe yazılı kalır;
 * dil İngilizce iken görünen her metin burada sözlükten çevrilir (src/i18n/en/*).
 * Anahtarda `{}` değişken yerini tutar: 'Tümü ({})' → 'All ({})'.
 * Sözlükte olmayan metin olduğu gibi (Türkçe) görünür.
 */
import { AR } from './ar';
import { DE } from './de';
import { EN } from './en';
import { ES } from './es';
import { FR } from './fr';
import { JA } from './ja';
import { KO } from './ko';
import { PT } from './pt';
import { EXTRA } from './extra';

/** Çevrilen arayüz dilleri; hepsi tek tabloda. Eksik anahtar İngilizceye düşer (Türkçe sızmaz). */
export type UiLang = 'tr' | 'en' | 'de' | 'es' | 'ja' | 'ko' | 'fr' | 'pt' | 'ar';
export const UI_LANGS: UiLang[] = ['tr', 'en', 'de', 'es', 'ja', 'ko', 'fr', 'pt', 'ar'];
/** Elle yazılmış iki dilli satır içi metinler: 'tr' ya da 'en' (Türkçe dışı hepsi 'en'). */
export type AppLang = 'tr' | 'en';
const DICTS: Record<Exclude<UiLang, 'tr' | 'en'>, Record<string, string>> = { de: DE, es: ES, ja: JA, ko: KO, fr: FR, pt: PT, ar: AR };
const LOCALE: Record<UiLang, string> = { tr: 'tr-TR', en: 'en-US', de: 'de-DE', es: 'es-ES', ja: 'ja-JP', ko: 'ko-KR', fr: 'fr-FR', pt: 'pt-BR', ar: 'ar-u-nu-latn' };

const toUi = (code: string | undefined | null): UiLang => {
  const c = (code ?? 'tr').toLowerCase().slice(0, 2);
  return (UI_LANGS as string[]).includes(c) ? (c as UiLang) : 'en';
};

/** Cihaz dili: desteklenen dillerden biri, değilse İngilizce. */
export function deviceUiLang(): UiLang {
  try {
    return toUi(Intl.DateTimeFormat().resolvedOptions().locale || 'tr');
  } catch {
    return 'tr';
  }
}
export const deviceLang = deviceUiLang;

let UI: UiLang = deviceUiLang();
let LANG: AppLang = UI === 'tr' ? 'tr' : 'en';
const listeners = new Set<() => void>();

/** Ayardaki dil kodunu çalışan dile çevirir; desteklenmeyen her şey İngilizce. */
let pending = false;
/** Render sırasında çağrılır: dili hemen uygular ama dinleyicilere haber vermez (render içinde setState olmaz). Haber efektteki setLang ile gider. */
export function applyLangQuiet(code: string | undefined) {
  const next = !code ? 'tr' : toUi(code);
  if (next === UI) return;
  UI = next;
  LANG = next === 'tr' ? 'tr' : 'en';
  cache.clear();
  pending = true;
}
export function setLang(code: string | undefined) {
  const next = !code ? 'tr' : toUi(code);
  if (next === UI && !pending) return;
  pending = false;
  UI = next;
  LANG = next === 'tr' ? 'tr' : 'en';
  cache.clear();
  listeners.forEach(l => l());
}
export const getLang = () => LANG;
/** Gerçek arayüz dili (sunucuya gönderilen dil budur). */
export const getUiLang = () => UI;
/** Türkçe dışı: satır içi metinlerde İngilizce yedek kullanılır. */
export const isEn = () => LANG === 'en';
export const isDe = () => UI === 'de';
export const isEs = () => UI === 'es';
export const isFr = () => UI === 'fr';
export const isPt = () => UI === 'pt';
export const isJa = () => UI === 'ja';
export const isKo = () => UI === 'ko';
export const isAr = () => UI === 'ar';
/** Yemek fiyatları TL tahminidir; diğer dillerde yaklaşık yerel para (40 TL = 1 $). */
export const tlText = (n: number) => {
  const usd = Math.max(1, Math.round(n / 40));
  switch (UI) {
    case 'tr': return `${n} TL`;
    case 'en': return `$${usd}`;
    case 'ar': return `${usd} $`;
    case 'ja': return `約${Math.max(10, Math.round((n * 4) / 10) * 10).toLocaleString('ja-JP')}円`;
    case 'ko': return `약 ${(Math.max(1, Math.round((n * 35) / 1000)) * 1000).toLocaleString('ko-KR')}원`;
    case 'pt': return `R$ ${Math.max(1, Math.round(n / 8))}`;
    default: return `${Math.max(1, Math.round(n / 45))} €`;
  }
};
/** Para birimi simgesi (kullanıcının yazdığı fiyatlar için). */
export const currencySym = () => ({ tr: '₺', en: '$', ar: '$', de: '€', es: '€', fr: '€', pt: 'R$', ja: '¥', ko: '₩' } as Record<UiLang, string>)[UI];
export const dateLocale = () => LOCALE[UI];
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
const tables: Partial<Record<UiLang, Table>> = {};
let exact: Table['exact'] = new Map();
let canon: Table['canon'] = new Map();
let patterns: Table['patterns'] = [];
/** Etkin dilin sözlük tablolarını (ilk kullanımda) kurar. */
function loadTables() {
  const L = UI === 'tr' ? 'en' : UI;
  const t = (tables[L] ??= buildTables(L === 'en' ? { ...EN, ...EXTRA.en } : { ...EN, ...DICTS[L], ...EXTRA[L] }));
  exact = t.exact; canon = t.canon; patterns = t.patterns;
}
function buildTables(dict: Record<string, string>) {
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

const cache = new Map<string, string>();

function matchPattern(s: string, depth: number): string | undefined {
  for (const p of patterns) {
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
  const hit = exact.get(n);
  if (hit !== undefined) return hit;
  const pat = matchPattern(n, depth);
  if (pat !== undefined) return pat;
  const { lead, core, trail } = split(s);
  if (!core) return undefined;
  const c = canon.get(lower(core));
  if (c !== undefined) return lead + (isUpper(core) ? c.toLocaleUpperCase(LOCALE[UI === 'tr' ? 'en' : UI]) : c) + trail;
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
  if (LANG === 'tr' || typeof s !== 'string') return s;
  const hit = cache.get(s);
  if (hit !== undefined) return hit as T;
  loadTables();
  const tr0 = translate(s);
  // Yüzde: İngilizce/Korece/Japonca/Arapça "50%", diğerleri "50 %".
  const spaced = UI === 'fr' || UI === 'de' || UI === 'es' || UI === 'pt';
  const r = tr0.replace(/(^|[^\w%])%(\d+(?:[.,]\d+)?)/g, spaced ? '$1$2 %' : '$1$2%');
  if (cache.size > 4000) cache.clear();
  cache.set(s, r);
  return r as T;
}
