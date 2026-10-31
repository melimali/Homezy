import type { PersonaId } from './items';
import { dayKey, type HouseProgress } from './play';
import type { DayKey, Mode, Play } from './types';

/**
 * Moka'nın bahçesi: puanla tohum alınır, saksıya ekilir, her gün yapılan işlerle büyür, açınca albüme girer.
 * Odalardaki gerçek bitkilerden ayrı bir oyun; adında hep "Moka'nın" geçer.
 * - Puan veren her iş 1 büyüme verir, günde en fazla `GROW_PER_DAY`. Sayım `Play.log`'dan yapılır, ayrı sayaç yok.
 * - Gübre büyümeyi hızlandırır ama hedefin en fazla yarısını verebilir: iş yapmadan çiçek açmaz.
 * - Bitki kurumaz, ceza yok (ceza zaten evin tozlanıp çökmesinde).
 * Tohum ve gübre tekrar alındığı için sunucuda `play_spend` tablosuna yazılır (…_bahce.sql).
 */

export const GROW_PER_DAY = 3;

export type FlowerShape = 'daisy' | 'tulip' | 'spike' | 'rose' | 'star' | 'cup' | 'big' | 'bell';

export type Flower = {
  id: string;
  name: string;
  emoji: string;
  /** Tohum fiyatı (puan). */
  price: number;
  /** Açması için gereken büyüme. */
  grow: number;
  petal: string;
  center: string;
  shape: FlowerShape;
  premium?: boolean;
  /** Ayın çiçeği olduğu ay (0 ocak … 11 aralık). */
  month?: number;
  /** Ayın macerası: Moka'nın tek cümlesi. */
  story?: string;
};

/** Çiçek tohumları, ucuzdan pahalıya. Fiyatlar sunucudaki `play_garden_items` ile aynı olmalı. */
export const FLOWERS: Flower[] = [
  { id: 'papatya', name: 'Papatya', emoji: '🌼', price: 20, grow: 6, petal: '#FFFFFF', center: '#F2C46D', shape: 'daisy', month: 4, story: 'Piknik hazırlığı! Sepete papatya koyalım.' },
  { id: 'kardelen', name: 'Kardelen', emoji: '🤍', price: 25, grow: 8, petal: '#F4F7FA', center: '#9CC9A0', shape: 'bell', month: 0, story: 'Karın altında ilk çiçeği arıyoruz.' },
  { id: 'menekse', name: 'Menekşe', emoji: '💜', price: 30, grow: 9, petal: '#8E6CC4', center: '#F2C46D', shape: 'daisy' },
  { id: 'lale', name: 'Lale', emoji: '🌷', price: 40, grow: 10, petal: '#E0605A', center: '#F2C46D', shape: 'tulip', month: 3, story: "Nisan'da lale bahçesi kuralım!" },
  { id: 'nergis', name: 'Nergis', emoji: '🌼', price: 50, grow: 12, petal: '#F6D55C', center: '#E8A15A', shape: 'cup', month: 2, story: 'Bahar temizliği ve ilk güneş.' },
  { id: 'sumbul', name: 'Sümbül', emoji: '💙', price: 60, grow: 14, petal: '#7FA0E0', center: '#7FA0E0', shape: 'spike', month: 1, story: 'Pencere önünde kokulu bir sürpriz.' },
  { id: 'lavanta', name: 'Lavanta', emoji: '🪻', price: 75, grow: 16, petal: '#A98BD6', center: '#A98BD6', shape: 'spike', month: 6, story: 'Serin balkon akşamları için lavanta.' },
  { id: 'aycicegi', name: 'Ayçiçeği', emoji: '🌻', price: 90, grow: 18, petal: '#F4C430', center: '#7A5236', shape: 'big', month: 5, story: 'Güneşi takip eden çiçeği büyütelim.' },
  { id: 'gul', name: 'Gül', emoji: '🌹', price: 110, grow: 20, petal: '#E26D8A', center: '#C24D6C', shape: 'rose' },
  { id: 'yasemin', name: 'Yasemin', emoji: '🤍', price: 130, grow: 22, petal: '#FFFDF5', center: '#F2C46D', shape: 'star', month: 8, story: 'Okula dönüş, akşam yasemin kokusu.' },
  { id: 'krizantem', name: 'Krizantem', emoji: '🏵️', price: 140, grow: 24, petal: '#D9813F', center: '#A8552B', shape: 'daisy', month: 9, story: 'Sonbahar renkleri bahçeye gelsin.' },
  { id: 'kasimpati', name: 'Kasımpatı', emoji: '🌼', price: 150, grow: 25, petal: '#E3A64B', center: '#C2543A', shape: 'rose', month: 10, story: 'Battaniye, çay ve kasımpatı.' },
  { id: 'begonvil', name: 'Begonvil', emoji: '🌺', price: 170, grow: 27, petal: '#D4458C', center: '#FFF1B8', shape: 'star', month: 7, story: 'Yazlık evin duvarına begonvil.' },
  { id: 'orkide', name: 'Orkide', emoji: '🌸', price: 200, grow: 30, petal: '#E7A6E0', center: '#B8458F', shape: 'star', premium: true },
  { id: 'nilufer', name: 'Nilüfer', emoji: '🪷', price: 250, grow: 33, petal: '#F4A6C0', center: '#F2C46D', shape: 'cup', premium: true },
  { id: 'ataturk', name: 'Atatürk çiçeği', emoji: '❤️', price: 300, grow: 36, petal: '#D7263D', center: '#F2C46D', shape: 'star', premium: true, month: 11, story: 'Yılbaşı kırmızısı: Atatürk çiçeği.' },
];

