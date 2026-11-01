import type { Answers, Taste } from './persona';
import { SERVINGS, timeCap } from './persona';
import type { StockItem } from './types';

/**
 * Bu gece / yarın sabah için pratik yemekler. Hepsi telefonda, yapay zekâ gerekmez.
 * Fiyatlar 2 kişilik malzeme için TL cinsinden yaklaşık değerdir (market ve şehre göre değişir).
 * Tuz, sıvı yağ, su, şeker ve baharat evde var sayılır; listede yok.
 */
export type Slot = 'sabah' | 'aksam';
export type Ing = { n: string; a: number; u: string; p: number };
export type Meal = {
  id: string;
  name: string;
  emoji: string;
  slots: Slot[];
  /** Hazırlık + pişirme, dakika. */
  min: number;
  /** Sağlıklılık: 1 (keyfi) … 5 (çok sağlıklı). */
  health: 1 | 2 | 3 | 4 | 5;
  /** Et, tavuk ya da balık içeriyor mu. */
  meat: boolean;
  tags: Taste[];
  ing: Ing[];
  steps: string;
};

const i = (n: string, a: number, u: string, p: number): Ing => ({ n, a, u, p });

export const MEALS: Meal[] = [
  /* ---- sabah ---- */
  { id: 'menemen', name: 'Menemen', emoji: '🍳', slots: ['sabah', 'aksam'], min: 15, health: 3, meat: false, tags: ['sebze'],
    ing: [i('yumurta', 3, 'adet', 33), i('domates', 2, 'adet', 25), i('biber', 2, 'adet', 15), i('ekmek', 2, 'dilim', 8)],
    steps: 'Biberi kavur, domatesi ekle, suyunu çekince yumurtaları kır ve hafifçe karıştır. Ekmekle ye.' },
  { id: 'omlet', name: 'Peynirli omlet', emoji: '🧀', slots: ['sabah'], min: 10, health: 3, meat: false, tags: ['sebze'],
    ing: [i('yumurta', 3, 'adet', 33), i('peynir', 50, 'g', 25), i('ekmek', 2, 'dilim', 8)],
    steps: 'Yumurtaları çırp, yağlı tavaya dök, peyniri serp ve ikiye katla.' },
  { id: 'yulaf', name: 'Muzlu yulaf lapası', emoji: '🥣', slots: ['sabah'], min: 10, health: 5, meat: false, tags: ['tatli'],
    ing: [i('yulaf', 80, 'g', 15), i('süt', 400, 'ml', 22), i('muz', 1, 'adet', 15), i('bal', 2, 'yk', 10)],
    steps: 'Yulafı sütle 5 dakika pişir, dilimlenmiş muz ve bal ekle.' },
  { id: 'yogurt-kase', name: 'Yoğurtlu meyve kasesi', emoji: '🍓', slots: ['sabah'], min: 5, health: 5, meat: false, tags: ['tatli'],
    ing: [i('yoğurt', 300, 'g', 35), i('muz', 1, 'adet', 15), i('yulaf', 40, 'g', 8), i('ceviz', 30, 'g', 25)],
    steps: 'Yoğurdu kaseye al, meyve, yulaf ve cevizi üstüne diz.' },
  { id: 'tost', name: 'Kaşarlı tost', emoji: '🥪', slots: ['sabah'], min: 10, health: 2, meat: false, tags: ['hamur'],
    ing: [i('ekmek', 4, 'dilim', 16), i('kaşar', 80, 'g', 45), i('domates', 1, 'adet', 12)],
    steps: 'Ekmeğin arasına kaşar koy, tost makinesinde ya da tavada iki yüzünü kızart.' },
  { id: 'sucuklu', name: 'Sucuklu yumurta', emoji: '🥓', slots: ['sabah'], min: 10, health: 2, meat: true, tags: ['et'],
    ing: [i('yumurta', 3, 'adet', 33), i('sucuk', 100, 'g', 75), i('ekmek', 2, 'dilim', 8)],
    steps: 'Sucuk dilimlerini tavada çevir, yumurtaları üstüne kır, kapağı kapat.' },
  { id: 'yumurta-haslama', name: 'Haşlanmış yumurta tabağı', emoji: '🥚', slots: ['sabah'], min: 10, health: 4, meat: false, tags: ['sebze'],
    ing: [i('yumurta', 3, 'adet', 33), i('salatalık', 2, 'adet', 14), i('domates', 2, 'adet', 25), i('zeytin', 8, 'adet', 12)],
    steps: 'Yumurtaları 8 dakika haşla. Sebzeleri doğra, zeytinle birlikte tabağa diz.' },
  { id: 'pankek', name: 'Muzlu pankek', emoji: '🥞', slots: ['sabah'], min: 20, health: 3, meat: false, tags: ['tatli', 'hamur'],
    ing: [i('un', 120, 'g', 6), i('süt', 200, 'ml', 11), i('yumurta', 1, 'adet', 11), i('muz', 1, 'adet', 15)],
    steps: 'Un, süt ve yumurtayı çırp, tavada küçük pankekler pişir, muzla servis et.' },
  { id: 'cilbir', name: 'Çılbır', emoji: '🍯', slots: ['sabah'], min: 15, health: 4, meat: false, tags: ['sebze'],
    ing: [i('yumurta', 4, 'adet', 44), i('yoğurt', 200, 'g', 25), i('tereyağı', 10, 'g', 12), i('ekmek', 2, 'dilim', 8)],
    steps: 'Yumurtaları sirkeli suda poşe et, sarımsaklı yoğurdun üstüne koy, kızdırılmış tereyağı gezdir.' },
  { id: 'smoothie', name: 'Muzlu süt', emoji: '🥤', slots: ['sabah'], min: 5, health: 4, meat: false, tags: ['tatli'],
    ing: [i('muz', 2, 'adet', 30), i('süt', 300, 'ml', 17), i('yulaf', 30, 'g', 6)],
    steps: 'Her şeyi blenderdan geçir, bardağa doldur.' },
  { id: 'kahvalti-tabagi', name: 'Zengin kahvaltı tabağı', emoji: '🍽️', slots: ['sabah'], min: 20, health: 3, meat: true, tags: ['et', 'sebze'],
    ing: [i('yumurta', 3, 'adet', 33), i('peynir', 100, 'g', 55), i('zeytin', 10, 'adet', 15), i('sucuk', 100, 'g', 75), i('bal', 2, 'yk', 20), i('kaymak', 60, 'g', 50), i('domates', 2, 'adet', 25), i('salatalık', 2, 'adet', 14), i('ekmek', 4, 'dilim', 16)],
    steps: 'Yumurta ve sucuğu pişir, hepsini büyük bir tabağa güzelce diz. Çayı demle.' },
  { id: 'somon-tost', name: 'Somonlu avokado tost', emoji: '🥑', slots: ['sabah'], min: 10, health: 5, meat: true, tags: ['et'],
    ing: [i('ekmek', 2, 'dilim', 12), i('avokado', 1, 'adet', 70), i('somon', 100, 'g', 150), i('krem peynir', 40, 'g', 25), i('limon', 1, 'adet', 8)],
    steps: 'Ekmeği kızart, krem peynir ve ezilmiş avokadoyu sür, somonu diz, limon sık.' },

  /* ---- akşam ---- */
  { id: 'mercimek', name: 'Mercimek çorbası', emoji: '🥣', slots: ['aksam'], min: 30, health: 5, meat: false, tags: ['corba'],
    ing: [i('mercimek', 150, 'g', 25), i('soğan', 1, 'adet', 6), i('havuç', 1, 'adet', 6), i('patates', 1, 'adet', 10)],
    steps: 'Soğan ve havucu kavur, mercimek, patates ve suyu ekle. Yumuşayınca blenderdan geçir.' },
  { id: 'domates-corba', name: 'Domates çorbası', emoji: '🍅', slots: ['aksam'], min: 25, health: 3, meat: false, tags: ['corba'],
    ing: [i('domates', 4, 'adet', 50), i('un', 2, 'yk', 3), i('süt', 200, 'ml', 11), i('kaşar', 30, 'g', 17)],
    steps: 'Unu yağda kavur, rendelenmiş domates ve su ekle, sonunda sütü kat. Kaşarla servis et.' },
  { id: 'makarna-domates', name: 'Domates soslu makarna', emoji: '🍝', slots: ['aksam'], min: 20, health: 2, meat: false, tags: ['hamur'],
    ing: [i('makarna', 250, 'g', 30), i('domates', 3, 'adet', 38), i('peynir', 30, 'g', 15)],
    steps: 'Makarnayı haşla. Rendelenmiş domatesi yağda pişirip sos yap, makarnayla karıştır.' },
  { id: 'makarna-yogurt', name: 'Yoğurtlu makarna', emoji: '🍝', slots: ['aksam'], min: 20, health: 2, meat: false, tags: ['hamur'],
    ing: [i('makarna', 250, 'g', 30), i('yoğurt', 250, 'g', 30), i('sarımsak', 1, 'diş', 2)],
    steps: 'Makarnayı haşla, sarımsaklı yoğurt ve kızdırılmış yağla servis et.' },
  { id: 'bulgur', name: 'Domatesli bulgur pilavı', emoji: '🍲', slots: ['aksam'], min: 25, health: 4, meat: false, tags: ['sebze', 'hamur'],
    ing: [i('bulgur', 150, 'g', 18), i('domates', 2, 'adet', 25), i('biber', 1, 'adet', 8), i('soğan', 1, 'adet', 6)],
    steps: 'Soğan ve biberi kavur, domates ve bulguru ekle, iki ölçü sıcak suyla suyunu çekene kadar pişir.' },
  { id: 'patates-yemek', name: 'Patates yemeği', emoji: '🥔', slots: ['aksam'], min: 35, health: 3, meat: false, tags: ['sebze'],
    ing: [i('patates', 4, 'adet', 40), i('soğan', 1, 'adet', 6), i('domates', 2, 'adet', 25), i('biber', 1, 'adet', 8)],
    steps: 'Soğanı kavur, küp patates ve domatesi ekle, az suyla yumuşayana kadar pişir.' },
  { id: 'kuru-fasulye', name: 'Kuru fasulye', emoji: '🫘', slots: ['aksam'], min: 60, health: 4, meat: false, tags: ['sebze'],
    ing: [i('fasulye', 250, 'g', 50), i('soğan', 1, 'adet', 6), i('salça', 1, 'yk', 5)],
    steps: 'Fasulyeyi önceden ıslat. Soğan ve salçayı kavur, fasulyeyi ekle, düdüklüde 25 dakika pişir.' },
  { id: 'nohut', name: 'Nohutlu pilav', emoji: '🫘', slots: ['aksam'], min: 30, health: 4, meat: false, tags: ['sebze', 'hamur'],
    ing: [i('nohut', 1, 'kutu', 40), i('pirinç', 150, 'g', 25), i('soğan', 1, 'adet', 6), i('domates', 1, 'adet', 12)],
    steps: 'Soğan ve domatesi kavur, pirinci ekle, sıcak suyla pişir. Nohutu en sonda kat.' },
  { id: 'taze-fasulye', name: 'Zeytinyağlı taze fasulye', emoji: '🥬', slots: ['aksam'], min: 40, health: 5, meat: false, tags: ['sebze'],
    ing: [i('taze fasulye', 400, 'g', 70), i('soğan', 1, 'adet', 6), i('domates', 2, 'adet', 25)],
    steps: 'Soğanı zeytinyağında çevir, fasulye ve domatesi ekle, kısık ateşte yumuşayana kadar pişir.' },
  { id: 'mucver', name: 'Kabak mücver', emoji: '🥒', slots: ['aksam'], min: 30, health: 4, meat: false, tags: ['sebze'],
    ing: [i('kabak', 3, 'adet', 30), i('yumurta', 2, 'adet', 22), i('un', 3, 'yk', 4), i('peynir', 40, 'g', 20)],
    steps: 'Kabağı rendele, suyunu sık, diğer malzemeyle karıştır, kaşık kaşık tavada kızart.' },
  { id: 'tavuk-sote', name: 'Tavuk sote', emoji: '🍗', slots: ['aksam'], min: 30, health: 4, meat: true, tags: ['et', 'sebze'],
    ing: [i('tavuk', 300, 'g', 95), i('biber', 2, 'adet', 15), i('domates', 2, 'adet', 25), i('soğan', 1, 'adet', 6)],
    steps: 'Tavuğu yüksek ateşte sotele, sebzeleri ekle, birlikte pişir.' },
  { id: 'firin-tavuk', name: 'Fırında tavuk ve patates', emoji: '🍗', slots: ['aksam'], min: 50, health: 3, meat: true, tags: ['et'],
    ing: [i('tavuk', 500, 'g', 130), i('patates', 3, 'adet', 30), i('soğan', 1, 'adet', 6)],
    steps: 'Tavuk ve patatesi baharat ve yağla harmanla, 200 derece fırında kızarana kadar pişir.' },
  { id: 'tavuk-wrap', name: 'Tavuklu dürüm', emoji: '🌯', slots: ['aksam'], min: 20, health: 3, meat: true, tags: ['et', 'hamur'],
    ing: [i('lavaş', 2, 'adet', 20), i('tavuk', 200, 'g', 65), i('marul', 1, 'dal', 10), i('domates', 1, 'adet', 12), i('yoğurt', 100, 'g', 12)],
    steps: 'Tavuğu tavada pişir, lavaşa marul, domates, tavuk ve sarımsaklı yoğurt koyup sar.' },
  { id: 'tavuklu-pilav', name: 'Tavuklu pilav', emoji: '🍚', slots: ['aksam'], min: 35, health: 3, meat: true, tags: ['et', 'hamur'],
    ing: [i('tavuk', 250, 'g', 80), i('pirinç', 150, 'g', 25), i('tereyağı', 10, 'g', 12)],
    steps: 'Tavuğu haşla, suyuyla pirinci tereyağında demle, tavuğu didikleyip üstüne koy.' },
  { id: 'kofte', name: 'Köfte ve pilav', emoji: '🧆', slots: ['aksam'], min: 40, health: 3, meat: true, tags: ['et'],
    ing: [i('kıyma', 250, 'g', 165), i('soğan', 1, 'adet', 6), i('ekmek', 1, 'dilim', 4), i('yumurta', 1, 'adet', 11), i('pirinç', 150, 'g', 25)],
    steps: 'Kıyma, rendelenmiş soğan, ekmek içi ve yumurtayı yoğur, şekil ver, tavada pişir. Pilavla sun.' },
  { id: 'hamburger', name: 'Ev yapımı hamburger', emoji: '🍔', slots: ['aksam'], min: 30, health: 2, meat: true, tags: ['et'],
    ing: [i('kıyma', 250, 'g', 165), i('hamburger ekmeği', 2, 'adet', 30), i('kaşar', 40, 'g', 22), i('marul', 1, 'dal', 10), i('domates', 1, 'adet', 12)],
    steps: 'Köfteleri yassı şekillendir, tavada pişir, ekmeğe marul, domates ve kaşarla diz.' },
  { id: 'imam-bayildi', name: 'İmam bayıldı', emoji: '🍆', slots: ['aksam'], min: 60, health: 5, meat: false, tags: ['sebze'],
    ing: [i('patlıcan', 4, 'adet', 55), i('soğan', 2, 'adet', 12), i('domates', 3, 'adet', 38), i('sarımsak', 2, 'diş', 4), i('biber', 2, 'adet', 15)],
    steps: 'Patlıcanları alaca soy, kızart. İç harcı hazırla, doldur, fırında 30 dakika pişir.' },
  { id: 'karniyarik', name: 'Karnıyarık', emoji: '🍆', slots: ['aksam'], min: 60, health: 3, meat: true, tags: ['et', 'sebze'],
    ing: [i('patlıcan', 4, 'adet', 55), i('kıyma', 150, 'g', 100), i('soğan', 1, 'adet', 6), i('domates', 2, 'adet', 25), i('biber', 2, 'adet', 15)],
    steps: 'Patlıcanı kızart, kıymalı harcı yarıklara doldur, domates ve biberle fırında pişir.' },
  { id: 'manti', name: 'Mantı ve yoğurt', emoji: '🥟', slots: ['aksam'], min: 20, health: 2, meat: true, tags: ['hamur', 'et'],
    ing: [i('mantı', 400, 'g', 130), i('yoğurt', 250, 'g', 30), i('sarımsak', 1, 'diş', 2)],
    steps: 'Mantıyı haşla, sarımsaklı yoğurt ve kırmızı biberli yağla servis et.' },
  { id: 'ton-salata', name: 'Ton balıklı salata', emoji: '🥗', slots: ['aksam'], min: 10, health: 5, meat: true, tags: ['et', 'sebze'],
    ing: [i('ton balığı', 1, 'kutu', 115), i('marul', 1, 'dal', 10), i('mısır', 4, 'yk', 12), i('domates', 1, 'adet', 12), i('limon', 1, 'adet', 8)],
    steps: 'Marulu doğra, ton balığı ve mısırla karıştır, limon ve zeytinyağı gez.' },
  { id: 'sutlac', name: 'Fırın sütlaç', emoji: '🍮', slots: ['aksam'], min: 45, health: 2, meat: false, tags: ['tatli'],
    ing: [i('süt', 1000, 'ml', 55), i('pirinç', 100, 'g', 17), i('şeker', 100, 'g', 8)],
    steps: 'Pirinci haşla, süt ve şekeri ekleyip koyulaşana kadar karıştır, kaselere paylaştır.' },
  { id: 'somon-firin', name: 'Fırında somon ve sebze', emoji: '🐟', slots: ['aksam'], min: 30, health: 5, meat: true, tags: ['et', 'sebze'],
    ing: [i('somon', 300, 'g', 450), i('brokoli', 200, 'g', 45), i('limon', 1, 'adet', 8), i('patates', 2, 'adet', 20)],
    steps: 'Somon, brokoli ve patatesi tepsiye diz, limon ve yağ gez, 200 derece fırında 20 dakika pişir.' },
  { id: 'antrikot', name: 'Antrikot ve patates püresi', emoji: '🥩', slots: ['aksam'], min: 30, health: 3, meat: true, tags: ['et'],
    ing: [i('antrikot', 300, 'g', 360), i('patates', 3, 'adet', 30), i('tereyağı', 20, 'g', 24), i('süt', 100, 'ml', 6)],
    steps: 'Antrikotu çok sıcak tavada her yüzü 3 dakika mühürle, dinlendir. Patatesi haşlayıp tereyağı ve sütle ez.' },
  { id: 'karides', name: 'Karides güveç', emoji: '🦐', slots: ['aksam'], min: 30, health: 4, meat: true, tags: ['et'],
    ing: [i('karides', 250, 'g', 380), i('mantar', 150, 'g', 40), i('kaşar', 50, 'g', 28), i('biber', 2, 'adet', 15), i('domates', 1, 'adet', 12)],
    steps: 'Karides, mantar ve sebzeleri sotele, güveçlere paylaştır, üstüne kaşar serp, fırında üstü kızarana kadar tut.' },
  { id: 'kuzu-incik', name: 'Fırında kuzu incik', emoji: '🍖', slots: ['aksam'], min: 120, health: 3, meat: true, tags: ['et'],
    ing: [i('kuzu incik', 2, 'adet', 520), i('patates', 3, 'adet', 30), i('soğan', 2, 'adet', 12), i('havuç', 2, 'adet', 12)],
    steps: 'İncikleri sebzelerle folyoya sar, 170 derece fırında 2 saat pişir, son 15 dakika folyoyu aç.' },
  { id: 'kusbasi-guvec', name: 'Kuşbaşı etli sebze güveç', emoji: '🥘', slots: ['aksam'], min: 75, health: 3, meat: true, tags: ['et', 'sebze'],
    ing: [i('kuşbaşı', 300, 'g', 300), i('patates', 2, 'adet', 20), i('biber', 2, 'adet', 15), i('domates', 2, 'adet', 25), i('soğan', 1, 'adet', 6)],
    steps: 'Eti mühürle, sebzeleri ekle, güvece al, kısık ateşte ya da fırında yumuşayana kadar pişir.' },
];

