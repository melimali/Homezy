import type { Answers } from './persona';
import type { DiscAnswers, TypeId } from './kisilik';
import type { DayKey, Growth, RoomType } from './types';

/**
 * Görev havuzları (isteğe bağlı bonus katmanı). Günlük rutinler (`TYPES`) ve kademeli rampa değişmez;
 * bunlar günün ana işleri bitince açılan, puan / seri etkilemeyen ek fikirlerdir.
 * - Oda havuzu: her oda türü için 3 zorluk (2 dk mikro, 10 dk normal, 20+ dk derin), her gün farklı oda ve iş.
 * - Kişi havuzu: öğrenci, çalışan, ebeveyn, tek yaşayan, ertelemeci, düzenli için ayrı bonuslar.
 * Seçim deterministik: aynı gün hep aynı öneri, bir tur bitmeden aynı iş tekrar gelmez.
 * Durum `Growth.bonus[gün]` içinde `o:<id>` (oda) ve `p:<id>` (kişi) anahtarlarıyla tutulur.
 */
export type Lvl = 'mikro' | 'normal' | 'derin';
export const LVL: Record<Lvl, { emoji: string; label: string; min: number }> = {
  mikro: { emoji: '⚡', label: '2 dk', min: 2 },
  normal: { emoji: '🧹', label: '10 dk', min: 10 },
  derin: { emoji: '✨', label: '20+ dk', min: 20 },
};
export const LVLS: Lvl[] = ['mikro', 'normal', 'derin'];

export type PoolTask = { id: string; emoji: string; title: string; lvl: Lvl };
const P = (id: string, emoji: string, title: string, lvl: Lvl): PoolTask => ({ id, emoji, title, lvl });

