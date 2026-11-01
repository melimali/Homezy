/**
 * "Seni tanıyalım" soruları ve arka plandaki kişilik tipi (persona).
 * Persona kullanıcıya GÖSTERİLMEZ: sadece Moka'nın sözlerini, sabah özeti saatini, önerilen ev planını,
 * kurulum varsayılanlarını ve yemek önerilerini kişiye göre ayarlar. Her şey telefonda hesaplanır.
 */
import type { HomeProfile } from './types';

export type Who = 'ogrenci' | 'tek' | 'cift' | 'anne' | 'aile';
export type Rhythm = 'yogun' | 'evde' | 'karisik';
export type Cook = 'sever' | 'idare' | 'sevmem';
export type Effort = 15 | 30 | 60;
export type Taste = 'et' | 'sebze' | 'hamur' | 'corba' | 'tatli' | 'etsiz';
export type Budget = 'dusuk' | 'orta' | 'buyuk';
export type Style = 'rahat' | 'duzenli';

export type Answers = {
  who: Who;
  rhythm: Rhythm;
  cook: Cook;
  effort: Effort;
  tastes: Taste[];
  budget: Budget;
  style: Style;
};

export type Persona = 'ogrenci' | 'genc' | 'tek' | 'cift' | 'anne' | 'sef';

export type Option<V> = { v: V; emoji: string; label: string; sub?: string };
export type Question =
  | { k: 'who'; q: string; hint: string; multi?: false; opts: Option<Who>[] }
  | { k: 'rhythm'; q: string; hint: string; multi?: false; opts: Option<Rhythm>[] }
  | { k: 'cook'; q: string; hint: string; multi?: false; opts: Option<Cook>[] }
  | { k: 'effort'; q: string; hint: string; multi?: false; opts: Option<Effort>[] }
  | { k: 'tastes'; q: string; hint: string; multi: true; opts: Option<Taste>[] }
  | { k: 'budget'; q: string; hint: string; multi?: false; opts: Option<Budget>[] }
  | { k: 'style'; q: string; hint: string; multi?: false; opts: Option<Style>[] };

/** Basit, eleyici sorular. Her biri tek dokunuş; "effort" yalnızca yemek yapmayı sevenlere sorulur. */
export const QUESTIONS: Question[] = [
  {
    k: 'who', q: 'Evde kimlerle yaşıyorsun?', hint: 'Sana göre bir düzen kurayım.',
    opts: [
      { v: 'ogrenci', emoji: '🎓', label: 'Öğrenciyim', sub: 'Yurt ya da öğrenci evi' },
      { v: 'tek', emoji: '🧍', label: 'Tek yaşıyorum' },
      { v: 'cift', emoji: '💑', label: 'Eşimle / sevgilimle' },
      { v: 'anne', emoji: '👶', label: 'Çocuğum var', sub: 'Anne ya da baba' },
      { v: 'aile', emoji: '🏠', label: 'Aile evindeyim', sub: 'Annem babamla' },
    ],
  },
  {
    k: 'rhythm', q: 'Günün genelde nasıl geçiyor?', hint: 'İşleri saatine göre ayarlarım.',
    opts: [
      { v: 'yogun', emoji: '🏃', label: 'Dışarıda yoğunum', sub: 'Okul, iş, koşuşturma' },
      { v: 'evde', emoji: '🛋️', label: 'Çoğu zaman evdeyim' },
      { v: 'karisik', emoji: '🔀', label: 'Karışık', sub: 'Her gün farklı' },
    ],
  },
  {
    k: 'cook', q: 'Yemek yapmayı sever misin?', hint: 'Önerilerim ona göre değişir.',
    opts: [
      { v: 'sever', emoji: '👩‍🍳', label: 'Severim' },
      { v: 'idare', emoji: '🙂', label: 'İdare eder', sub: 'Gerekirse yaparım' },
      { v: 'sevmem', emoji: '🙅', label: 'Sevmem', sub: 'En kolayı olsun' },
    ],
  },
  {
    k: 'effort', q: 'Mutfakta ne kadar uğraşırsın?', hint: 'Süreye göre tarif seçerim.',
    opts: [
      { v: 15, emoji: '⚡', label: '15 dakikaya kadar' },
      { v: 30, emoji: '🍳', label: '30 dakikaya kadar' },
      { v: 60, emoji: '🍲', label: 'Bir saat de olur', sub: 'Güzeli bekletmem' },
    ],
  },
  {
    k: 'tastes', q: 'Neler yemeyi seversin?', hint: 'İstediklerini seç.',
    multi: true,
    opts: [
      { v: 'et', emoji: '🍗', label: 'Et / tavuk / balık' },
      { v: 'sebze', emoji: '🥦', label: 'Sebze yemekleri' },
      { v: 'hamur', emoji: '🍝', label: 'Makarna / hamur işi' },
      { v: 'corba', emoji: '🥣', label: 'Çorba' },
      { v: 'tatli', emoji: '🍮', label: 'Tatlı / kahvaltılık' },
      { v: 'etsiz', emoji: '🌱', label: 'Et yemem' },
    ],
  },
  {
    k: 'budget', q: 'Yemek bütçen nasıl?', hint: 'Fiyatı yaklaşık gösteririm.',
    opts: [
      { v: 'dusuk', emoji: '🪙', label: 'Düşük', sub: 'Ucuz ve doyurucu' },
      { v: 'orta', emoji: '💵', label: 'Orta', sub: 'Dengeli' },
      { v: 'buyuk', emoji: '💎', label: 'Rahat', sub: 'Et, balık, güzel malzeme' },
    ],
  },
  {
    k: 'style', q: 'Evi nasıl tutarsın?', hint: 'Moka sana göre konuşsun.',
    opts: [
      { v: 'rahat', emoji: '🧸', label: 'Rahat tipim', sub: 'Dağınık ama sıcak' },
      { v: 'duzenli', emoji: '✨', label: 'Düzenli', sub: 'Her şey yerinde' },
    ],
  },
];

