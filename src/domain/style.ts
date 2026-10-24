import type { Cloth } from './types';

/**
 * Kombin kuralları (prototipteki KINDS, FABRICS, COLORS, NEUTRAL, FABRIC_RULES, judge(), suggest()).
 * Yapay zekâ kullanmaz, internetsiz çalışır. Fotoğraf taraması parçanın türünü, rengini ve kumaşını
 * yazar; elle eklenen ya da eski parçalarda bunlar addan tahmin edilir (`att()`).
 * Tür, renk ve kumaş adları sunucudaki istemde de var (supabase/functions/scan): birini değiştirirsen ikisini de değiştir.
 */

/** f: stil aralığı, 1 spor · 2 günlük · 3 şık · 4 resmi. fab: addan anlaşılmazsa varsayılan kumaş. */
export const KINDS: Record<string, { cat: string; f?: [number, number]; fab: string | null }> = {
  'Tişört': { cat: 'Üst', f: [1, 2], fab: 'Pamuk' }, 'Polo': { cat: 'Üst', f: [2, 3], fab: 'Pamuk' },
  'Gömlek': { cat: 'Üst', f: [2, 4], fab: 'Pamuk' }, 'Bluz': { cat: 'Üst', f: [2, 3], fab: 'Viskon' },
  'Kazak': { cat: 'Üst', f: [2, 3], fab: 'Triko' }, 'Sweatshirt': { cat: 'Üst', f: [1, 2], fab: 'Pamuk' },
  'Kot pantolon': { cat: 'Alt', f: [1, 3], fab: 'Kot' }, 'Kumaş pantolon': { cat: 'Alt', f: [3, 4], fab: 'Yün' },
  'Chino': { cat: 'Alt', f: [2, 3], fab: 'Pamuk' }, 'Eşofman altı': { cat: 'Alt', f: [1, 1], fab: 'Teknik / Spor' },
  'Şort': { cat: 'Alt', f: [1, 2], fab: 'Pamuk' }, 'Etek': { cat: 'Alt', f: [2, 3], fab: 'Viskon' },
  'Elbise': { cat: 'Elbise / Takım', f: [2, 4], fab: 'Viskon' }, 'Takım elbise': { cat: 'Elbise / Takım', f: [4, 4], fab: 'Yün' },
  'Ceket': { cat: 'Dış giyim', f: [3, 4], fab: 'Yün' }, 'Deri ceket': { cat: 'Dış giyim', f: [2, 3], fab: 'Deri' },
  'Kot ceket': { cat: 'Dış giyim', f: [1, 2], fab: 'Kot' }, 'Mont': { cat: 'Dış giyim', f: [1, 2], fab: 'Polyester' },
  'Kaban': { cat: 'Dış giyim', f: [2, 4], fab: 'Yün' }, 'Trençkot': { cat: 'Dış giyim', f: [3, 4], fab: 'Pamuk' },
  'Spor ayakkabı': { cat: 'Ayakkabı', f: [1, 3], fab: 'Deri' }, 'Loafer': { cat: 'Ayakkabı', f: [2, 4], fab: 'Süet' },
  'Klasik ayakkabı': { cat: 'Ayakkabı', f: [3, 4], fab: 'Deri' }, 'Bot': { cat: 'Ayakkabı', f: [2, 3], fab: 'Deri' },
  'Sandalet': { cat: 'Ayakkabı', f: [1, 2], fab: 'Deri' }, 'Topuklu ayakkabı': { cat: 'Ayakkabı', f: [3, 4], fab: 'Deri' },
  'Pijama': { cat: 'Ev / Pijama', fab: 'Pamuk' }, 'İç giyim': { cat: 'İç giyim', fab: 'Pamuk' }, 'Aksesuar': { cat: 'Aksesuar', fab: null },
};

type Slot = 'top' | 'bottom' | 'dress' | 'outer' | 'shoes';
const SLOT: Record<string, Slot> = { 'Üst': 'top', 'Alt': 'bottom', 'Elbise / Takım': 'dress', 'Dış giyim': 'outer', 'Ayakkabı': 'shoes' };