export const ROOM_POOL: Record<RoomType, PoolTask[]> = {
  yatak: [
    P('y1', '🛏️', 'Yastıkları kabart, örtüyü düzelt', 'mikro'), P('y2', '🧦', 'Komodinin üstünü boşalt', 'mikro'), P('y3', '🪟', 'Perdeyi aç, odayı havalandır', 'mikro'),
    P('y4', '👕', 'Sandalyedeki kıyafetleri yerleştir', 'normal'), P('y5', '🧺', 'Bir çekmeceyi katla, düzenle', 'normal'), P('y6', '🪞', 'Aynayı ve kapı kolunu sil', 'normal'),
    P('y7', '🧹', 'Yatağın altını süpür', 'derin'), P('y8', '👗', 'Dolaptan giymediklerini ayır', 'derin'), P('y9', '🛌', 'Şilteyi çevir, çarşafı değiştir', 'derin'),
  ],
  mutfak: [
    P('m1', '🧽', 'Lavaboyu durula, süngeri sık', 'mikro'), P('m2', '🍽️', 'Kurumuş bulaşıkları kaldır', 'mikro'), P('m3', '🧂', 'Tezgahta tek bir köşeyi boşalt', 'mikro'),
    P('m4', '🥫', 'Buzdolabında bozulanları at', 'normal'), P('m5', '🔥', 'Ocağın üstünü sil', 'normal'), P('m6', '🗑️', 'Çöp kovasının içini sil', 'normal'),
    P('m7', '🧊', 'Buzdolabının bir rafını temizle', 'derin'), P('m8', '🫙', 'Bir dolabı boşalt, sil, yerleştir', 'derin'), P('m9', '♨️', 'Mikrodalga ve fırın içini temizle', 'derin'),
  ],
  banyo: [
    P('b1', '🪥', 'Diş fırçası bardağını durula', 'mikro'), P('b2', '🧻', 'Tuvalet kağıdını ve sabunu tamamla', 'mikro'), P('b3', '🪞', 'Aynadaki lekeleri sil', 'mikro'),
    P('b4', '🚰', 'Musluk ve lavaboyu parlat', 'normal'), P('b5', '🧴', 'Raftaki şişeleri düzenle, boşları at', 'normal'), P('b6', '🛁', 'Duş başlığını ve fayans köşelerini sil', 'normal'),
    P('b7', '🫧', 'Derzleri fırçala', 'derin'), P('b8', '🚿', 'Duş perdesini ya da camını yıka', 'derin'), P('b9', '🧼', 'Dolabın içini boşalt, sil', 'derin'),
  ],
  salon: [
    P('s1', '🛋️', 'Minderleri kabart, battaniyeyi katla', 'mikro'), P('s2', '📺', 'Kumandaları tek yere topla', 'mikro'), P('s3', '☕', 'Masadaki bardakları mutfağa götür', 'mikro'),
    P('s4', '🪴', 'Sehpa ve rafların tozunu al', 'normal'), P('s5', '📚', 'Kitap ve dergileri düzenle', 'normal'), P('s6', '🧹', 'Koltuğun altını süpür', 'normal'),
    P('s7', '🪟', 'Bir pencereyi içten dışa sil', 'derin'), P('s8', '🧽', 'Koltuktaki lekeleri temizle', 'derin'), P('s9', '💡', 'Lamba ve avizenin tozunu al', 'derin'),
  ],
  calisma: [
    P('c1', '🖊️', 'Kalemleri kutuya topla', 'mikro'), P('c2', '🖥️', 'Ekranı ve klavyeyi sil', 'mikro'), P('c3', '📄', 'Masadaki kağıtları tek yığın yap', 'mikro'),
    P('c4', '🗂️', 'Bir çekmeceyi düzenle', 'normal'), P('c5', '🔌', 'Kabloları bağla, şarj köşesi kur', 'normal'), P('c6', '💻', 'Bilgisayarın masaüstünü temizle', 'normal'),
    P('c7', '📚', 'Rafı boşalt, tozunu al, yerleştir', 'derin'), P('c8', '🧾', 'Eski kağıtları ayıkla, at ya da dosyala', 'derin'), P('c9', '🪑', 'Masa ve sandalyenin altını temizle', 'derin'),
  ],
  cocuk: [
    P('k1', '🧸', 'Peluşları yatağa diz', 'mikro'), P('k2', '🖍️', 'Boyaları kutusuna koy', 'mikro'), P('k3', '🧦', 'Yerdeki çorapları sepete at', 'mikro'),
    P('k4', '🧩', 'Bir oyuncak kutusunu ayıkla', 'normal'), P('k5', '📖', 'Kitapları rafa diz', 'normal'), P('k6', '🎒', 'Okul çantasını boşalt, hazırla', 'normal'),
    P('k7', '🎁', 'Küçülen kıyafetleri ayır', 'derin'), P('k8', '🧼', 'Oyuncakları sil ya da yıka', 'derin'), P('k9', '🧹', 'Yatak ve dolap altını süpür', 'derin'),
  ],
  antre: [
    P('a1', '🔑', 'Anahtarları tek yere as', 'mikro'), P('a2', '👟', 'Kapının önündeki ayakkabıları diz', 'mikro'), P('a3', '✉️', 'Biriken zarf ve kağıtları at', 'mikro'),
    P('a4', '🧥', 'Askıdaki montları seyrelt', 'normal'), P('a5', '🚪', 'Kapıyı ve kolunu sil', 'normal'), P('a6', '🧽', 'Paspası silkele', 'normal'),
    P('a7', '👞', 'Ayakkabılığı boşalt, sil, ayıkla', 'derin'), P('a8', '🪞', 'Duvar ve süpürgelikleri sil', 'derin'), P('a9', '☂️', 'Şemsiye ve çanta köşesini düzenle', 'derin'),
  ],
  balkon: [
    P('l1', '🌿', 'Kuru yaprakları topla', 'mikro'), P('l2', '🪑', 'Sandalyeleri sil', 'mikro'), P('l3', '💧', 'Bitkilere su ver', 'mikro'),
    P('l4', '🧹', 'Balkonu süpür', 'normal'), P('l5', '🪴', 'Saksıların altını temizle', 'normal'), P('l6', '🧺', 'Çamaşır askısını topla', 'normal'),
    P('l7', '🪟', 'Balkon camını sil', 'derin'), P('l8', '🧽', 'Yeri sabunlu suyla yıka', 'derin'), P('l9', '📦', 'Balkondaki eşyaları ayıkla', 'derin'),
  ],
  camasir: [
    P('w1', '🧺', 'Kirli sepetini renklere ayır', 'mikro'), P('w2', '🧦', 'Tek kalan çorapları eşle', 'mikro'), P('w3', '🧴', 'Deterjanı kontrol et', 'mikro'),
    P('w4', '👕', 'Kuruyanları katla', 'normal'), P('w5', '💨', 'Beş parça ütüle', 'normal'), P('w6', '🫧', 'Makinenin lastiğini sil', 'normal'),
    P('w7', '🌀', 'Boş makineyi sıcak suyla çalıştır', 'derin'), P('w8', '🧼', 'Deterjan gözünü çıkar, yıka', 'derin'), P('w9', '🗄️', 'Çamaşır rafını düzenle', 'derin'),
  ],
};

