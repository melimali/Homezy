import type { AppState, ShopCat, ShopItem } from './types';

/** Kayıt en fazla bu kadar tutulur. */
export const LOG_CAP = 500;
const MONTHS_KEPT = 13;

const monthStart = (ts: number) => {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
};

/** Fiyat metnini sayıya çevirir: "12,5" ve "12.5" olur. Geçersiz ya da negatifse null. */
export function parsePrice(raw: string): number | null {
  const n = Number(raw.trim().replace(',', '.'));
  return Number.isFinite(n) && n >= 0 && n < 1_000_000 ? Math.round(n * 100) / 100 : null;
}

export const setPrice = (S: AppState, id: string, price: number | null) => {
  const x = S.shop.find(i => i.id === id);
  if (!x) return;
  if (price == null || price === 0) delete x.price;
  else x.price = price;
};

export function setLimit(S: AppState, limit: number) {
  S.budget ??= { limit: 0, log: [] };
  S.budget.limit = Math.max(0, limit);
}

/** Listedeki alınmamış ürünlerin tahmini toplamı. */
export const listTotal = (S: AppState, only?: (i: ShopItem) => boolean) =>
  S.shop.filter(i => !i.done && (!only || only(i))).reduce((a, i) => a + (i.price ?? 0), 0);

/** Sepette (işaretlenmiş) olan fiyatlı ürünlerin toplamı. */
export const cartTotal = (S: AppState) => S.shop.filter(i => i.done).reduce((a, i) => a + (i.price ?? 0), 0);

/** İşaretlenmiş fiyatlı ürünleri harcama kaydına yazar (alınanları temizlerken çağrılır). */
export function logPurchases(S: AppState, now = Date.now()): number {
  S.budget ??= { limit: 0, log: [] };
  let total = 0;
  for (const i of S.shop) {
    if (!i.done || !i.price) continue;
    S.budget.log.push({ at: now, name: i.name, cat: i.cat, amt: i.price });
    total += i.price;
  }
  const cut = new Date(monthStart(now));
  cut.setMonth(cut.getMonth() - (MONTHS_KEPT - 1));
  S.budget.log = S.budget.log.filter(e => e.at >= cut.getTime()).slice(-LOG_CAP);
  return total;
}

export type MonthSpend = { total: number; byCat: Partial<Record<ShopCat, number>>; count: number };

/** `now` ayında yapılan harcamalar. */
export function spentIn(S: AppState, now = Date.now()): MonthSpend {
  const lo = monthStart(now);
  const d = new Date(lo);
  const hi = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  const out: MonthSpend = { total: 0, byCat: {}, count: 0 };
  for (const e of S.budget?.log ?? []) {
    if (e.at < lo || e.at >= hi) continue;
    out.total += e.amt;
    out.count++;
    out.byCat[e.cat] = (out.byCat[e.cat] ?? 0) + e.amt;
  }
  return out;
}

/** Son `n` ayın toplamları (eskiden yeniye). */
export function lastMonths(S: AppState, n = 6, now = Date.now()) {
  const out: { label: number; month: number; total: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i, 1);
    out.push({ label: d.getFullYear(), month: d.getMonth(), total: spentIn(S, d.getTime()).total });
  }
  return out;
}

export const money = (n: number) => `${Math.round(n * 100) % 100 === 0 ? Math.round(n) : n.toFixed(2)} ₺`;
