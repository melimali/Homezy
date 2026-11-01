/**
 * Çalışma zamanı çevirisi (TR → EN). Uygulamadaki metinler Türkçe yazılı kalır;
 * dil İngilizce iken görünen her metin burada sözlükten çevrilir (src/i18n/en/*).
 * Anahtarda `{}` değişken yerini tutar: 'Tümü ({})' → 'All ({})'.
 * Sözlükte olmayan metin olduğu gibi (Türkçe) görünür.
 */
import { EN } from './en';

export type AppLang = 'tr' | 'en';
let LANG: AppLang = deviceLang();
const listeners = new Set<() => void>();

/** Cihaz dili Türkçe değilse İngilizce. */
export function deviceLang(): AppLang {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale || 'tr';
    return loc.toLowerCase().startsWith('tr') ? 'tr' : 'en';
  } catch {
    return 'tr';
  }
}

/** Ayardaki dil kodunu (tr, en ya da başka) çalışan dile çevirir: Türkçe dışı her şey İngilizce. */
export function setLang(code: string | undefined) {
  const next: AppLang = !code || code === 'tr' ? 'tr' : 'en';
  if (next === LANG) return;
  LANG = next;
  cache.clear();
  listeners.forEach(l => l());
}
export const getLang = () => LANG;
export const isEn = () => LANG === 'en';
export const dateLocale = () => (LANG === 'en' ? 'en-US' : 'tr-TR');
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
const exact = new Map<string, string>();
const canon = new Map<string, string>();
const patterns: { re: RegExp; out: string }[] = [];
for (const [k, v] of Object.entries(EN)) {
  if (k.includes('{}')) {
    patterns.push({ re: new RegExp('^' + esc(norm(k)).replace(/\{\}/g, '([^·\\n]+?)') + '$', 'i'), out: v });
  } else {
    exact.set(norm(k), v);
    const c = split(k).core;
    if (c) canon.set(lower(c), split(v).core || v);
  }
}
// Daha uzun (daha belirgin) kalıplar önce denensin.
patterns.sort((a, b) => b.re.source.length - a.re.source.length);

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
  if (c !== undefined) return lead + (isUpper(core) ? c.toLocaleUpperCase('en-US') : c) + trail;
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
  const r = translate(s);
  if (cache.size > 4000) cache.clear();
  cache.set(s, r);
  return r as T;
}