/* ---------- dolap eşleşmesi ---------- */

const norm = (s: string) => s.toLocaleLowerCase('tr-TR').trim();
/** Eldeki bir ürün bu malzemeyi karşılıyor mu ("Süt (1 L)" süt, "Kaşar peyniri" kaşar sayılır). */
export const haveIng = (have: string[], need: string) => have.some(h => h.includes(need) || (h.length >= 4 && need.includes(h)));

/** Mutfak stoğundan "elde olan" ürün adları (Var ve Az). */
export const haveNames = (stock: StockItem[]) => stock.filter(x => x.lvl !== 'yok').map(x => norm(x.name)).filter(Boolean);

/* ---------- fiyat ve seviye ---------- */

/** Malzemelerin 2 kişilik toplamı. */
export const basePrice = (m: Meal) => m.ing.reduce((s, x) => s + x.p, 0);
/** Kişi sayısına göre yaklaşık fiyat, 5 TL'ye yuvarlı. */
export const priceFor = (ing: Ing[], servings: number) => Math.round((ing.reduce((s, x) => s + x.p, 0) * servings) / 2 / 5) * 5;
/** Kişi başı fiyata göre bütçe seviyesi. */
export const tierOf = (m: Meal): 'dusuk' | 'orta' | 'buyuk' => {
  const pp = basePrice(m) / 2;
  return pp <= 55 ? 'dusuk' : pp <= 130 ? 'orta' : 'buyuk';
};
/** Miktar metni: kişi sayısına göre ölçeklenir. */
export function qtyText(x: Ing, servings: number) {
  const v = (x.a * servings) / 2;
  const r = v >= 20 ? Math.round(v / 5) * 5 : Math.round(v * 2) / 2;
  return `${r} ${x.u}`;
}
export const healthLabel = (h: number) => (h >= 5 ? 'Çok sağlıklı' : h === 4 ? 'Sağlıklı' : h === 3 ? 'Dengeli' : h === 2 ? 'Keyif yemeği' : 'Arada bir');