type Season = 'yaz' | 'kış' | 'geçiş';
/** s: kumaşın mevsimi ('her' = her mevsim). w: kalınlık, 1 ince … 4 kalın. */
export const FABRICS: Record<string, { s: Season | 'her'; w: number }> = {
  'Pamuk': { s: 'her', w: 2 }, 'Keten': { s: 'yaz', w: 1 }, 'Viskon': { s: 'yaz', w: 1 }, 'İpek / Saten': { s: 'her', w: 1 },
  'Kot': { s: 'her', w: 3 }, 'Yün': { s: 'kış', w: 4 }, 'Triko': { s: 'kış', w: 3 }, 'Kaşmir': { s: 'kış', w: 3 },
  'Kadife': { s: 'kış', w: 4 }, 'Polar': { s: 'kış', w: 3 }, 'Polyester': { s: 'her', w: 2 }, 'Teknik / Spor': { s: 'her', w: 2 },
  'Deri': { s: 'her', w: 4 }, 'Süet': { s: 'geçiş', w: 3 }, 'Kanvas': { s: 'her', w: 2 },
};

export const COLORS: Record<string, string> = {
  'siyah': '#1E1F22', 'antrasit': '#3A3D42', 'gri': '#8D8F93', 'beyaz': '#F4F4F0', 'krem': '#EEE5D0', 'bej': '#D6C4A4',
  'camel': '#B88A55', 'taba': '#A0612F', 'kahverengi': '#6B4A32', 'lacivert': '#1F2A44', 'kot mavisi': '#4A6A8C',
  'mavi': '#3D6FB0', 'açık mavi': '#9EC3E4', 'turkuaz': '#2FA4A8', 'yeşil': '#3F7D4E', 'mint': '#A9D9C2',
  'haki': '#7C7A4F', 'zeytin yeşili': '#5F6236', 'sarı': '#E5C53C', 'hardal': '#C79C24', 'turuncu': '#E07B39',
  'kırmızı': '#B5302F', 'bordo': '#6D1F2A', 'pembe': '#E7A1B0', 'pudra': '#E4C3BC', 'lila': '#B9A3D0', 'mor': '#6B4C8A',
};
/** Kombinde nötr sayılan renkler: hemen her şeyle gider. */
const NEUTRAL = new Set(['siyah', 'antrasit', 'gri', 'beyaz', 'krem', 'bej', 'camel', 'taba', 'kahverengi', 'lacivert', 'kot mavisi', 'haki']);

const KIND_WORDS: [string, string][] = [['pijama', 'Pijama'], ['deri ceket', 'Deri ceket'], ['kot ceket', 'Kot ceket'], ['takım elbise', 'Takım elbise'], ['kumaş pantolon', 'Kumaş pantolon'],
  ['kot pantolon', 'Kot pantolon'], ['eşofman', 'Eşofman altı'], ['spor ayakkabı', 'Spor ayakkabı'], ['sneaker', 'Spor ayakkabı'], ['klasik ayakkabı', 'Klasik ayakkabı'],
  ['topuklu', 'Topuklu ayakkabı'], ['loafer', 'Loafer'], ['makosen', 'Loafer'], ['sandalet', 'Sandalet'], ['terlik', 'Sandalet'], ['bot', 'Bot'], ['çizme', 'Bot'],
  ['tişört', 'Tişört'], ['t-shirt', 'Tişört'], ['atlet', 'Tişört'], ['polo', 'Polo'], ['gömlek', 'Gömlek'], ['bluz', 'Bluz'], ['kazak', 'Kazak'], ['süveter', 'Kazak'],
  ['hırka', 'Kazak'], ['sweat', 'Sweatshirt'], ['hoodie', 'Sweatshirt'], ['chino', 'Chino'], ['jean', 'Kot pantolon'], ['kot', 'Kot pantolon'], ['pantolon', 'Kumaş pantolon'],
  ['şort', 'Şort'], ['etek', 'Etek'], ['elbise', 'Elbise'], ['takım', 'Takım elbise'], ['blazer', 'Ceket'], ['ceket', 'Ceket'], ['mont', 'Mont'], ['kaban', 'Kaban'],
  ['palto', 'Kaban'], ['trenç', 'Trençkot'], ['ayakkabı', 'Spor ayakkabı'], ['çorap', 'İç giyim'], ['kemer', 'Aksesuar'], ['şapka', 'Aksesuar'], ['atkı', 'Aksesuar']];
