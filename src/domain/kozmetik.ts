/**
 * Moka kozmetikleri (docs/moka-kozmetik-plani.md). Her eşya 1254×1254 tuvalde Moka'nın üstüne oturur
 * (assets/moka/esya/<id>.webp, scripts/make-moka-rig.py). Slot başına tek eşya.
 * Fiyatlar supabase/migrations/20261117100000_kozmetik.sql ile aynı olmalı. Fiyatı 0 olan herkese açıktır.
 */
export type SlotId = 'bas' | 'govde' | 'el';
export type Cosmetic = { id: string; slot: SlotId; name: string; emoji: string; price: number; premium?: boolean };

export const SLOTS: { id: SlotId; label: string }[] = [
  { id: 'bas', label: 'Baş' },
  { id: 'govde', label: 'Gövde' },
  { id: 'el', label: 'El' },
];

export const COSMETICS: Cosmetic[] = [
  { id: 'bas_balkabagi', slot: 'bas', name: 'Balkabağı kask', emoji: '🎃', price: 160, premium: true },
  { id: 'bas_kahve_cekirdegi_tac', slot: 'bas', name: 'Kahve çekirdeği tacı', emoji: '☕', price: 120 },
  { id: 'bas_mantar', slot: 'bas', name: 'Mantar şapka', emoji: '🍄', price: 120 },
  { id: 'bas_kus_yuvasi', slot: 'bas', name: 'Kuş yuvası', emoji: '🪺', price: 120 },
  { id: 'bas_cay_demligi', slot: 'bas', name: 'Çaydanlık şapka', emoji: '🫖', price: 120 },
  { id: 'bas_kruvasan', slot: 'bas', name: 'Kruvasan', emoji: '🥐', price: 80 },
  { id: 'bas_uyku_takkesi', slot: 'bas', name: 'Uyku takkesi', emoji: '🌙', price: 80 },
  { id: 'bas_cicek_saksi', slot: 'bas', name: 'Çiçek saksısı', emoji: '🪴', price: 80 },
  { id: 'bas_dondurma', slot: 'bas', name: 'Dondurma', emoji: '🍦', price: 80 },
  { id: 'bas_yagmur_bulutu', slot: 'bas', name: 'Yağmur bulutu', emoji: '🌧️', price: 120 },
  { id: 'bas_hasir_sapka', slot: 'bas', name: 'Hasır şapka', emoji: '👒', price: 0 },
  { id: 'bas_kedi_kulagi', slot: 'bas', name: 'Kedi kulağı', emoji: '🐱', price: 80 },
  { id: 'bas_asci_sapkasi', slot: 'bas', name: 'Aşçı şapkası', emoji: '👨‍🍳', price: 80 },
  { id: 'bas_tac', slot: 'bas', name: 'Taç', emoji: '👑', price: 160, premium: true },
  { id: 'bas_kulaklik', slot: 'bas', name: 'Kulaklık', emoji: '🎧', price: 80 },
  { id: 'bas_yilbasi', slot: 'bas', name: 'Yılbaşı şapkası', emoji: '🎅', price: 80 },
  { id: 'bas_buyucu', slot: 'bas', name: 'Büyücü şapkası', emoji: '🧙', price: 120 },
  { id: 'bas_korsan', slot: 'bas', name: 'Korsan şapkası', emoji: '🏴‍☠️', price: 120 },
  { id: 'bas_pamuk_seker', slot: 'bas', name: 'Pamuk şeker', emoji: '🍭', price: 80 },
  { id: 'bas_kar_adam', slot: 'bas', name: 'Kardan adam', emoji: '⛄', price: 80 },
  { id: 'govde_kazak', slot: 'govde', name: 'Kazak', emoji: '🧶', price: 0 },
  { id: 'govde_onluk', slot: 'govde', name: 'Önlük', emoji: '🍳', price: 80 },
  { id: 'govde_pelerin', slot: 'govde', name: 'Pelerin', emoji: '🧣', price: 80 },
  { id: 'govde_yelek', slot: 'govde', name: 'Yelek', emoji: '🦺', price: 80 },
  { id: 'govde_pijama', slot: 'govde', name: 'Pijama', emoji: '😴', price: 80 },
  { id: 'govde_mont', slot: 'govde', name: 'Mont', emoji: '🧥', price: 120 },
  { id: 'govde_kaplan', slot: 'govde', name: 'Kaplan tulumu', emoji: '🐯', price: 160, premium: true },
  { id: 'govde_pizza', slot: 'govde', name: 'Pizza panço', emoji: '🍕', price: 120 },
  { id: 'govde_battaniye', slot: 'govde', name: 'Battaniye', emoji: '🛋️', price: 120 },
  { id: 'govde_yagmurluk', slot: 'govde', name: 'Yağmurluk', emoji: '☔', price: 80 },
  { id: 'govde_pilot', slot: 'govde', name: 'Pilot ceketi', emoji: '✈️', price: 120 },
  { id: 'govde_tisort_kahve', slot: 'govde', name: 'Kahve tişörtü', emoji: '👕', price: 80 },
  { id: 'govde_hirka', slot: 'govde', name: 'Hırka', emoji: '🧥', price: 80 },
  { id: 'govde_sef_ceketi', slot: 'govde', name: 'Şef ceketi', emoji: '🥼', price: 120 },
  { id: 'govde_kimono', slot: 'govde', name: 'Kimono', emoji: '👘', price: 160, premium: true },
  { id: 'govde_dev_cicek', slot: 'govde', name: 'Çiçek yakalı elbise', emoji: '🌻', price: 160, premium: true },
  { id: 'govde_tulum', slot: 'govde', name: 'Salopet', emoji: '👖', price: 80 },
  { id: 'govde_sporcu', slot: 'govde', name: 'Sporcu ceketi', emoji: '🏃', price: 80 },
  { id: 'govde_kral_pelerini', slot: 'govde', name: 'Kral pelerini', emoji: '🤴', price: 200, premium: true },
  { id: 'govde_balikci_yelegi', slot: 'govde', name: 'Balıkçı yeleği', emoji: '🎣', price: 120 },
  { id: 'el_fincan', slot: 'el', name: 'Kahve fincanı', emoji: '☕', price: 0 },
  { id: 'el_kitap', slot: 'el', name: 'Kitap', emoji: '📘', price: 40 },
  { id: 'el_cicek', slot: 'el', name: 'Çiçek', emoji: '🌷', price: 40 },
  { id: 'el_supurge', slot: 'el', name: 'Süpürge', emoji: '🧹', price: 40 },
  { id: 'el_balon', slot: 'el', name: 'Balon', emoji: '🎈', price: 40 },
  { id: 'el_telefon', slot: 'el', name: 'Telefon', emoji: '📱', price: 80 },
  { id: 'el_kilic', slot: 'el', name: 'Oyuncak kılıç', emoji: '⚔️', price: 80 },
  { id: 'el_degnek', slot: 'el', name: 'Sihirli değnek', emoji: '🪄', price: 120, premium: true },
  { id: 'el_gitar', slot: 'el', name: 'Ukulele', emoji: '🎸', price: 120 },
  { id: 'el_olta', slot: 'el', name: 'Olta', emoji: '🎣', price: 80 },
  { id: 'el_firca', slot: 'el', name: 'Boya fırçası', emoji: '🖌️', price: 80 },
  { id: 'el_semsiye', slot: 'el', name: 'Şemsiye', emoji: '🌂', price: 80 },
  { id: 'el_hediye', slot: 'el', name: 'Hediye kutusu', emoji: '🎁', price: 80 },
  { id: 'el_pasta', slot: 'el', name: 'Pasta dilimi', emoji: '🍰', price: 80 },
  { id: 'el_fener', slot: 'el', name: 'Fener', emoji: '🏮', price: 80 },
  { id: 'el_harita', slot: 'el', name: 'Hazine haritası', emoji: '🗺️', price: 120 },
  { id: 'el_megafon', slot: 'el', name: 'Megafon', emoji: '📣', price: 80 },
  { id: 'el_mum', slot: 'el', name: 'Mum', emoji: '🕯️', price: 80 },
  { id: 'el_sulama', slot: 'el', name: 'Sulama kabı', emoji: '🚿', price: 40 },
  { id: 'el_kamera', slot: 'el', name: 'Kamera', emoji: '📷', price: 120, premium: true },
];

export const COSMETIC: Record<string, Cosmetic | undefined> = Object.fromEntries(COSMETICS.map(c => [c.id, c]));
/** Satın almada kimlik: `owned` içinde `esya_<id>`. */
export const cosmeticKey = (id: string) => `esya_${id}`;
export const cosmeticOwned = (owned: string[], c: Cosmetic) => c.price === 0 || owned.includes(cosmeticKey(c.id));