/* ---------- kişiye özel bonuslar ---------- */

export type Kind = 'ogrenci' | 'calisan' | 'ebeveyn' | 'tek' | 'ertelemeci' | 'duzenli';
export const KIND_NAME: Record<Kind, string> = {
  ogrenci: 'Öğrenci', calisan: 'Çalışan', ebeveyn: 'Ebeveyn', tek: 'Tek yaşayan', ertelemeci: 'Ertelemeci', duzenli: 'Düzenli',
};

export type Bonus = { id: string; emoji: string; title: string; hint: string; min: number };
const B = (id: string, emoji: string, title: string, hint: string, min: number): Bonus => ({ id, emoji, title, hint, min });

export const KIND_POOL: Record<Kind, Bonus[]> = {
  ogrenci: [
    B('o1', '🎒', 'Yarının çantasını şimdi hazırla', 'Sabah 5 dakika kazanırsın.', 3),
    B('o2', '⏱️', '25 dakika ders, 5 dakika mola', 'Telefon başka odada.', 30),
    B('o3', '🗒️', 'Bugün öğrendiğin 3 şeyi yaz', 'Tekrar etmenin en kısa yolu.', 3),
    B('o4', '🧺', 'Haftalık çamaşırını makineye at', 'Yurtta da evde de aynı.', 5),
    B('o5', '🍎', 'Yarın için ucuz bir atıştırmalık hazırla', 'Bir meyve ve bir avuç kuruyemiş.', 5),
    B('o6', '📵', 'Ders çalışırken bildirimleri kapat', 'Bir saatliğine.', 1),
  ],
  calisan: [
    B('c1', '👔', 'Yarının kıyafetini şimdi seç', 'Sabah karar yorgunluğu olmaz.', 3),
    B('c2', '🥪', 'Yarının öğle yemeğini hazırla', 'Hem ucuz hem sağlıklı.', 10),
    B('c3', '📥', 'E-posta kutunda 5 mesajı bitir', 'Arşivle ya da cevapla.', 5),
    B('c4', '🚶', 'Öğle arasında 10 dakika yürü', 'Ekrandan uzak, gün ışığında.', 10),
    B('c5', '🔌', 'İşten sonra 15 dakika telefonsuz kal', 'Günü kapatmanın en kısa yolu.', 15),
    B('c6', '📅', 'Yarının en önemli işini yaz', 'Sadece bir tane.', 2),
  ],
  ebeveyn: [
    B('e1', '🧸', 'Çocukla 5 dakika oyuncak topla oyunu', 'Kim daha hızlı? Şarkıyla.', 5),
    B('e2', '🎒', 'Okul çantasını birlikte hazırlayın', 'Sabah telaşı azalır.', 5),
    B('e3', '☕', 'Kendine 10 dakika ayır', 'Sadece senin, kimse yok.', 10),
    B('e4', '📖', 'Yatmadan önce bir masal oku', 'İkiniz için de sakinleştirici.', 10),
    B('e5', '🍱', 'Yarının beslenmesini hazırla', 'Bir meyve, bir sandviç.', 10),
    B('e6', '🗓️', 'Bu haftanın aile işlerini paylaştır', 'Herkese bir küçük iş.', 5),
  ],
  tek: [
    B('t1', '📞', 'Bir arkadaşını ya da aileni ara', '5 dakikalık bir sohbet.', 5),
    B('t2', '🍲', 'Kendine güzel bir tabak hazırla', 'Tek kişilik de özenilir.', 20),
    B('t3', '🕯️', 'Evde kendin için bir köşe kur', 'Bir mum, bir battaniye, bir kitap.', 5),
    B('t4', '🛒', 'Haftalık alışveriş listesini yaz', 'Az ve öz.', 5),
    B('t5', '🌳', 'Mahallende yeni bir sokak keşfet', '15 dakika, yavaş adım.', 15),
    B('t6', '🎧', 'Bir podcast açıp ortalığı topla', 'İki işi bir arada.', 15),
  ],
  ertelemeci: [
    B('r1', '⏳', 'En çok ertelediğin işe 2 dakika ver', 'Sadece başla, bitirmek zorunda değilsin.', 2),
    B('r2', '📝', 'Ertelediğin bir işi en küçük adımına böl', 'İlk adım bir dakikadan kısa olsun.', 3),
    B('r3', '⏰', '5 dakikalık zamanlayıcı kur ve başla', 'Zil çalınca bırakabilirsin.', 5),
    B('r4', '📵', 'Telefonu 10 dakika başka odaya koy', 'Dikkat geri gelir.', 10),
    B('r5', '✅', 'Bugün yaptığın her şeyi yaz', 'Küçükler de sayılır.', 2),
    B('r6', '🤝', 'Birine yarın ne yapacağını söyle', 'Söz vermek başlatır.', 2),
  ],
  duzenli: [
    B('d1', '📊', 'Haftanı 3 dakikada gözden geçir', 'Ne iyi gitti, ne zorladı?', 3),
    B('d2', '🗄️', 'Bir çekmeceyi kategoriye ayır', 'Az eşya, kolay düzen.', 15),
    B('d3', '🏷️', 'Kavanoz ya da kutuları etiketle', 'Her şeyin bir yeri olsun.', 10),
    B('d4', '📆', 'Gelecek haftanın planını kur', 'Büyük işleri günlere dağıt.', 10),
    B('d5', '🎯', 'Bu ay için tek bir hedef yaz', 'Ölçülebilir olsun.', 3),
    B('d6', '🧘', 'Planı bırak, 10 dakika dinlen', 'Düzen dinlenmeyi de içerir.', 10),
  ],
};