/* ---------- öneri ---------- */

export type MealPick = {
  meal: Meal;
  have: Ing[];
  missing: Ing[];
  price: number;
  missingPrice: number;
  servings: number;
  tier: 'dusuk' | 'orta' | 'buyuk';
  /** Neden önerildi, kısa. */
  why: string;
  score: number;
};

function hash(s: string) {
  let x = 0;
  for (let k = 0; k < s.length; k++) x = (x * 31 + s.charCodeAt(k)) | 0;
  return Math.abs(x);
}

const BUDGET_RANK = { dusuk: 0, orta: 1, buyuk: 2 } as const;

/**
 * Kişiye göre sıralı yemek önerileri: süre sınırı, et yememe, bütçe, sevilen türler, sağlıklılık ve
 * dolapta olan malzemeler puanlanır. Aynı gün aynı sonuç gelir; ertesi gün biraz değişir.
 */
export function planMeals(a: Answers, stock: StockItem[], slot: Slot, n = 3, now = Date.now(), skip = 0): MealPick[] {
  const have = haveNames(stock);
  const servings = SERVINGS[a.who];
  const cap = timeCap(a);
  const vegOnly = a.tastes.includes('etsiz');
  const wanted: Taste[] = a.tastes.filter(t => t !== 'etsiz');
  const day = Math.floor(now / 864e5);
  const student = a.who === 'ogrenci';
  const picks: MealPick[] = [];
  for (const m of MEALS) {
    if (!m.slots.includes(slot)) continue;
    if (vegOnly && m.meat) continue;
    if (m.min > cap) continue;
    const tier = tierOf(m);
    const gap = BUDGET_RANK[tier] - BUDGET_RANK[a.budget];
    // Bütçeyi aşan tarif önerilmez; bütçenin altındakiler sorun değil.
    if (gap > 0) continue;
    const mi = m.ing.map(x => ({ x, has: haveIng(have, x.n) }));
    const hv = mi.filter(z => z.has).map(z => z.x);
    const ms = mi.filter(z => !z.has).map(z => z.x);
    let score = 0;
    let why = '';
    // Dolap: eksik azsa çok puan.
    const cover = hv.length / m.ing.length;
    score += cover * 40;
    if (!ms.length && have.length) why = 'Her şey dolapta';
    else if (cover >= 0.6) why = 'Çoğu dolapta';
    // Sevilen türler.
    const like = m.tags.filter(t => wanted.includes(t)).length;
    score += like * 14;
    if (like && !why) why = 'Sevdiklerinden';
    if (wanted.length && !like) score -= 8;
    // Sağlıklılık (disiplin, aile ve anne için biraz daha ağır).
    score += m.health * (a.who === 'anne' || a.who === 'aile' ? 5 : 3);
    // Bütçe: düşük bütçede ucuz, rahat bütçede etli/pahalı öne.
    const pp = basePrice(m) / 2;
    if (a.budget === 'dusuk') score += Math.max(0, 70 - pp) * 0.4;
    else if (a.budget === 'buyuk') {
      score += tier === 'buyuk' ? 22 : tier === 'orta' ? 8 : 0;
      if (m.meat && !vegOnly) score += 8;
      if (tier === 'buyuk' && !why) why = 'Güzel malzemeli';
    } else if (tier === 'orta') score += 6;
    if (student) {
      score += Math.max(0, 70 - pp) * 0.5;
      if (tier === 'dusuk' && !why) why = 'Cebe dost';
    }
    // Süre: yoğunsa hızlı olana, yemek sevene uzun olana puan.
    if (a.rhythm === 'yogun') score += Math.max(0, 30 - m.min) * 0.6;
    if (a.cook === 'sever' && m.min >= 40) score += 6;
    if (a.cook === 'sevmem') score += Math.max(0, 20 - m.min) * 0.8;
    if (!why && m.min <= 15) why = 'Çabuk';
    score += (hash(m.id + day) % 10) * 0.8; // günlük çeşitlilik
    picks.push({
      meal: m, have: hv, missing: ms, servings, tier, score, why: why || 'Sana uygun',
      price: priceFor(m.ing, servings), missingPrice: priceFor(ms, servings),
    });
  }
  picks.sort((p, q) => q.score - p.score);
  const start = picks.length ? skip % picks.length : 0;
  return [...picks.slice(start), ...picks.slice(0, start)].slice(0, n);
}
