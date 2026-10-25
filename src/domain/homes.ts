import { baseCare, emptyProfile } from './home';
import { uid } from './logic';
import type { AppState, HomeData, SavedHome } from './types';

/**
 * Birden fazla ev (Premium). Açık ev her zamanki gibi state'in üst seviyesinde durur, böylece
 * bütün ekranlar değişmeden çalışır; diğer evler `others` listesinde bekler. Ev değiştirince
 * açık ev listeye kaldırılır, seçilen ev üste çıkar. Puan, seri, günlük, spor ve ayarlar ortak.
 * Bildirimler sadece açık ev için zamanlanır.
 */
const HOME_KEYS = ['cols', 'rows', 'cells', 'rooms', 'order', 'tasks', 'mod', 'home', 'mode', 'care', 'bills', 'warranties', 'seasonal'] as const;

/** Evin kendine ait kısmının kopyası. Ev profili, bakım, faturalar gibi sonradan eklenen alanlar eski kayıtlarda yoksa doldurulur. */
export function homeData(S: AppState | SavedHome): HomeData {
  const d = JSON.parse(JSON.stringify(Object.fromEntries(HOME_KEYS.map(k => [k, S[k]])))) as HomeData;
  d.home = { ...emptyProfile(), ...(d.home || {}) };
  d.mode ??= null;
  d.care ??= baseCare();
  d.bills ??= [];
  d.warranties ??= [];
  d.seasonal ??= {};
  return d;
}

const blank = (id: string, name: string): SavedHome =>
  ({ ...homeData({ cols: 6, rows: 8, cells: Array(48).fill(null), rooms: {}, order: [], tasks: {}, mod: {} } as unknown as SavedHome), id, name, setup: false });

const current = (S: AppState): SavedHome => ({ ...homeData(S), id: S.homeId, name: S.homeName, setup: S.setup });

function open(S: AppState, h: SavedHome) {
  Object.assign(S, homeData(h));
  S.homeId = h.id;
  S.homeName = h.name;
  S.setup = h.setup;
}

export const homeCount = (S: AppState) => 1 + S.others.length;

/** Taslak üzerinde başka bir eve geçer. */
export function switchHome(S: AppState, id: string) {
  const i = S.others.findIndex(h => h.id === id);
  if (i < 0 || id === S.homeId) return;
  const [next] = S.others.splice(i, 1);
  S.others.push(current(S));
  open(S, next);
}

/**
 * Yeni, boş bir ev açar; uygulama "Evini bloklarla kur" ekranına geçer.
 * Kurulumdan vazgeçilirse `cancelNewHome` önceki eve döner.
 */
export function addHome(S: AppState, name: string) {
  S.others.push(current(S));
  open(S, blank(uid(), name));
}

/** Henüz kurulmamış yeni evi siler ve listedeki son eve döner. */
export function cancelNewHome(S: AppState) {
  if (S.setup || !S.others.length) return;
  open(S, S.others.pop()!);
}

export function renameHome(S: AppState, id: string, name: string) {
  const n = name.trim().slice(0, 30);
  if (!n) return;
  if (id === S.homeId) S.homeName = n;
  else {
    const h = S.others.find(x => x.id === id);
    if (h) h.name = n;
  }
}

/** Açık olmayan bir evi kalıcı olarak siler. */
export function removeHome(S: AppState, id: string) {
  S.others = S.others.filter(h => h.id !== id);
}

/* ---------- aile paylaşımı ---------- */

/** Ailenin paylaşılan evinin bu telefondaki kimliği (üye için). Ev sahibinde kendi ev kimliği kullanılır. */
export const sharedHomeId = (ownerId: string) => `aile:${ownerId}`;

/**
 * Üye olunca paylaşılan evi açar. Bu telefonda kurulu bir ev varsa "Evlerim"e kaldırılır, silinmez.
 * Paylaşılan ev zaten listedeyse ona geçilir ve içi güncellenir.
 */
export function openShared(S: AppState, id: string, name: string, data: HomeData) {
  if (S.homeId !== id) {
    const i = S.others.findIndex(h => h.id === id);
    if (i > -1) S.others.splice(i, 1);
    if (S.setup) S.others.push(current(S));
  }
  open(S, { ...homeData(data as SavedHome), id, name, setup: true });
}

/** Aileden çıkınca paylaşılan evin bu telefondaki kopyasını siler; varsa başka bir eve döner. */
export function dropShared(S: AppState, id: string) {
  if (S.homeId !== id) return removeHome(S, id);
  const next = S.others.pop();
  if (next) open(S, next);
  else open(S, blank('ev1', 'Evim'));
}

/**
 * Aynı anda iki telefonda değişiklik olursa: sunucudaki ev esas alınır, ama iki tarafta da olan
 * işlerin "son yapılma" tarihi en yenisi olur. Böylece kimsenin "Tamamladım"ı kaybolmaz.
 * Telefondaki buzdolabı fotoğrafları korunur.
 */
export function mergeHome(remote: HomeData, local: HomeData): HomeData {
  const R = homeData(remote as SavedHome);
  const lastOf = new Map<string, number | null>();
  for (const rid of Object.keys(local.tasks)) for (const t of local.tasks[rid] ?? []) lastOf.set(t.id, t.last);
  for (const rid of Object.keys(local.mod)) for (const t of local.mod[rid]?.plants ?? []) lastOf.set(t.id, t.last);
  for (const t of local.care ?? []) lastOf.set(t.id, t.last);
  const pick = (t: { id: string; last: number | null }) => {
    const l = lastOf.get(t.id);
    if (l != null && (t.last == null || l > t.last)) t.last = l;
  };
  for (const rid of Object.keys(R.tasks)) (R.tasks[rid] ?? []).forEach(pick);
  R.care.forEach(pick);
  for (const rid of Object.keys(R.mod)) {
    (R.mod[rid]?.plants ?? []).forEach(pick);
    const lp = local.mod[rid];
    if (lp?.photo) R.mod[rid] = { ...R.mod[rid], photo: lp.photo, photoAt: lp.photoAt ?? null };
  }
  return R;
}

/** Paylaşılan evin sunucuya giden hâli: telefona özel fotoğraf yolları çıkarılır. */
export function forShare(S: AppState | HomeData): HomeData {
  const d = homeData(S as SavedHome);
  for (const k of Object.keys(d.mod)) d.mod[k] = { ...d.mod[k], photo: null, photoAt: null };
  d.care = d.care.map(t => ({ ...t, photo: null }));
  return d;
}