const FABRIC_WORDS: [string, string][] = [['keten', 'Keten'], ['denim', 'Kot'], ['kot', 'Kot'], ['jean', 'Kot'], ['yün', 'Yün'], ['kaşe', 'Yün'], ['triko', 'Triko'], ['örgü', 'Triko'],
  ['kaşmir', 'Kaşmir'], ['kadife', 'Kadife'], ['ipek', 'İpek / Saten'], ['saten', 'İpek / Saten'], ['viskon', 'Viskon'], ['polyester', 'Polyester'], ['spor', 'Teknik / Spor'],
  ['deri', 'Deri'], ['süet', 'Süet'], ['polar', 'Polar'], ['pamuk', 'Pamuk'], ['kanvas', 'Kanvas']];
const COLOR_WORDS = ([...Object.keys(COLORS).map(k => [k, k]), ['kahve', 'kahverengi'], ['ekru', 'krem'], ['füme', 'antrasit'], ['bordó', 'bordo']] as [string, string][])
  .sort((a, b) => b[0].length - a[0].length);

export type Occasion = 'gunluk' | 'sik' | 'spor';
export const OCC: Record<Occasion, { label: string; f: [number, number] }> = {
  gunluk: { label: 'Günlük', f: [2, 2] }, sik: { label: 'Şık', f: [3, 4] }, spor: { label: 'Spor', f: [1, 1] },
};
export const OCCASIONS = Object.keys(OCC) as Occasion[];
export const SEASON_NAME: Record<Season, string> = { yaz: 'yaz', kış: 'kış', geçiş: 'bahar / sonbahar' };

const low = (s: string | null | undefined) => String(s ?? '').toLocaleLowerCase('tr-TR').trim();
export const cap = (s: string | null | undefined) => (s ? s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1) : '');
const findWord = (list: [string, string][], name: string) => {
  const n = low(name);
  return list.find(([w]) => n.includes(w))?.[1] ?? null;
};
export const guessKind = (name: string) => findWord(KIND_WORDS, name);
export const guessColor = (name: string) => findWord(COLOR_WORDS, name);
export function guessFabric(name: string, kind: string | null) {
  const words = FABRIC_WORDS.filter(([w]) => !(w === 'spor' && kind && KINDS[kind].cat === 'Ayakkabı'));
  return findWord(words, name) || (kind && KINDS[kind].fab) || null;
}
/** Model "Lacivert", "lacivert " gibi yazabilir; listedeki ada indirir. */
export const toColor = (v: unknown) => (typeof v === 'string' && COLORS[low(v)] ? low(v) : null);
export const toKind = (v: unknown) => (typeof v === 'string' && KINDS[v] ? v : null);
export const toFabric = (v: unknown) => (typeof v === 'string' && FABRICS[v] ? v : null);
export const toHex = (v: unknown) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : null);

export function season(now = Date.now()): Season {
  const m = new Date(now).getMonth();
  return m >= 5 && m <= 8 ? 'yaz' : m === 11 || m <= 1 ? 'kış' : 'geçiş';
}

function hsl(hex: string) {
  const n = parseInt(hex.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = 60 * (mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4);
    if (h < 0) h += 360;
  }
  return { h, s, l };
}
const hueGap = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/** Bir parçanın kombin için gereken bütün bilgisi; saklanmayanlar addan tahmin edilir. */
export type Att = {
  id: string; name: string; state: Cloth['state']; kind: string | null; cat: string; slot: Slot | null; f: [number, number];
  color: string | null; hex: string | null; neutral: boolean; l: number; h: number;
  fabric: string | null; fab: { s: Season | 'her'; w: number }; pattern: 'düz' | 'desenli';
};

export function att(c: Cloth): Att {
  const kind = toKind(c.kind) || guessKind(c.name);
  const k = kind ? KINDS[kind] : null;
  const cat = k ? k.cat : c.cat;
  const color = toColor(c.color) || guessColor(c.name);
  const hex = toHex(c.hex) || (color && COLORS[color]) || null;
  const fabric = toFabric(c.fabric) || guessFabric(c.name, kind);
  const hs = hex ? hsl(hex) : null;
  return {
    id: c.id, name: c.name, state: c.state, kind, cat, slot: k?.f ? SLOT[cat] ?? null : null, f: k?.f ?? [1, 4],
    color, hex, neutral: color ? NEUTRAL.has(color) : hs ? hs.s < 0.18 : true, l: hs ? hs.l : 0.5, h: hs ? hs.h : 0,
    fabric, fab: (fabric && FABRICS[fabric]) || { s: 'her', w: 2 }, pattern: c.pattern === 'desenli' ? 'desenli' : 'düz',
  };
}
export const attLine = (a: Pick<Att, 'kind' | 'color' | 'fabric'>) => [a.kind || 'Tür belirsiz', cap(a.color), a.fabric || ''].filter(Boolean).join(' · ');

