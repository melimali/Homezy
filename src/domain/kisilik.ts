import type { ImageSourcePropType } from 'react-native';
/**
 * Moka Disiplin Testi (docs/moka-disiplin-testi.md): "Seni tanıyalım" ile tek akış.
 * Q8-Q17 disiplin soruları, 5 eksen, 8 tip. Telefonda hesaplanır, yapay zekâ yok.
 */
export type Axis = 'D' | 'B' | 'O' | 'Y' | 'G';
export type TypeId = 'planli' | 'atik' | 'sakin' | 'odakli' | 'dalgin' | 'hirsli' | 'tembel' | 'dengeli';
export type DOpt = { v: string; emoji: string; label: string; pts?: Partial<Record<Axis, number>> };
export type DQ = { k: string; q: string; hint: string; multi?: boolean; max?: number; opts: DOpt[] };

// Kısa test: 5 eksenin her biri için en bilgilendirici tek soru (D: plan, B: start, O: focus, Y: quit, G: drive).
export const DISC_QUESTIONS: DQ[] = [
  { k: 'plan', q: 'Planın nasıl olsun?', hint: 'Biçimini buna göre kurarım.', opts: [
    { v: 'detay', emoji: '📋', label: 'Saatlik detaylı program', pts: { D: 3 } }, { v: 'kisa', emoji: '✅', label: 'Kısa günlük liste', pts: { D: 1 } }, { v: 'esnek', emoji: '🌊', label: 'Esnek, ruhuma göre', pts: { D: -2 } },
  ] },
  { k: 'start', q: 'Bir işe nasıl başlarsın?', hint: 'Dürüst ol, yargılamam.', opts: [
    { v: 'hemen', emoji: '⚡', label: 'Hemen başlarım', pts: { B: 3 } }, { v: 'isinma', emoji: '☕', label: 'Isınmam gerekir' },
    { v: 'birazdan', emoji: '🐌', label: 'Hep "birazdan" derim', pts: { B: -3 } }, { v: 'birakamam', emoji: '🔥', label: 'Başlayınca bırakamam', pts: { B: 2 } },
  ] },
  { k: 'focus', q: 'Kesintisiz ne kadar odaklanırsın?', hint: 'Odak bloklarını buna göre kurarım.', opts: [
    { v: '10', emoji: '⏱️', label: '10 dk', pts: { O: -2 } }, { v: '25', emoji: '⏱️', label: '25 dk' }, { v: '45', emoji: '⏱️', label: '45 dk', pts: { O: 2 } }, { v: '90', emoji: '⏱️', label: '90 dk', pts: { O: 3 } },
  ] },
  { k: 'quit', q: 'Bir alışkanlığı en çok neden bırakırsın?', hint: 'Sana uygun desteği seçeyim.', opts: [
    { v: 'unutur', emoji: '🤷', label: 'Unutuyorum', pts: { Y: -1 } }, { v: 'yorulur', emoji: '😴', label: 'Yoruluyorum', pts: { Y: -1 } },
    { v: 'sikilir', emoji: '🥱', label: 'Sıkılıyorum', pts: { Y: -1 } }, { v: 'hepsi', emoji: '💥', label: 'Bir gün aksayınca hepsini bırakırım', pts: { Y: -3 } },
    { v: 'dikkat', emoji: '🎨', label: 'Dikkatim dağılıyor', pts: { O: -2 } },
  ] },
  { k: 'drive', q: 'Seni ne harekete geçirir?', hint: 'Moka seni buna göre motive eder.', opts: [
    { v: 'puan', emoji: '⭐', label: 'Puan ve seri', pts: { G: 1 } }, { v: 'soz', emoji: '🤝', label: 'Birine söz vermek', pts: { G: -1 } },
    { v: 'odul', emoji: '🎁', label: 'Ödül', pts: { G: -1 } }, { v: 'baski', emoji: '⏰', label: 'Son tarih / baskı' }, { v: 'hedef', emoji: '🎯', label: 'Kendi hedefim', pts: { G: 3 } },
  ] },
];

export type DiscAnswers = Partial<Record<string, string | string[]>>;
export type Axes = Record<Axis, number>;
export const AXIS_NAMES: Record<Axis, string> = { D: 'Düzen', B: 'Başlama', O: 'Odak', Y: 'Dayanıklılık', G: 'İçsel güdü' };

const clamp = (n: number) => Math.max(0, Math.min(10, n));

/** Eksenler: 5'ten başlar, cevap puanları eklenir, 0-10'a sıkışır. `style` "Evi nasıl tutarsın?" cevabı. */
export function axesOf(a: DiscAnswers, style?: string): Axes {
  const r: Axes = { D: 5, B: 5, O: 5, Y: 5, G: 5 };
  if (style === 'duzenli') r.D += 2;
  for (const q of DISC_QUESTIONS) {
    const v = a[q.k];
    if (typeof v !== 'string') continue;
    const pts = q.opts.find(o => o.v === v)?.pts;
    if (pts) (Object.keys(pts) as Axis[]).forEach(k => (r[k] += pts[k] ?? 0));
  }
  (Object.keys(r) as Axis[]).forEach(k => (r[k] = clamp(r[k])));
  return r;
}

