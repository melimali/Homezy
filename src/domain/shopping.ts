import { uid } from '@/domain/logic';
import type { AppState, ShopCat, ShopItem } from '@/domain/types';

export const SHOP_CATS: { id: ShopCat; emoji: string; label: string }[] = [
  { id: 'market', emoji: '🛒', label: 'Market' },
  { id: 'temizlik', emoji: '🧴', label: 'Temizlik' },
  { id: 'ev', emoji: '🏠', label: 'Ev' },
  { id: 'evcil', emoji: '🐾', label: 'Evcil hayvan' },
];
export const catOf = (id: ShopCat) => SHOP_CATS.find(c => c.id === id) ?? SHOP_CATS[0];

/** Sık alınanlar listesinde en çok bu kadar ürün tutulur. */
export const USUAL_CAP = 24;
/** Hafta içi alışveriş hatırlatması: cumartesi 10:00. */
export const SHOP_DAY = 6;

const same = (a: string, b: string) => a.trim().toLocaleLowerCase('tr-TR') === b.trim().toLocaleLowerCase('tr-TR');

/** Listeye ürün ekler; aynı adlı ve alınmamış bir ürün varsa tekrar eklemez. Eklendiyse true. */
export function addShop(S: AppState, name: string, cat: ShopCat, now = Date.now()): boolean {
  const n = name.trim();
  if (!n) return false;
  if (S.shop.some(x => !x.done && x.cat === cat && same(x.name, n))) return false;
  S.shop.unshift({ id: uid(), name: n, cat, done: false, at: now });
  return true;
}

export const toggleShop = (S: AppState, id: string) => {
  const x = S.shop.find(i => i.id === id);
  if (x) x.done = !x.done;
};

export const removeShop = (S: AppState, id: string) => {
  S.shop = S.shop.filter(i => i.id !== id);
};

/** Alınanları listeden kaldırır; kaldırılanlar "sık alınanlar"a girer (bitince tek dokunuşla geri eklenir). Kaldırılan sayısı döner. */
export function clearChecked(S: AppState): number {
  const gone = S.shop.filter(i => i.done);
  for (const g of gone) {
    S.shopUsual = [{ name: g.name, cat: g.cat }, ...S.shopUsual.filter(u => !(u.cat === g.cat && same(u.name, g.name)))].slice(0, USUAL_CAP);
  }
  S.shop = S.shop.filter(i => !i.done);
  return gone.length;
}

export const forgetUsual = (S: AppState, name: string, cat: ShopCat) => {
  S.shopUsual = S.shopUsual.filter(u => !(u.cat === cat && same(u.name, name)));
};

export const shopLeft = (S: AppState) => S.shop.filter(i => !i.done).length;

export type ShopSuggest = { name: string; cat: ShopCat; why: string };

const PET_FOOD = /mama|yem|kum/i;
/** Önerilerin kaynakları: evcil hayvan mama/kum işleri, odalardaki biten/azalan ürünler, sık alınanlar. Listede olanlar çıkarılır. */
export function suggestions(S: AppState, now = Date.now()): ShopSuggest[] {
  const out: ShopSuggest[] = [];
  for (const p of S.pets ?? [])
    for (const it of p.items) {
      if (!PET_FOOD.test(it.name)) continue;
      const due = (it.last ?? it.start) + it.everyH * 36e5 - now;
      if (due < 36e5 * 24 * 2) out.push({ name: `${it.name} (${p.name})`, cat: 'evcil', why: p.name });
    }
  for (const rid of S.order)
    for (const x of S.mod[rid]?.stock ?? [])
      if (x.lvl !== 'var') out.push({ name: x.name, cat: rid.includes('banyo') || rid.includes('camasir') ? 'temizlik' : 'market', why: x.lvl === 'yok' ? 'bitti' : 'azaldı' });
  for (const u of S.shopUsual) out.push({ name: u.name, cat: u.cat, why: 'sık alınan' });
  const seen = new Set<string>();
  return out.filter(s => {
    const k = `${s.cat}|${s.name.toLocaleLowerCase('tr-TR')}`;
    if (seen.has(k) || S.shop.some(x => !x.done && x.cat === s.cat && same(x.name, s.name))) return false;
    seen.add(k);
    return true;
  });
}

/** Paylaşmak için düz metin: kategori başlığı, altında "☐ ürün" satırları. Alınmamışlar. */
export function shopText(S: AppState): string {
  const parts: string[] = [];
  for (const c of SHOP_CATS) {
    const xs = S.shop.filter(i => !i.done && i.cat === c.id);
    if (xs.length) parts.push(`${c.emoji} ${c.label}\n${xs.map(x => `☐ ${x.name}`).join('\n')}`);
  }
  return parts.join('\n\n');
}

export type { ShopItem };
