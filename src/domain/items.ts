/**
 * Puanla alınan eşyalar. Sadece görev yaparak kazanılan puanla alınır; puan parayla satılmaz.
 * Fiyatlar sunucudaki `play_items` tablosuyla aynı olmalı (supabase/migrations/…_puan.sql).
 * Çizimleri `House3D.tsx` içinde (`itemShape`).
 */
export type ItemId =
  | 'saksi' | 'hali' | 'puf' | 'abajur' | 'kitaplik' | 'kedi' | 'kopek' | 'gitar'
  | 'akvaryum' | 'somine' | 'piyano';

export type Item = { id: ItemId; name: string; emoji: string; price: number; premium?: boolean };

/** Bir kere alınan, ama odaya konmayan şeyler: Moka'nın bahçesindeki süsler ve evin kişilikleri (src/domain/garden.ts). */
export type Extra = { id: string; name: string; emoji: string; price: number; premium?: boolean; about: string };

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

/** Bahçe süsleri. Ucuzdan pahalıya. Sunucuda `play_items` (…_bahce.sql). */
export const DECOR: Extra[] = [
  { id: 'sulama', name: 'Sulama kabı', emoji: '🚿', price: 60, about: 'Bahçenin köşesinde minik bir sulama kabı.' },
  { id: 'ugurbocegi', name: 'Uğur böceği evi', emoji: '🐞', price: 90, about: 'Uğur böcekleri çiçeklerin arasında dolaşır.' },
  { id: 'hamak', name: "Moka'nın hamağı", emoji: '🪢', price: 120, about: 'Moka iki ağacın arasında dinlenir.' },
  { id: 'sera', name: 'Sera camı', emoji: '🏡', price: 180, premium: true, about: 'Kışın da yeşil bahçe: saksıların üstünde cam bir çatı.' },
];

/** Evin kişiliği: pencere ışığının rengi, süsler ve evin sözleri. Sıcak ücretsiz ve varsayılan. */
export type PersonaId = 'sicak' | 'sakin' | 'neseli';
export const PERSONAS: (Extra & { persona: PersonaId })[] = [
  { id: 'kisilik_sicak', persona: 'sicak', name: 'Sıcak', emoji: '🧡', price: 0, about: 'Turuncu ışıklar, şömine gibi. Çay demler, seni bekler.' },
  { id: 'kisilik_sakin', persona: 'sakin', name: 'Sakin', emoji: '💙', price: 150, about: 'Açık mavi ve lavanta ışıklar. Yavaş yavaş, acele yok.' },
  { id: 'kisilik_neseli', persona: 'neseli', name: 'Neşeli', emoji: '💛', price: 150, about: 'Renkli ışıklar ve bayrak süsleri. Her işe sevinir.' },
];

/** Satın alınabilen her tek seferlik şey: odaya konan eşyalar, bahçe süsleri, kişilikler. */
export const BUYABLE: Record<string, Item | Extra | undefined> = Object.fromEntries(
  [...ITEMS, ...DECOR, ...PERSONAS.filter(p => p.price > 0)].map(i => [i.id, i]),
);
