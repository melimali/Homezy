import { CARE } from './constants';
import { placeOf } from './logic';
import type { AppState } from './types';

export type Hit = { id: string; group: 'Rutinler' | 'Ürünler' | 'Kıyafetler' | 'Bitkiler' | 'Evcil hayvan' | 'Alışveriş' | 'Odalar' | 'Ev bakımı'; emoji: string; title: string; sub: string; url: string };

/** Büyük/küçük harf ve Türkçe işaretlerden bağımsız karşılaştırma. */
export const norm = (s: string) =>
  s.toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Telefondaki bütün kayıtlarda arar: rutinler, ürünler, kıyafetler, bitkiler, evcil hayvanlar, alışveriş, odalar. En çok `max` sonuç. */
export function searchAll(S: AppState, q: string, max = 40): Hit[] {
  const n = norm(q.trim());
  if (n.length < 2) return [];
  const out: Hit[] = [];
  const has = (s: string) => norm(s).includes(n);
  const push = (h: Hit) => void (out.length < max && out.push(h));

  for (const rid of S.order) {
    const room = S.rooms[rid];
    if (!room) continue;
    const p = placeOf(S, rid);
    const url = `/oda/${rid}`;
    if (has(room.name)) push({ id: `r:${rid}`, group: 'Odalar', emoji: p.emoji, title: room.name, sub: 'Oda', url });
    for (const t of S.tasks[rid] ?? []) if (has(t.name)) push({ id: `t:${t.id}`, group: 'Rutinler', emoji: p.emoji, title: t.name, sub: p.name, url });
    for (const t of S.mod[rid]?.plants ?? []) if (has(t.name)) push({ id: `p:${t.id}`, group: 'Bitkiler', emoji: '🪴', title: t.name, sub: p.name, url });
    for (const x of S.mod[rid]?.stock ?? []) if (has(x.name)) push({ id: `s:${x.id}`, group: 'Ürünler', emoji: '📦', title: x.name, sub: p.name, url });
    for (const c of S.mod[rid]?.wardrobe ?? []) if (has(c.name) || (c.color && has(c.color))) push({ id: `c:${c.id}`, group: 'Kıyafetler', emoji: '👕', title: c.name, sub: p.name, url });
  }
  for (const t of S.care ?? []) if (has(t.name)) push({ id: `care:${t.id}`, group: 'Ev bakımı', emoji: '🔧', title: t.name, sub: placeOf(S, CARE).name, url: '/bakim' });
  for (const p of S.pets ?? []) {
    if (has(p.name)) push({ id: `pet:${p.id}`, group: 'Evcil hayvan', emoji: p.emoji ?? '🐾', title: p.name, sub: 'Evcil hayvan', url: '/evcil' });
    for (const it of p.items) if (has(it.name)) push({ id: `pi:${it.id}`, group: 'Evcil hayvan', emoji: it.emoji, title: it.name, sub: p.name, url: '/evcil' });
  }
  for (const i of S.shop ?? []) if (has(i.name)) push({ id: `sh:${i.id}`, group: 'Alışveriş', emoji: '🛒', title: i.name, sub: i.done ? 'Alındı' : 'Listede', url: '/alisveris' });
  return out;
}
