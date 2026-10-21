/**
 * Puanla alınan eşyalar. Sadece görev yaparak kazanılan puanla alınır; puan parayla satılmaz.
 * Fiyatlar sunucudaki `play_items` tablosuyla aynı olmalı (supabase/migrations/…_puan.sql).
 * Çizimleri `House3D.tsx` içinde (`itemShape`).
 */
export type ItemId =
  | 'saksi' | 'hali' | 'puf' | 'abajur' | 'kitaplik' | 'kedi' | 'kopek' | 'gitar'
  | 'akvaryum' | 'somine' | 'piyano';

export type Item = { id: ItemId; name: string; emoji: string; price: number; premium?: boolean };

export const ITEMS: Item[] = [
  { id: 'saksi', name: 'Saksı çiçeği', emoji: '🪴', price: 30 },
  { id: 'puf', name: 'Puf koltuk', emoji: '🪑', price: 40 },
  { id: 'hali', name: 'Tüylü halı', emoji: '🧶', price: 50 },
  { id: 'abajur', name: 'Abajur', emoji: '💡', price: 60 },
  { id: 'kitaplik', name: 'Kitaplık', emoji: '📚', price: 80 },
  { id: 'gitar', name: 'Gitar', emoji: '🎸', price: 90 },
  { id: 'kedi', name: 'Kedi', emoji: '🐱', price: 120 },
  { id: 'kopek', name: 'Köpek', emoji: '🐶', price: 120 },
  { id: 'akvaryum', name: 'Akvaryum', emoji: '🐠', price: 150, premium: true },
  { id: 'somine', name: 'Şömine', emoji: '🔥', price: 200, premium: true },
  { id: 'piyano', name: 'Piyano', emoji: '🎹', price: 250, premium: true },
];

export const ITEM: Record<string, Item | undefined> = Object.fromEntries(ITEMS.map(i => [i.id, i]));