/** Çakışmada: Dalgın > Hırslı > Planlı > Atik > Odaklı > Sakin > Tembel > Dengeli. */
const RULES: [TypeId, (x: Axes, a: DiscAnswers) => boolean][] = [
  ['dalgin', (x, a) => x.O <= 3 || a.quit === 'dikkat'],
  ['hirsli', (x, a) => a.quit === 'hepsi' && x.G <= 5],
  ['planli', x => x.D >= 7 && x.B >= 5],
  ['atik', x => x.B >= 7 && x.Y <= 5],
  ['odakli', x => x.O >= 7 && x.D >= 4],
  ['sakin', x => x.Y >= 7 && x.B <= 5],
  ['tembel', x => x.G >= 7 && x.D <= 5],
];

export function typeOf(x: Axes, a: DiscAnswers): TypeId {
  return RULES.find(([, f]) => f(x, a))?.[0] ?? 'dengeli';
}

/** Yan renk: tipin dışında kalan, ikinci en çok uyan tip. */
export function sideOf(x: Axes, a: DiscAnswers, main: TypeId): TypeId | null {
  const ids = RULES.filter(([id, f]) => id !== main && f(x, a)).map(([id]) => id);
  return ids[0] ?? null;
}

export const TYPES: Record<TypeId, { emoji: string; name: string; says: string; bg: string; img: ImageSourcePropType }> = {
  planli: { emoji: '📋', name: 'Planlı Moka', says: 'Senin için planı sen çizersin. Ben sadece saati tutarım.', bg: '#D9C2A9', img: require('../../assets/moka/tip/moka_planli.webp') },
  atik: { emoji: '⚡', name: 'Atik Moka', says: 'Hızlı başlarsın, güzel! Ben seni yolda tutarım.', bg: '#F6C99A', img: require('../../assets/moka/tip/moka_atik.webp') },
  sakin: { emoji: '🧊', name: 'Sakin Moka', says: 'Geç başlarsın ama bırakmazsın. Küçük adımlar sana yeter.', bg: '#BBD3E6', img: require('../../assets/moka/tip/moka_sakin.webp') },
  odakli: { emoji: '🎯', name: 'Odaklı Moka', says: 'Odaklanınca dağları aşarsın. Sana derin çalışma blokları kuruyorum.', bg: '#A9B5D0', img: require('../../assets/moka/tip/moka_odakli.webp') },
  dalgin: { emoji: '🎨', name: 'Dalgın Moka', says: 'Aklın çok yerde, bu güzel bir şey. Seni kısa turlarla toplayacağım.', bg: '#F2C6D3', img: require('../../assets/moka/tip/moka_dalgin.webp') },
  hirsli: { emoji: '🔥', name: 'Hırslı Moka', says: 'Ya hep ya hiç. Bir gün aksarsa dert değil, seri dondurma var.', bg: '#F0A98E', img: require('../../assets/moka/tip/moka_hirsli.webp') },
  tembel: { emoji: '🥛', name: 'Tembel Moka', says: 'Sana kimse baskı yapmasın. Esnek, kendi hızında bir plan yaptım.', bg: '#F1E4CE', img: require('../../assets/moka/tip/moka_tembel.webp') },
  dengeli: { emoji: '☕', name: 'Dengeli Moka', says: 'Her şeyden biraz. Birlikte neyin sana uyduğunu bulacağız.', bg: '#CFE5D4', img: require('../../assets/moka/tip/moka_dengeli.webp') },
};

export const TYPE_ORDER: TypeId[] = ['planli', 'atik', 'sakin', 'odakli', 'dalgin', 'hirsli', 'tembel', 'dengeli'];

/** "Mola anı" cevabına göre sabah özeti / hatırlatma saati. */
export const CUE_TIME: Record<string, string> = { kahve: '08:30', is: '18:00', yemek: '20:30', yatak: '22:00' };
export const CUE_LABEL: Record<string, string> = { kahve: 'sabah kahvesiyle', is: 'işten sonra', yemek: 'akşam yemeğinden sonra', yatak: 'yatmadan önce' };
/** "Neden" cevabı, Moka'nın hatırlatırken kullandığı cümle. */
export const WHY_LINE: Record<string, string> = {
  sakin: 'sakin bir ev istiyordun 🌿', stres: 'daha az stres istiyordun 😮‍💨', gurur: 'kendinle gurur duymak istiyordun 💪',
  aile: 'ailen için buradasın 👨‍👩‍👧', duzen: 'düzen istiyordun ✨',
};
