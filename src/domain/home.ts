import { BILL_WARN, CARE, DAY, WARRANTY_WARN } from './constants';
import type { AppState, Bill, CheckItem, HomeProfile, ModeKind, ProfileKey, RoomType, Task, TaskList, Warranty } from './types';

/**
 * Evin kendisiyle ilgili kurallar: kurulum soruları, ev bakımı, modlar, faturalar, garanti belgeleri
 * ve mevsimlik işler. Hepsi telefonda çalışır; fonksiyonlar `now` alır.
 */

const id = () => Math.random().toString(36).slice(2, 9);
const sodOf = (ts: number) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
/** İki gün arasındaki gün farkı (yaz saati kaymalarından etkilenmez). */
export const dayDiff = (from: number, to: number) => Math.round((sodOf(to) - sodOf(from)) / DAY);

/* ---------- kurulum soruları ---------- */

/** Profilden gelen bir iş: `room` türündeki ilk odaya (yoksa ev bakımına) eklenir. */
type ProfileTask = { name: string; every: number; min: number; room?: RoomType[]; plant?: boolean };

export const PROFILE: { k: ProfileKey; q: string; short: string; emoji: string; tasks: ProfileTask[] }[] = [
  {
    k: 'evcil', short: 'Evcil hayvan', q: 'Evcil hayvanın var mı?', emoji: '🐾',
    tasks: [
      { name: 'Tüy süpürme', every: 2, min: 10, room: ['salon', 'yatak'] },
      { name: 'Mama ve su kabını yıka', every: 1, min: 5, room: ['mutfak'] },
      { name: 'Yatağını ve battaniyesini yıka', every: 14, min: 10, room: ['camasir', 'salon'] },
    ],
  },
  {
    k: 'bulasik', short: 'Bulaşık makinesi', q: 'Bulaşık makinen var mı?', emoji: '🍽️',
    tasks: [
      { name: 'Bulaşık makinesini boşalt', every: 1, min: 5, room: ['mutfak'] },
      { name: 'Bulaşık makinesi filtresi', every: 30, min: 10, room: ['mutfak'] },
    ],
  },
  {
    k: 'hali', short: 'Halı', q: 'Evde halı var mı?', emoji: '🧶',
    tasks: [
      { name: 'Halı süpürme', every: 3, min: 15, room: ['salon', 'yatak'] },
      { name: 'Halı yıkatma', every: 180, min: 30 },
    ],
  },
  {
    k: 'kombi', short: 'Kombi', q: 'Kombin var mı?', emoji: '🔥',
    tasks: [
      { name: 'Kombi bakımı', every: 365, min: 60 },
      { name: 'Peteklerin havasını al', every: 365, min: 20 },
      { name: 'Kombi basıncını kontrol et', every: 30, min: 2 },
    ],
  },
  {
    k: 'klima', short: 'Klima', q: 'Klima var mı?', emoji: '❄️',
    tasks: [
      { name: 'Klima filtresi temizliği', every: 30, min: 15 },
      { name: 'Klima bakımı', every: 365, min: 60 },
    ],
  },
  {
    k: 'aritma', short: 'Su arıtma', q: 'Su arıtma cihazın var mı?', emoji: '💧',
    tasks: [{ name: 'Su arıtma filtresi değişimi', every: 180, min: 20 }],
  },
  {
    k: 'bitki', short: 'Saksı bitkileri', q: 'Saksı bitkilerin var mı?', emoji: '🪴',
    tasks: [
      { name: 'Saksı bitkileri', every: 4, min: 5, room: ['salon', 'balkon'], plant: true },
      { name: 'Bitki yapraklarını sil', every: 30, min: 10, room: ['salon', 'balkon'] },
    ],
  },
];

export const emptyProfile = (): HomeProfile => ({
  asked: false, evcil: false, bulasik: false, hali: false, kombi: false, klima: false, aritma: false, bitki: false,
});

const tagOf = (k: ProfileKey) => `p:${k}`;

/** Bir işin hangi listede durduğu: oda rutini, bitki ya da ev bakımı. */
function listFor(S: AppState, t: ProfileTask): { rid: string; list: TaskList; arr: Task[] } {
  for (const type of t.room ?? []) {
    const rid = S.order.find(r => S.rooms[r].type === type);
    if (!rid) continue;
    if (t.plant) {
      const m = (S.mod[rid] ||= {});
      return { rid, list: 'plants', arr: (m.plants ||= []) };
    }
    return { rid, list: 'tasks', arr: (S.tasks[rid] ||= []) };
  }
  return { rid: CARE, list: 'care', arr: S.care };
}

function eachList(S: AppState, fn: (arr: Task[]) => void) {
  fn(S.care);
  for (const rid of S.order) {
    fn(S.tasks[rid] || []);
    const p = S.mod[rid]?.plants;
    if (p) fn(p);
  }
}