export const FLOWER: Record<string, Flower | undefined> = Object.fromEntries(FLOWERS.map(f => [f.id, f]));

/** Bu ayın çiçeği: listede "Ayın çiçeği" rozeti taşır ve Moka'nın aylık macerasını anlatır. */
export const monthFlower = (now = Date.now()) => FLOWERS.find(f => f.month === new Date(now).getMonth()) ?? FLOWERS[0];

/** Gübre: tekrar alınır, günde sınırlı. Ucuzdan pahalıya. */
export type Fert = { id: 'gubre_avuc' | 'gubre_torba'; name: string; emoji: string; price: number; grow: number; perDay: number };
export const FERTS: Fert[] = [
  { id: 'gubre_avuc', name: 'Avuç gübre', emoji: '🤲', price: 15, grow: 3, perDay: 2 },
  { id: 'gubre_torba', name: 'Torba gübre', emoji: '💰', price: 40, grow: 9, perDay: 1 },
];

/** Aynı anda kaç saksı (ücretsiz / Premium). */
export const PLOTS = { free: 6, premium: 9 } as const;

export type Plot = {
  id: string;
  flower: string;
  /** Ekildiği gün. */
  day: DayKey;
  /** Ekildiği gün o ana kadar yapılmış iş sayısı (ekilmeden önceki işler sayılmasın). */
  base: number;
  /** Verilen gübrenin toplam büyümesi (sınırsız tutulur, hesaplarken hedefin yarısına kırpılır). */
  fert: number;
  /** Açtı ve kutlaması gösterildi. Günlük kayıtlar silinse bile açık kalsın diye. */
  bloomed?: boolean;
};

export type Garden = {
  plots: Plot[];
  /** Albüme alınan çiçekler: çiçek → kaç tane. 3B evin bahçesinde saksı olarak görünür. */
  album: Record<string, number>;
  /** Bugün verilen gübreler (günlük sınır için). */
  fed: { day: DayKey; n: Record<string, number> };
  /** Bugün sevgi/su verilen saksı kimlikleri. */
  loved?: { day: DayKey; plotIds: string[] };
};

/** Saksının büyümesi: ekildikten sonraki işler (günde en fazla 3) + gübre (hedefin en fazla yarısı). */
export function growth(P: Play, plot: Plot, now = Date.now()) {
  const f = FLOWER[plot.flower];
  if (!f) return 0;
  if (plot.bloomed) return f.grow;
  const today = dayKey(now);
  let g = 0;
  for (const [day, list] of Object.entries(P.log)) {
    if (day < plot.day || day > today) continue;
    const n = day === plot.day ? Math.max(0, list.length - plot.base) : list.length;
    g += Math.min(GROW_PER_DAY, n);
  }
  g += Math.min(plot.fert, Math.floor(f.grow / 2));
  return Math.min(f.grow, g);
}

export const FERT_CAP = (f: Flower) => Math.floor(f.grow / 2);

/** Aşamalar: 0 tohum, 1 çimlendi, 2 filiz, 3 fide, 4 tomurcuk, 5 çiçek. Yüzdeyle, böylece her çiçekte aynı. */
export const STAGE_NAMES = ['Tohum', 'Çimlendi', 'Filiz', 'Fide', 'Tomurcuk', 'Açtı!'];
export function stageOf(g: number, target: number) {
  const p = target ? g / target : 0;
  return p >= 1 ? 5 : p >= 0.8 ? 4 : p >= 0.55 ? 3 : p >= 0.3 ? 2 : p >= 0.1 ? 1 : 0;
}

/** Bugün bu gübreden kaç tane verildi. */
export const fedToday = (G: Garden, id: string, now = Date.now()) => (G.fed.day === dayKey(now) ? G.fed.n[id] ?? 0 : 0);

/** Bugün bu saksıya sevgi/su verildi mi. */
export const isPlotLovedToday = (G: Garden, plotId: string, now = Date.now()) =>
  G.loved?.day === dayKey(now) && (G.loved.plotIds ?? []).includes(plotId);