export const DEFAULT_ANSWERS: Answers = {
  who: 'tek', rhythm: 'karisik', cook: 'idare', effort: 30, tastes: [], budget: 'orta', style: 'rahat',
};

/** Soru sorulmalı mı? Yemek sevmeyene "ne kadar uğraşırsın" sorulmaz. */
export const askable = (k: Question['k'], a: Partial<Answers>) => !(k === 'effort' && a.cook === 'sevmem');

/** Cevaplardan kişilik tipi. Kullanıcıya gösterilmez. */
export function personaOf(a: Answers): Persona {
  if (a.who === 'ogrenci') return 'ogrenci';
  if (a.who === 'aile') return 'genc';
  if (a.who === 'anne') return 'anne';
  if (a.cook === 'sever' && a.effort >= 60) return 'sef';
  return a.who === 'cift' ? 'cift' : 'tek';
}

/** Yemek için kişi sayısı. */
export const SERVINGS: Record<Who, number> = { ogrenci: 1, tek: 1, cift: 2, anne: 4, aile: 3 };

/** Tariflere ayrılabilecek en uzun süre (dakika). */
export function timeCap(a: Answers): number {
  let cap = a.cook === 'sevmem' ? 15 : a.effort === 60 ? 90 : a.effort;
  if (a.rhythm === 'yogun') cap = Math.min(cap, 30);
  return cap;
}

/** Kişiye göre kurulum varsayılanları: sabah özeti saati, önerilen plan, evle ilgili cevaplar. */
export type PersonaPlan = {
  /** Sabah özeti saati. */
  morning: string;
  /** Önerilen ev planı şablonu (`TEMPLATES` kimliği). */
  template: string;
  /** Kurulum sorularının varsayılanı (kullanıcı sonra değiştirebilir). */
  home: Partial<HomeProfile>;
  /** Ev planı kurarken Moka'nın tavsiyesi. */
  planTip: string;
};

export const PLAN: Record<Persona, PersonaPlan> = {
  ogrenci: { morning: '09:30', template: 'studyo', home: { bulasik: false, hali: false }, planTip: 'Küçük bir evde her şey elinin altında. Stüdyo ya da 1+1 yeter.' },
  genc: { morning: '08:00', template: '2+1', home: { hali: true }, planTip: 'Aile evinde kendi odan ve ortak alanlar için 2+1 iyi bir başlangıç.' },
  tek: { morning: '08:00', template: '1+1', home: {}, planTip: '1+1 çoğu tek kişilik ev için tam.' },
  cift: { morning: '07:45', template: '2+1', home: { bulasik: true }, planTip: 'İkiniz için 2+1: bir de çalışma köşesi çıkar.' },
  anne: { morning: '06:45', template: '3+1', home: { hali: true, bulasik: true }, planTip: 'Çocuk odası için 3+1 plan rahat eder. Oyuncak toplama işleri de gelir.' },
  sef: { morning: '08:00', template: '2+1', home: { bulasik: true }, planTip: 'Mutfağa geniş yer ayır, sen orada yaşıyorsun.' },
};

/* ---------- Moka'nın kişiye özel sözleri ---------- */

export type Slot = 'sabah' | 'ogle' | 'aksam' | 'gece';
export const slotOf = (hour: number): Slot => (hour >= 5 && hour < 11 ? 'sabah' : hour < 17 ? 'ogle' : hour < 22 ? 'aksam' : 'gece');

type Line = { title: string; message: string };