/**
 * Cevaplara göre işleri ekler ya da kaldırır (taslak üzerinde). "Evet" olan sorunun işleri yoksa
 * eklenir; "hayır" olanın etiketli işleri silinir. Kullanıcının kendi eklediği işlere dokunmaz.
 */
export function applyProfile(S: AppState, next: HomeProfile) {
  S.home = { ...next, asked: true };
  let added = 0;
  for (const p of PROFILE) {
    const tag = tagOf(p.k);
    if (!next[p.k]) {
      eachList(S, arr => {
        for (let i = arr.length - 1; i >= 0; i--) if (arr[i].tag === tag) arr.splice(i, 1);
      });
      continue;
    }
    for (const t of p.tasks) {
      let exists = false;
      eachList(S, arr => void (exists ||= arr.some(x => x.tag === tag && x.name === t.name)));
      if (exists) continue;
      listFor(S, t).arr.push({ id: id(), name: t.name, every: t.every, min: t.min, last: null, tag, snooze: firstDue(t.every, added++) });
    }
  }
}

/**
 * Yeni eklenen işin ilk vadesi. Hepsi aynı gün "bugün" olmasın diye günlük işler hariç
 * birkaç güne yayılır; sonra her iş kendi sıklığıyla devam eder.
 */
function firstDue(every: number, i: number) {
  if (every <= 1) return null;
  return inDays(Math.min(Math.ceil(every / 2), 2 + i));
}

/** Her evde olan bakım işleri; ilk açılışta bir kere eklenir, sonra silinebilir. */
export const baseCare = (): Task[] => [
  { id: id(), name: 'Duman dedektörünü test et', every: 30, min: 2, last: null, tag: 'b:dedektor', snooze: firstDue(30, 1) },
  { id: id(), name: 'Sayaç fotoğrafı (elektrik, su, doğalgaz)', every: 30, min: 5, last: null, tag: 'b:sayac', photo: null, snooze: firstDue(30, 3) },
  { id: id(), name: 'Çamaşır makinesi kazan temizliği', every: 60, min: 5, last: null, tag: 'b:kazan', snooze: firstDue(60, 5) },
];

/** Fotoğrafla yapılan iş mi (sayaç). */
export const isPhotoTask = (t: Task) => t.tag === 'b:sayac';

/* ---------- süre ---------- */

/** Ada göre tahmini süre: rutinde süre girilmemişse kullanılır. */
const MIN_GUESS: [RegExp, number][] = [
  [/sula|havalandır|çöp|tezgah|havlu|kontrol|test/i, 5],
  [/toz|masa|ayakkabı|oyuncak|filtre|lavabo|klozet/i, 10],
  [/süpür|yer silme|çarşaf|duş|küvet/i, 15],
  [/bulaşık|ütü/i, 20],
  [/cam|fırın|buzdolabı/i, 30],
  [/bakım/i, 60],
];
export const taskMin = (t: Task) => t.min ?? MIN_GUESS.find(([re]) => re.test(t.name))?.[1] ?? 10;

/* ---------- modlar ---------- */

export const MODES: Record<ModeKind, { label: string; emoji: string; text: string }> = {
  misafir: { label: 'Misafir geliyor', emoji: '🫖', text: 'Misafirin göreceği yerler öne çıkar: salon, antre, banyo, mutfak.' },
  tatil: { label: 'Tatile gidiyorum', emoji: '🏖️', text: 'Rutinler donar, hatırlatma gelmez. Dönünce kaldığın yerden devam eder.' },
  yogun: { label: 'Yoğunum / hastayım', emoji: '🤒', text: 'Sadece her gün yapılan işler görünür. Gerisi seni beklesin.' },
  bayram: { label: 'Bayram temizliği', emoji: '✨', text: 'Büyük temizlik için adım adım bir liste. Bitirdikçe işaretle.' },
};
export const MODE_KINDS = Object.keys(MODES) as ModeKind[];

/** Misafirin göreceği odalar. */
export const GUEST_ROOMS: RoomType[] = ['salon', 'antre', 'banyo', 'mutfak', 'balkon'];

const BAYRAM = [
  'Perdeleri yıka', 'Camları sil', 'Halıları süpür ya da yıkat', 'Dolapların içini düzenle', 'Buzdolabını temizle',
  'Fırını ve ocağı temizle', 'Avizeleri ve lambaları sil', 'Kapıları ve kulpları sil', 'Koltukları süpür',
  'Misafir havlularını ve nevresimi hazırla', 'Balkonu yıka', 'İkramlıkları al',
];
export const bayramList = (): CheckItem[] => BAYRAM.map(name => ({ id: id(), name, done: false }));

/**
 * Tatil bitince rutinler kaldığı yerden devam etsin: son yapılma ve erteleme tarihleri,
 * tatilde geçen gün kadar ileri kaydırılır (taslak üzerinde).
 */