/** "Seni tanıyalım" ve disiplin testi cevaplarından kişi türleri; ilki ana tür. En az bir tür döner. */
export function kindsOf(a: Answers | null | undefined, type?: TypeId | null, disc?: DiscAnswers): Kind[] {
  const out: Kind[] = [];
  const add = (k: Kind) => void (out.includes(k) || out.push(k));
  if (a?.who === 'ogrenci') add('ogrenci');
  if (a?.who === 'anne') add('ebeveyn');
  if (a?.rhythm === 'yogun' && a?.who !== 'ogrenci') add('calisan');
  if (a?.who === 'tek') add('tek');
  if (disc?.start === 'birazdan' || type === 'tembel' || type === 'dalgin' || type === 'sakin') add('ertelemeci');
  if (a?.style === 'duzenli' || type === 'planli' || type === 'odakli') add('duzenli');
  if (!out.length) add(a?.rhythm === 'evde' ? 'tek' : 'calisan');
  return out;
}

/* ---------- seçim ---------- */

export const dayNum = (k: DayKey) => {
  const [y, m, d] = k.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
};

/** Tohumlu karıştırma (mulberry32): her turda farklı sıra, ama aynı tohumla hep aynı. */
function shuffle<T>(list: T[], seed: number): T[] {
  let s = seed >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const hash = (s: string) => [...s].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 7);