const LINES: Record<Persona, Record<Slot, Line[]>> = {
  ogrenci: {
    sabah: [
      { title: '🎓 Günaydın, öğrenci!', message: 'Ders öncesi 5 dakika: yatağı topla, günün toparlanır. Kahve benden!' },
      { title: '☕ Erken kuş', message: 'Bugün sadece iki küçük iş yap, kalan vaktin hep senin.' },
    ],
    ogle: [
      { title: '📚 Ders arası', message: 'Masan dağınıksa kafa da dağınık olur. Üç dakikalık toplama yeter.' },
      { title: '🍝 Karnın acıktı mı?', message: 'Bütçe dostu bir tarifim var, bak istersen.' },
    ],
    aksam: [
      { title: '🌙 Sınav haftası da olsa', message: 'Bulaşık bir günde birikmesin, yarın seni bekleyen bir dağ olmasın.' },
      { title: '🍳 Akşam yemeği', message: 'Az paraya doyurucu: bugün ne pişirelim, bakalım mı?' },
    ],
    gece: [
      { title: '😴 Ders çalıştın mı?', message: 'Işığı kıs, çalışma masan yarın seni temiz karşılasın. İyi geceler!' },
    ],
  },
  genc: {
    sabah: [
      { title: '🏠 Günaydın!', message: 'Odanı toplamak annene en güzel sürpriz olur. Bir de pencereyi aç!' },
      { title: '☕ Güne başla', message: 'Kendi odanın düzeni sende. Küçük bir işle başla.' },
    ],
    ogle: [
      { title: '🧺 Evde bir el at', message: 'Bugün ortak alanlardan birine yardım etmeye ne dersin?' },
    ],
    aksam: [
      { title: '🍽️ Sofra hazırlığı', message: 'Akşam yemeğine bir el atan herkesin gözünde kahraman olursun.' },
    ],
    gece: [
      { title: '🌙 Odan hazır mı?', message: 'Yarın için çantanı ve kıyafetini hazırla, sabah rahat uyan.' },
    ],
  },
  tek: {
    sabah: [
      { title: '☕ Günaydın!', message: 'Ev senin, kurallar senin. Önce yatak, sonra kahve!' },
      { title: '🌞 Yeni gün', message: 'Tek başına yaşamak, her şeyi küçük adımlarla halletmek demek. Başlayalım!' },
    ],
    ogle: [
      { title: '🧹 On dakikalık tur', message: 'Kimse beklemiyor ama ev seni bekliyor. Küçük bir tur yeter.' },
    ],
    aksam: [
      { title: '🍳 Akşam yemeği tek kişilik', message: 'Kendine güzel bir sofra kur, bak ne önereceğim.' },
    ],
    gece: [
      { title: '🌙 Günün bitti', message: 'Bulaşık makinede, ışıklar kapalı. Kendine iyi bak!' },
    ],
  },
  cift: {
    sabah: [
      { title: '💑 Günaydın ikiniz!', message: 'İşleri bölüşün, yarı sürede biter. Bugün kim bulaşıkçı?' },
      { title: '☕ İki kahve', message: 'Sabah beraber bir iş, gün boyu mutlu ev.' },
    ],
    ogle: [
      { title: '🧺 Ortak iş', message: 'Çamaşırı sen başlat, akşam birlikte katlarsınız.' },
    ],
    aksam: [
      { title: '🍷 Akşam sofrası', message: 'İkiniz için güzel bir yemek var, bakalım mı?' },
    ],
    gece: [
      { title: '🌙 İyi geceler', message: 'Günün işi bitti. Yarın birlikte devam!' },
    ],
  },
  anne: {
    sabah: [
      { title: '👶 Günaydın!', message: 'Sen evin kahramanısın. Bugün sadece en önemli üç işe bakalım.' },
      { title: '☕ Önce sen', message: 'Çocuklar uyanmadan beş dakika: kahveni iç, sonra işler.' },
    ],
    ogle: [
      { title: '🧸 Oyuncak toplama saati', message: 'Minik yardımcıları da çağır, oyun gibi toplansın.' },
    ],
    aksam: [
      { title: '🍲 Akşam yemeği', message: 'Pratik ve sağlıklı bir tarif buldum, çocuklar da sever.' },
    ],
    gece: [
      { title: '😴 Hepsi uyudu mu?', message: 'Ev yarın da toparlanır. Şimdi dinlen, hak ettin.' },
    ],
  },
  sef: {
    sabah: [
      { title: '👩‍🍳 Günaydın şef!', message: 'Mutfak seni bekliyor. Bugün ne pişireceğiz?' },
      { title: '🥖 Taze bir gün', message: 'Mutfağı derli toplu tut, yemek keyfi iki katına çıkar.' },
    ],
    ogle: [
      { title: '🛒 Alışveriş listesi', message: 'Akşam yemeği için eksikleri kontrol edelim mi?' },
    ],
    aksam: [
      { title: '🍲 Yemek vakti!', message: 'Bugünün tarifi hazır. Uzun sürer ama değer.' },
    ],
    gece: [
      { title: '🧽 Mutfak kapanış', message: 'Tezgahı sil, ocağı kontrol et. Yarın taze başlarsın!' },
    ],
  },
};

function hash(s: string) {
  let x = 0;
  for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(x);
}

/** O saate ve güne göre kişiye özel Moka sözü (aynı gün aynı söz). Yoksa null. */
export function personaLine(p: Persona, hour: number, day: string, shift = 0): Line | null {
  const pool = LINES[p][slotOf(hour)];
  if (!pool?.length) return null;
  return pool[(hash(day + p) + shift) % pool.length];
}