export function thawVacation(S: AppState, now = Date.now()) {
  if (S.mode?.k !== 'tatil') return;
  const days = dayDiff(S.mode.since, now);
  if (days <= 0) return;
  const shift = (t: Task) => {
    if (t.last != null) t.last += days * DAY;
    if (t.snooze != null) t.snooze = sodOf(t.snooze + days * DAY + DAY / 2);
  };
  eachList(S, arr => arr.forEach(shift));
}

/* ---------- faturalar ---------- */

const pad = (n: number) => String(n).padStart(2, '0');
export const monthKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

/** Bu ayki son ödeme günü (ay kısaysa ayın son günü). */
function billDue(b: Bill, now: number) {
  const d = new Date(now);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return new Date(d.getFullYear(), d.getMonth(), Math.min(b.day, last)).getTime();
}

export type BillStatus = { paid: boolean; diff: number; k: 'late' | 'today' | 'ok'; label: string; due: number };

export function billStatus(b: Bill, now = Date.now()): BillStatus {
  const due = billDue(b, now);
  const diff = dayDiff(now, due);
  if (b.paid === monthKey(now)) return { paid: true, diff, k: 'ok', label: 'Bu ay ödendi ✓', due };
  if (diff < 0) return { paid: false, diff, k: 'late', label: `${-diff} gün geçti`, due };
  if (diff === 0) return { paid: false, diff, k: 'today', label: 'Son gün bugün', due };
  if (diff <= BILL_WARN) return { paid: false, diff, k: 'today', label: `${diff} gün kaldı`, due };
  return { paid: false, diff, k: 'ok', label: `Ayın ${dayOfMonth(b.day)}`, due };
}

/** "5'i, 10'u, 3'ü…" (ayın günü, 1-31). */
export const dayOfMonth = (n: number) => `${n}'${dayEnd(n)}`;

function dayEnd(n: number) {
  if (n === 10 || n === 30) return 'u';
  if (n === 20) return 'si';
  return ['', 'i', 'si', 'ü', 'ü', 'i', 'sı', 'si', 'i', 'u'][n % 10];
}

/* ---------- garanti belgeleri ---------- */

export type WarrantyStatus = { k: 'late' | 'today' | 'ok'; days: number; label: string };

export function warrantyStatus(w: Warranty, now = Date.now()): WarrantyStatus {
  const days = dayDiff(now, w.end);
  if (days < 0) return { k: 'late', days, label: 'Garanti bitti' };
  if (days === 0) return { k: 'today', days, label: 'Bugün bitiyor' };
  if (days <= WARRANTY_WARN) return { k: 'today', days, label: `${days} gün kaldı` };
  const months = Math.round(days / 30);
  return { k: 'ok', days, label: months >= 12 ? `${Math.floor(months / 12)} yıl ${months % 12 ? `${months % 12} ay ` : ''}kaldı` : `${months} ay kaldı` };
}

/* ---------- mevsimlik işler ---------- */

/** `months`: 1 ocak … 12 aralık. */
export const SEASONAL: { id: string; name: string; emoji: string; months: number[]; wardrobe?: boolean }[] = [
  { id: 'bahar', name: 'Bahar temizliği', emoji: '🌸', months: [3, 4] },
  { id: 'yazlik', name: 'Dolap değişimi: yazlıkları çıkar', emoji: '👕', months: [4, 5], wardrobe: true },
  { id: 'sineklik', name: 'Sineklikleri tak', emoji: '🦟', months: [4, 5] },
  { id: 'salca', name: 'Salça yap', emoji: '🍅', months: [8, 9] },
  { id: 'tursu', name: 'Turşu kur', emoji: '🥒', months: [9, 10] },
  { id: 'kislik', name: 'Dolap değişimi: kışlıkları çıkar', emoji: '🧥', months: [10, 11], wardrobe: true },
  { id: 'kis', name: 'Kışlık hazırlık (petek, cam bandı, battaniye)', emoji: '❄️', months: [10, 11] },
];

/** Bu ay zamanı gelmiş ve bu yıl henüz yapılmamış mevsimlik işler. */
export function seasonalNow(S: AppState, now = Date.now()) {
  const d = new Date(now);
  return SEASONAL.filter(x => x.months.includes(d.getMonth() + 1) && S.seasonal[x.id] !== d.getFullYear());
}

export const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/* ---------- tarih girişi ---------- */

/** "12.05.2027", "12/5/27" ya da "12 5 2027" → o günün başlangıcı. Geçersizse null. */
export function parseDate(text: string): number | null {
  const m = text.trim().match(/^(\d{1,2})[./\s-](\d{1,2})[./\s-](\d{2}|\d{4})$/);
  if (!m) return null;
  const [dd, mm, yy] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const year = yy < 100 ? 2000 + yy : yy;
  const d = new Date(year, mm - 1, dd);
  if (d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  return d.getTime();
}

export const fmtDate = (ts: number) => {
  const d = new Date(ts);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

/** Bugünden `days` gün sonrası (günün başlangıcı). */
export const inDays = (days: number, now = Date.now()) => sodOf(sodOf(now) + days * DAY + DAY / 2);