type Slots = Partial<Record<Slot, Att>>;
const isK = (p: Att | undefined, ...k: string[]) => !!p && !!p.kind && k.includes(p.kind);
const isF = (p: Att | undefined, ...f: string[]) => !!p && !!p.fabric && f.includes(p.fabric);
type Rule = (s: Slots) => [number, string] | null | false;
/** Kumaş eşleşmeleri: her kural kombinin yuvalarına bakar, uyuyorsa [puan, gerekçe] döner. */
const FABRIC_RULES: Rule[] = [
  ({ top, bottom }) => isF(top, 'Keten') && (isK(bottom, 'Chino', 'Şort') || isF(bottom, 'Keten')) && [2, 'Keten üst, chino ya da şort gibi hafif bir altla nefes alır.'],
  ({ top, bottom }) => isK(top, 'Kazak') && isF(top, 'Yün', 'Triko', 'Kaşmir') && isK(bottom, 'Kot pantolon', 'Chino', 'Kumaş pantolon') && [2, 'Kalın örgü kazak, sağlam dokulu bir pantolonla dengeli durur.'],
  ({ top, bottom }) => isK(top, 'Kazak') && (isK(bottom, 'Şort') || isF(bottom, 'Keten', 'Viskon')) && [-2, 'Kalın kazak ince ya da kısa bir altla dengesiz kalır.'],
  ({ top, bottom }) => isF(top, 'İpek / Saten') && isK(bottom, 'Kumaş pantolon', 'Etek', 'Kot pantolon') && [2, 'Saten üstün parlaklığı mat bir altla dengelenir.'],
  ({ top, bottom }) => isF(top, 'İpek / Saten') && isK(bottom, 'Eşofman altı') && [-3, 'Saten üst eşofmanla bir arada durmaz.'],
  ({ top, bottom, shoes }) => (isF(top, 'Teknik / Spor') || isK(bottom, 'Eşofman altı')) && isK(shoes, 'Klasik ayakkabı', 'Loafer', 'Topuklu ayakkabı') && [-3, 'Spor kumaşla klasik ayakkabı çatışır, spor ayakkabı seç.'],
  ({ top, outer, bottom }) => {
    const up = [top, outer].find(p => isF(p, 'Kot'));
    if (!up || !bottom || !isF(bottom, 'Kot')) return null;
    return up.color === bottom.color ? [-1, 'Üstte ve altta aynı ton kot tek parça gibi durur, tonlar ayrışsın.'] : [1, 'Farklı tonlarda kot üstüne kot bilinçli bir seçim gibi durur.'];
  },
  ({ outer, top, bottom }) => isK(outer, 'Deri ceket') && isK(top, 'Tişört', 'Sweatshirt') && isK(bottom, 'Kot pantolon', 'Chino') && [2, 'Deri ceket, rahat bir üst ve kot: zamansız bir üçlü.'],
  ({ outer, top, bottom }) => isK(outer, 'Ceket') && isK(top, 'Tişört', 'Polo') && isK(bottom, 'Kot pantolon', 'Chino') && [1, 'Ceketin altına tişört, şık ama rahat bir denge kurar.'],
  ({ outer, top }) => !!outer && !!top && outer.fab.w < top.fab.w && [-1, `${outer.name} alttaki ${low(top.name)} parçadan ince, kalın olanı dışa al.`],
  ({ dress, top }) => isK(dress, 'Takım elbise') && isK(top, 'Gömlek') && [2, 'Takımın altına gömlek, klasik ve derli toplu.'],
];

export type Why = { d: number; t: string };
export type Look = { ps: Att[]; score: number; why: Why[] };

