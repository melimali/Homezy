import { useCallback, useSyncExternalStore } from 'react';

import { prefs } from '@/lib/supabase';

/**
 * Düzenlenebilir sekmeler (Ev, Bugün, Gelişim): hangi blok görünür, hangi sırada.
 * `fixed` bloklar kaldırılamaz. Seçim telefona yazılır (prefs), sunucu yok.
 */
export type TabId = 'ev' | 'bugun' | 'gelisim';
export type BlockDef = { id: string; title: string; emoji: string; fixed?: boolean; off?: boolean };

export const BLOCKS: Record<TabId, BlockDef[]> = {
  ev: [
    { id: 'stats', title: 'Seri, puan, seviye', emoji: '🔥' },
    { id: 'isler', title: 'Bugünün işleri', emoji: '✅', fixed: true },
    { id: 'evim', title: '3B evim', emoji: '🏡', fixed: true },
    { id: 'odalar', title: 'Odalarım', emoji: '🚪', fixed: true },
    { id: 'pets', title: 'Evcil hayvanlar', emoji: '🐾' },
    { id: 'shop', title: 'Mağaza', emoji: '🛍️', off: true },
    { id: 'keyif', title: 'Keyif köşesi', emoji: '🌷' },
  ],
  bugun: [
    { id: 'hafta', title: 'Gün şeridi', emoji: '📆' },
    { id: 'hero', title: 'İlerleme ve sıradaki iş', emoji: '🎯', fixed: true },
    { id: 'filtre', title: 'Oda filtreleri', emoji: '🔎' },
    { id: 'liste', title: 'Bugünün işleri', emoji: '✅', fixed: true },
    { id: 'bonus', title: 'Seçim ve bonus işler', emoji: '🎁', off: true },
    { id: 'ilac', title: 'İlaç ve evcil hayvan', emoji: '💊' },
    { id: 'hedef', title: 'Günlük hedefler', emoji: '⭐' },
    { id: 'daha', title: 'Yemek, kendine zaman, büyüme', emoji: '✨', off: true },
    { id: 'buhafta', title: 'Bu hafta', emoji: '🗓️' },
    { id: 'alinacak', title: 'Alınacaklar', emoji: '🛒' },
    { id: 'mod', title: 'Mod ve vaktim var', emoji: '🧘', off: true },
    { id: 'bakim', title: 'Ev bakımı', emoji: '🔧' },
  ],
  gelisim: [
    { id: 'hero', title: 'Bu hafta özeti', emoji: '🌱', fixed: true },
    { id: 'halkalar', title: 'Bugün ve ev puanı', emoji: '⭕', fixed: true },
    { id: 'seri', title: 'Seri sayıları', emoji: '🔥', fixed: true },
    { id: 'tip', title: 'Senin tipin', emoji: '🧩', off: true },
    { id: 'buyume', title: 'Kendini geliştir', emoji: '📚', off: true },
    { id: 'moka', title: 'Moka seviyesi', emoji: '☕' },
    { id: 'bars', title: 'Haftalık grafik', emoji: '📊' },
    { id: 'takvim', title: 'Seri takvimi', emoji: '📅' },
    { id: 'isi', title: 'Isı haritası', emoji: '🟩', off: true },
    { id: 'mokahafta', title: 'Moka haftalık raporu', emoji: '📝', off: true },
    { id: 'ruh', title: 'Ruh hali', emoji: '😊', off: true },
    { id: 'odabars', title: 'Oda puanları', emoji: '🏠', off: true },
    { id: 'linkler', title: 'Haftam, Günüm, Sıralama', emoji: '🔗', off: true },
  ],
};

export type Saved = { order: string[]; on: string[] };
export type Layout = { items: (BlockDef & { visible: boolean })[]; ids: string[] };

const key = (t: TabId) => `layout.${t}`;
const subs = new Set<() => void>();
const cache = new Map<string, Layout>();

function read(t: TabId): Saved | null {
  try {
    const raw = prefs.get(key(t));
    const v = raw ? (JSON.parse(raw) as Partial<Saved>) : null;
    if (!v || !Array.isArray(v.order)) return null;
    return { order: v.order.filter(x => typeof x === 'string'), on: Array.isArray(v.on) ? v.on.filter(x => typeof x === 'string') : [] };
  } catch {
    return null;
  }
}

/** Kayıtlı düzen + varsayılanlar: bilinmeyen blok atılır, yeni blok varsayılan yerine eklenir, sabitler her zaman açık. */
export function resolve(t: TabId, saved: Saved | null): Layout {
  const defs = BLOCKS[t];
  const byId = new Map(defs.map(d => [d.id, d]));
  const order = (saved?.order ?? []).filter(id => byId.has(id));
  const rest = defs.filter(d => !order.includes(d.id));
  // Kayıtta olmayan blokları varsayılan sıradaki komşularının yanına değil sona koy.
  const ids = saved ? [...order, ...rest.map(d => d.id)] : defs.map(d => d.id);
  const items = ids.map(id => {
    const d = byId.get(id)!;
    const visible = d.fixed || (saved ? saved.on.includes(id) || (!saved.order.includes(id) && !d.off) : !d.off);
    return { ...d, visible };
  });
  return { items, ids: items.filter(i => i.visible).map(i => i.id) };
}

function get(t: TabId): Layout {
  let l = cache.get(t);
  if (!l) {
    l = resolve(t, read(t));
    cache.set(t, l);
  }
  return l;
}

export function saveLayout(t: TabId, items: { id: string; visible: boolean }[] | null) {
  if (!items) prefs.set(key(t), null);
  else prefs.set(key(t), JSON.stringify({ order: items.map(i => i.id), on: items.filter(i => i.visible).map(i => i.id) } satisfies Saved));
  cache.delete(t);
  subs.forEach(f => f());
}

export function useTabLayout(t: TabId) {
  const layout = useSyncExternalStore(
    useCallback(f => { subs.add(f); return () => void subs.delete(f); }, []),
    () => get(t),
  );
  return layout;
}