/** Bahçe seviyesi ve unvanı (albüme alınan farklı veya toplam çiçek sayısına göre). */
export function gardenRank(album: Record<string, number>) {
  const totalTypes = Object.keys(album).length;
  if (totalTypes >= 14) return { title: '👑 Kraliyet Bahçıvanı', level: 5 };
  if (totalTypes >= 10) return { title: '🌸 Usta Bahçıvan', level: 4 };
  if (totalTypes >= 6) return { title: '🌷 Renkli Bahçıvan', level: 3 };
  if (totalTypes >= 3) return { title: '🌿 Çiçek Sever', level: 2 };
  return { title: '🌱 Çaylak Bahçıvan', level: 1 };
}

/* ---------- evin ruh hali ve kişiliği ---------- */

/**
 * Evin ruh hali seriden kendiliğinden çıkar; yeni veri tutulmaz. Sadece görüntü ve söz:
 * puan ya da seviye düşürmez (ceza zaten evin tozlanmasında).
 */
export type Mood = 'isil' | 'keyifli' | 'sakin' | 'uykulu' | 'sessiz' | 'uyaniyor' | 'tatil';

export function houseMood(p: HouseProgress, P: Play, mode: Mode | null, now = Date.now()): Mood {
  if (mode?.k === 'tatil') return 'tatil';
  if (p.idle >= 2) return 'sessiz';
  if (p.idle === 1) return 'uykulu';
  const today = dayKey(now);
  // Ara verdikten sonra bugünün ilk işi: ışıklar tek tek yanar.
  if (p.today && p.streak === 1 && P.days.some(d => d < today)) return 'uyaniyor';
  if (p.today && p.streak >= 7) return 'isil';
  if (p.streak >= 3) return 'keyifli';
  return 'sakin';
}

export const MOOD_NAME: Record<Mood, string> = {
  isil: 'Işıl ışıl', keyifli: 'Keyifli', sakin: 'Sakin', uykulu: 'Uykulu', sessiz: 'Sessiz', uyaniyor: 'Uyanıyor', tatil: 'Tatilde',
};

/** Pencerelerin ne kadarı aydınlık (0–1). */
export const MOOD_LIGHT: Record<Mood, number> = { isil: 1, keyifli: 0.75, uyaniyor: 0.6, sakin: 0.35, uykulu: 0.15, sessiz: 0, tatil: 0 };

/** Kişiliğe göre pencere ışığı [ana renk, parıltı]. */
export const PERSONA_LIGHT: Record<PersonaId, string[]> = {
  sicak: ['#F6B25C', '#FFD99A'],
  sakin: ['#9CC9E0', '#C9B8EE'],
  neseli: ['#F2C46D', '#E58C7E', '#9CC9E0', '#A6D49B', '#F4A6C0'],
};

const LINES: Record<PersonaId, Record<Mood, string>> = {
  sicak: {
    isil: 'Bütün ışıklarım yanık, çay hep demli. Ne güzel bir seri ☕',
    keyifli: 'Perdeleri açtım, içerisi sıcacık 🧡',
    sakin: 'Çay demledim, hoş geldin.',
    uykulu: 'Biraz uyukladım. Bir iş yaparsan çayı tazelerim.',
    sessiz: 'Işıkları kıstım, seni bekliyorum. Bir iş yap, çayı tazeleyeyim.',
    uyaniyor: 'Döndün! Işıkları tek tek yakıyorum 🕯️',
    tatil: 'İyi tatiller! Ben evi beklerim, sen dinlen.',
  },
  sakin: {
    isil: 'Her şey yerli yerinde. Yavaş ve düzenli, tam böyle.',
    keyifli: 'Güzel bir ritim tuttuk. Acele yok.',
    sakin: 'Yavaş yavaş, acele yok.',
    uykulu: 'Biraz dinlendim. Hazır olduğunda buradayım.',
    sessiz: 'Sessizce bekliyorum. Küçük bir işle başlayabiliriz.',
    uyaniyor: 'Tekrar merhaba. Bir nefes alalım, devam edelim.',
    tatil: 'Tatildesin. Ev sakin, sen de sakin ol 🌙',
  },
  neseli: {
    isil: 'Yaşasın! Seri devam, ev bayram yerine döndü 🎉',
    keyifli: 'Yaşasın, bir iş daha bitti!',
    sakin: 'Hadi bir iş daha yapalım, bayrakları asayım!',
    uykulu: 'Hey, uyandır beni! Bir iş yapalım mı?',
    sessiz: 'Hey! Seni özledim, bir iş yapalım mı?',
    uyaniyor: 'Geldin geldin! Konfetileri hazırlıyorum 🎊',
    tatil: 'Tatil! Bavulu hazırladım, dönüşte parti var 🧳',
  },
};

export const moodLine = (mood: Mood, persona: PersonaId) => LINES[persona][mood];

/** Seçili kişilik; alınmamışsa (ya da kayıt bozuksa) varsayılan Sıcak. */
export function personaOf(P: Play): PersonaId {
  const want = P.persona ?? 'sicak';
  return want === 'sicak' || P.owned.includes(`kisilik_${want}`) ? want : 'sicak';
}