/** Bir kombini puanlar: renk uyumu, açık-koyu kontrastı, desen, stil seviyesi, kumaş ve mevsim. */
export function judge(ps: Att[], occ: Occasion, now = Date.now()): Look {
  const why: Why[] = [];
  const add = (d: number, t: string) => why.push({ d, t });
  const s: Slots = {};
  for (const p of ps) if (p.slot) s[p.slot] = p;
  const { top, bottom, dress, outer, shoes } = s;
  const sea = season(now);
  // Renk uyumu: nötr olmayan ayrı tonları say.
  const loud: Att[] = [];
  for (const p of ps) if (!p.neutral && p.hex && !loud.some(q => hueGap(q.h, p.h) < 25)) loud.push(p);
  if (!loud.length) add(1, 'Nötr renkler: kolay ve dengeli. Canlı bir aksesuar iyi gider.');
  else if (loud.length === 1) add(2, `${cap(loud[0].color || 'renkli parça')} tek vurgu rengi, gerisi nötr: dengeli.`);
  else if (loud.length === 2) {
    const g = hueGap(loud[0].h, loud[1].h), a = cap(loud[0].color || 'bir renk'), b = loud[1].color || 'diğer renk';
    if (g < 40) add(2, `${a} ve ${b} komşu tonlar, birbirini yumuşakça tamamlıyor.`);
    else if (g >= 140) add(2, `${a} ile ${b} karşıt renkler: cesur ama uyumlu bir kontrast.`);
    else add(-1, `${a} ile ${b} arasında uyum zayıf, birini nötr bir parçayla değiştir.`);
  } else add(-2, 'Üç canlı renk kalabalık durur, birini nötre çevir.');
  // Üst yarı ile alt yarı arasında açık-koyu kontrastı.
  const up = top || dress, down = dress && !top ? null : bottom;
  if (up && down) {
    const dl = up.l - down.l;
    if (Math.abs(dl) >= 0.35) add(1, dl > 0 ? 'Açık üst, koyu alt: net bir kontrast.' : 'Koyu üst, açık alt: dikkat çeken bir kontrast.');
    else if (up.color && up.color === down.color) add(-1, 'Üst ve alt aynı ton, arada kontrast olmadığı için tek parça gibi durur.');
  }
  const names = new Set(ps.map(p => p.color));
  if (names.has('siyah') && names.has('lacivert')) add(-1, 'Siyah ile lacivert yan yana birbirine karışır, arada açık bir parça iyi olur.');
  if (shoes?.color && ps.some(p => p !== shoes && p.color === shoes.color)) add(1, `Ayakkabı, kombindeki ${shoes.color} parçayla bağ kuruyor.`);
  if (ps.filter(p => p.pattern === 'desenli').length > 1) add(-2, 'İki desenli parça birbiriyle yarışır, birini düz seç.');
  // Stil seviyesi: bütün parçaların aralığı kesişmeli.
  const lo = Math.max(...ps.map(p => p.f[0])), hi = Math.min(...ps.map(p => p.f[1]));
  if (lo > hi) {
    const casual = ps.reduce((a, b) => (b.f[1] < a.f[1] ? b : a)), formal = ps.reduce((a, b) => (b.f[0] > a.f[0] ? b : a));
    add(-2 * (lo - hi), `${casual.name} fazla rahat, ${low(formal.name)} fazla resmi; stilleri tutmuyor.`);
  } else {
    const [a, b] = OCC[occ].f;
    if (Math.max(lo, a) <= Math.min(hi, b)) add(2, { gunluk: 'Günlük bir gün için rahat ve derli toplu.', sik: 'Şık bir ortama uygun.', spor: 'Hareketli bir gün için rahat.' }[occ]);
    else if (hi < a) add(-3, `${OCC[occ].label} bir ortam için fazla rahat.`);
    else add(-3, `${OCC[occ].label} bir gün için fazla resmi.`);
  }
  // Kumaş eşleşmeleri ve mevsim.
  for (const rule of FABRIC_RULES) {
    const r = rule(s);
    if (r && r[0]) add(r[0], r[1]);
  }
  const summer = ps.filter(p => p.fab.s === 'yaz' && p.slot !== 'shoes');
  const winter = ps.filter(p => ['Kadife', 'Polar', 'Triko', 'Kaşmir'].includes(p.fabric ?? '') || (p.fabric === 'Yün' && (p.slot === 'top' || p.slot === 'outer')));
  if (summer.length && winter.length) add(-2, `${summer[0].fabric} yazlık, ${low(winter[0].fabric)} kışlık; aynı kombinde mevsim karışıyor.`);
  if (sea === 'yaz') {
    const w = ps.find(p => p.fab.s === 'kış' && !isK(p, 'Kumaş pantolon', 'Takım elbise'));
    if (w) add(-2, `${w.name} yaz için kalın kalır.`);
  }
  if (sea === 'kış') {
    if (!outer) add(-1, 'Kışın üstüne bir kaban ya da mont al.');
    if (summer.length && !outer) add(-1, `${summer[0].fabric} kışın serin kalır.`);
  }
  const score = why.reduce((n, x) => n + x.d, 0);
  return { ps, score, why: why.sort((a, b) => b.d - a.d) };
}