/**
 * Rotasyon: liste her turda karışır, `n`. gün turun `n % len`. elemanıdır. Bir tur içinde aynı eleman
 * iki kez gelmez; tur sınırında da (önceki turun sonuncusu yeni turun başına düşerse) kaydırılır.
 */
export function rotate<T>(list: T[], n: number, salt = ''): T {
  const len = list.length;
  const cycle = Math.floor(n / len);
  const i = ((n % len) + len) % len;
  const cur = shuffle(list, hash(salt) + cycle);
  if (i === 0 && len > 1) {
    const prev = shuffle(list, hash(salt) + cycle - 1);
    if (prev[len - 1] === cur[0]) return cur[1];
  }
  if (i === 1 && len > 1) {
    const prev = shuffle(list, hash(salt) + cycle - 1);
    if (prev[len - 1] === cur[0]) return cur[0];
  }
  return cur[i];
}

/** Bugünün odası (odalar arasında döner) ve o odadan her zorlukta bir iş. */
export function roomSpark(day: DayKey, rooms: { id: string; type: RoomType }[]): { rid: string; type: RoomType; tasks: PoolTask[] } | null {
  if (!rooms.length) return null;
  const n = dayNum(day);
  const r = rooms[((n % rooms.length) + rooms.length) % rooms.length];
  const pool = ROOM_POOL[r.type] ?? [];
  // Aynı oda her `rooms.length` günde bir gelir: o odanın kendi sayacıyla döndür, böylece işler de tekrar etmez.
  const k = Math.floor(n / rooms.length);
  const tasks = LVLS.map(l => pool.filter(p => p.lvl === l)).filter(x => x.length).map((x, i) => rotate(x, k, r.type + i));
  return { rid: r.id, type: r.type, tasks };
}

/** Bugünün kişiye özel 2 bonusu: ana türden bir tane, ikinci türden (yoksa ana türden) bir tane. */
export function kindToday(day: DayKey, kinds: Kind[]): (Bonus & { kind: Kind })[] {
  const n = dayNum(day);
  const main = kinds[0] ?? 'calisan';
  const side = kinds[1] ?? main;
  const a = rotate(KIND_POOL[main], n, main);
  let b = rotate(KIND_POOL[side], n, side + '2');
  if (b.id === a.id) b = rotate(KIND_POOL[side], n + 1, side + '2');
  return [{ ...a, kind: main }, { ...b, kind: side }];
}

export type MarkState = 'done' | 'skip' | null;
export const markState = (G: Growth, day: DayKey, key: string): MarkState => {
  const v = G.bonus?.[day]?.[key];
  return v === 'done' || v === 'skip' ? v : null;
};

/** Taslak `Growth` üzerinde işaretler; aynı değere tekrar dokunmak geri alır. Son 60 gün tutulur. */
export function mark(G: Growth, day: DayKey, key: string, v: 'done' | 'skip') {
  const bonus = { ...(G.bonus ?? {}) };
  const cur = { ...(bonus[day] ?? {}) };
  if (cur[key] === v) delete cur[key];
  else cur[key] = v;
  bonus[day] = cur;
  const keep = Object.keys(bonus).sort().slice(-60);
  G.bonus = Object.fromEntries(keep.map(d => [d, bonus[d]]));
}

/** Bu hafta (pazartesiden) yapılan bonus sayısı: haftalık ilerleme için. */
export function bonusWeek(G: Growth, days: DayKey[]): number {
  return days.reduce((n, d) => n + Object.values(G.bonus?.[d] ?? {}).filter(v => v === 'done').length, 0);
}
