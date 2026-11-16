import { CATS, CTASKS, ROOM_HOW, type ActId, type CatId, type CTask, type KindId } from './secimData';
import type { DayKey, Growth } from './types';

export { ACTS, CATS, CTASKS, ROOM_HOW } from './secimData';
export type { ActId, CatId, CTask } from './secimData';

/**
 * Seçmeli görevler: ev işlerinin dışında bakım, sağlık, ders, para, dijital ve sosyal işler.
 * Hepsi isteğe bağlı (puan / seri yok), kullanıcı kendi seçer. Her iş kısa bir "nasıl yapılır" taşır.
 *
 * Öneri formülü (`rank`):
 *   + 4 zincirin sıradaki adımı (öncekini yaptıysan; ör. klavye → mouse → ekran)
 *   + 3 "Evde neler yaparsın?" cevabıyla açılan iş
 *   + 2 kişi türüne uyan iş (öğrenci, çalışan, ebeveyn, tek yaşayan, ertelemeci, düzenli)
 *   + 1 vaktine sığan iş
 *   − 3 son 3 günde yapılan iş
 *   + küçük günlük titreşim (aynı gün hep aynı öneri, gün geçtikçe döner)
 * Seçimde kategori çeşitliliği: önce her kategoriden en iyisi, sonra kalan en iyiler.
 * Gün 1: en çok 3 dakikalık, ön koşulsuz 3 basit iş (`starterThree`); sonrası kullanıcının seçimidir.
 */
export type Ctx = { acts: ActId[]; kinds: KindId[]; maxMin?: number };

const K = 'c:';
const hash = (s: string) => [...s].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 7);
const jitter = (id: string, day: DayKey) => ((Math.abs(hash(id + day)) % 1000) / 1000) * 1.4;

export const taskById = (id: string): CTask | undefined => CTASKS.find(t => t.id === id);

export type CState = 'add' | 'done' | 'skip' | null;
export const cState = (G: Growth, day: DayKey, id: string): CState => (G.bonus?.[day]?.[K + id] as CState) ?? null;

/** Bu iş bugünden önceki son `days` günde yapıldı mı (bugün sayılmaz: yapınca liste yerinde kalsın). */
export function doneRecently(G: Growth, day: DayKey, id: string, days: number): boolean {
  const end = Date.parse(day + 'T00:00:00Z');
  return Object.keys(G.bonus ?? {}).some(d => {
    const age = end - Date.parse(d + 'T00:00:00Z');
    return G.bonus[d]?.[K + id] === 'done' && age > 0 && age <= days * 864e5;
  });
}
/** Kayıtlı (son 60 gün) hiçbir günde yapıldı mı. */
export const doneEver = (G: Growth, id: string): boolean => Object.values(G.bonus ?? {}).some(b => b?.[K + id] === 'done');

/** Cevaplara göre kullanılabilir işler: etkinlik gerektiren iş yalnızca o cevap seçiliyse; zincir devamı öncekinden sonra. */
export function available(G: Growth, ctx: Ctx): CTask[] {
  return CTASKS.filter(t => (!t.act || ctx.acts.includes(t.act)) && (!t.after || doneEver(G, t.after)));
}

export function rank(G: Growth, day: DayKey, ctx: Ctx, list: CTask[] = available(G, ctx)): CTask[] {
  const score = (t: CTask) =>
    (t.after ? 4 : 0) + (t.act ? 3 : 0) + (t.kinds?.some(k => ctx.kinds.includes(k)) ? 2 : 0) + (!ctx.maxMin || t.min <= ctx.maxMin ? 1 : 0) +
    (doneRecently(G, day, t.id, 3) ? -3 : 0) + jitter(t.id, day);
  return [...list].sort((a, b) => score(b) - score(a));
}

/** `n` öneri; kategori çeşitli. Bugün atlanan işler çıkarılır; yapılanlar yerinde kalır (✅). */
export function suggest(G: Growth, day: DayKey, ctx: Ctx, n: number): CTask[] {
  const pool = rank(G, day, ctx, available(G, ctx).filter(t => cState(G, day, t.id) !== 'skip' && (!ctx.maxMin || t.min <= ctx.maxMin)));
  // Bugün yapılanlar yerinde kalır (✅), zincirin yeni adımı onların yerini almaz.
  const out: CTask[] = pool.filter(t => cState(G, day, t.id) === 'done').slice(0, n);
  // Zincirin sıradaki adımları (en çok 2) kategori sınırına takılmaz.
  for (const t of pool.filter(x => x.after && !out.includes(x)).slice(0, 2)) if (out.length < n) out.push(t);
  const seen = new Set<CatId>(out.map(t => t.cat));
  for (const t of pool) {
    if (seen.has(t.cat) || out.length >= n) continue;
    seen.add(t.cat);
    out.push(t);
  }
  for (const t of pool) if (!out.includes(t) && out.length < n) out.push(t);
  return out;
}

/** Gün 1: en çok 3 dakikalık, ön koşulsuz, farklı kategorilerden 3 basit iş. */
export function starterThree(G: Growth, day: DayKey, kinds: KindId[]): CTask[] {
  const base = CTASKS.filter(t => !t.act && !t.after && t.min <= 3);
  return suggest(G, day, { acts: [], kinds, maxMin: 3 }, 3).filter(t => base.includes(t));
}

/** Zincirde `id`'den sonra gelen iş(ler): yapıldığında "Sıradaki" olarak gösterilir. */
export const nextOf = (id: string): CTask[] => CTASKS.filter(t => t.after === id);

/** Taslak `Growth` üzerinde işaretler; aynı değere tekrar dokunmak işareti kaldırır. Son 60 gün tutulur. */
export function setChoice(G: Growth, day: DayKey, id: string, v: 'add' | 'done' | 'skip') {
  const bonus = { ...(G.bonus ?? {}) };
  const cur = { ...(bonus[day] ?? {}) };
  if (cur[K + id] === v) delete cur[K + id];
  else cur[K + id] = v;
  bonus[day] = cur;
  const keep = Object.keys(bonus).sort().slice(-60);
  G.bonus = Object.fromEntries(keep.map(d => [d, bonus[d]]));
}

/** Kategorideki (kullanıcıya açık) bütün işler. */
export const inCat = (G: Growth, ctx: Ctx, cat: CatId) => available(G, ctx).filter(t => t.cat === cat);
export const catLabel = (id: CatId) => CATS.find(c => c.id === id);

/** Oda havuzundaki işin nasıl yapılacağı (2 adım). */
export const roomHow = (id: string): string[] => ROOM_HOW[id] ?? [];