/** Fotoğraftaki kombini en çok uyduğu ortama göre puanlar (alttaki ortam seçiminden bağımsız). */
export function judgeBest(ps: Att[], now = Date.now()): Look & { occ: Occasion } {
  return OCCASIONS.map(occ => ({ ...judge(ps, occ, now), occ })).sort((a, b) => b.score - a.score)[0];
}

export type Fit = 'ok' | 'today' | 'late';
export const fitLabel = (n: number): [Fit, string] => (n >= 6 ? ['ok', 'Çok uyumlu'] : n >= 3 ? ['ok', 'Uyumlu'] : n >= 0 ? ['today', 'Denenebilir'] : ['late', 'Uyumsuz']);

/**
 * Temiz parçalardan üst + alt (ya da elbise / takım) + ayakkabı (+ dış giyim) kombinlerini kurar,
 * puanlar ve çeşitli en iyi birkaçını seçer. `anchors` verilirse her kombinde en az biri olur, gerisi dolaptan.
 * `skipAllAnchored`: kombinin tamamı seçili parçalardan oluşmasın (fotoğraftaki kombinin aynısı önerilmesin).
 */
export function suggest(wardrobe: Cloth[], occ: Occasion, anchors: string[] = [], skipAllAnchored = false, now = Date.now(), max = 9): Look[] {
  const an = new Set(anchors);
  const pool = wardrobe.map(att).filter(p => p.slot && (p.state === 'temiz' || an.has(p.id)));
  const of = (slot: Slot, n: number) => {
    const a = pool.filter(p => p.slot === slot);
    return [...a.filter(p => an.has(p.id)), ...a.filter(p => !an.has(p.id))].slice(0, n);
  };
  const tops = of('top', 20), bottoms = of('bottom', 16), dresses = of('dress', 10), shoes = of('shoes', 10);
  const outers = season(now) === 'yaz' ? [] : of('outer', 8);
  const bases: Att[][] = [];
  for (const t of tops) for (const b of bottoms) bases.push([t, b]);
  for (const d of dresses) {
    if (d.kind === 'Takım elbise') tops.filter(t => isK(t, 'Gömlek', 'Tişört', 'Kazak', 'Polo')).forEach(t => bases.push([d, t]));
    else bases.push([d]);
  }
  const all: Look[] = [];
  for (const base of bases) for (const sh of shoes) for (const o of [null, ...outers]) {
    const ps = o ? [...base, o, sh] : [...base, sh];
    if (an.size) {
      const k = ps.filter(p => an.has(p.id)).length;
      if (!k || (skipAllAnchored && k === ps.length)) continue;
    }
    all.push(judge(ps, occ, now));
  }
  all.sort((a, b) => b.score - a.score);
  // Açgözlü seçim: önceki bir öneride kullanılan parça puan kaybettirir, liste aynı kazağı tekrarlamasın.
  const picked: Look[] = [], uses = new Map<string, number>();
  const free = (o: Look) => o.ps.filter(p => !an.has(p.id));
  const overlap = (a: Look, b: Look) => free(a).filter(p => b.ps.some(q => q.id === p.id)).length;
  let cand = all.filter(o => o.score >= 0).slice(0, 600);
  while (picked.length < max && cand.length) {
    let best = cand[0], bv = -Infinity;
    for (const o of cand) {
      const v = o.score - 1.5 * free(o).reduce((n, p) => n + (uses.get(p.id) || 0), 0);
      if (v > bv) {
        bv = v;
        best = o;
      }
    }
    picked.push(best);
    best.ps.forEach(p => uses.set(p.id, (uses.get(p.id) || 0) + 1));
    cand = cand.filter(o => o !== best && !picked.some(q => overlap(o, q) >= Math.max(1, free(o).length - 1)));
  }
  return picked;
}
