/**
 * Puanla alınan eşyalar. Sadece görev yaparak kazanılan puanla alınır; puan parayla satılmaz.
 * Fiyatlar sunucudaki `play_items` tablosuyla aynı olmalı (supabase/migrations/…_puan.sql).
 * Çizimleri `House3D.tsx` içinde (`itemShape`).
 */
export type ItemCategory = 'tum' | 'mobilya' | 'dekor' | 'bitki' | 'elektronik' | 'evcil' | 'ozel';

export type ItemId =
  | 'saksi' | 'hali' | 'puf' | 'abajur' | 'kitaplik' | 'kedi' | 'kopek' | 'gitar'
  | 'akvaryum' | 'somine' | 'piyano' | 'kahve_makinesi' | 'tv_unitesi' | 'teleskop'
  | 'avize' | 'bilardo' | 'orkide' | 'kaktus' | 'monstera' | 'sukulent' | 'komodin'
  | 'calisma_masasi' | 'berjer' | 'duvar_saati' | 'tablo' | 'ayna' | 'kulaklik'
  | 'muzik_kutusu' | 'hoparlor' | 'retro_radyo' | 'papagan' | 'akilli_mama'
  | 'kristal_kure' | 'gramofon' | 'sallanan_sandalye' | 'bonsai' | 'vazo'
  | 'oyun_konsolu' | 'fotograf_makinesi' | 'bambu' | 'duvar_rafi' | 'masa_lambasi';

export type Item = {
  id: ItemId;
  name: string;
  emoji: string;
  price: number;
  premium?: boolean;
  category: ItemCategory;
};

/** Bir kere alınan, ama odaya konmayan şeyler: Moka'nın bahçesindeki süsler ve evin kişilikleri (src/domain/garden.ts). */
export type Extra = { id: string; name: string; emoji: string; price: number; premium?: boolean; about: string };

export const ITEMS: Item[] = [
  { id: 'saksi', name: 'Saksı çiçeği', emoji: '🪴', price: 30, category: 'bitki' },
  { id: 'puf', name: 'Puf koltuk', emoji: '🪑', price: 40, category: 'mobilya' },
  { id: 'hali', name: 'Tüylü halı', emoji: '🧶', price: 50, category: 'dekor' },
  { id: 'abajur', name: 'Abajur', emoji: '💡', price: 60, category: 'dekor' },
  { id: 'kahve_makinesi', name: 'Kahve makinesi', emoji: '☕', price: 70, category: 'elektronik' },
  { id: 'kitaplik', name: 'Kitaplık', emoji: '📚', price: 80, category: 'mobilya' },
  { id: 'gitar', name: 'Gitar', emoji: '🎸', price: 90, category: 'elektronik' },
  { id: 'tv_unitesi', name: 'TV ünitesi', emoji: '📺', price: 110, category: 'mobilya' },
  { id: 'kedi', name: 'Kedi', emoji: '🐱', price: 120, category: 'evcil' },
  { id: 'kopek', name: 'Köpek', emoji: '🐶', price: 120, category: 'evcil' },
  { id: 'teleskop', name: 'Teleskop', emoji: '🔭', price: 140, category: 'ozel' },
  { id: 'akvaryum', name: 'Akvaryum', emoji: '🐠', price: 150, premium: true, category: 'evcil' },
  { id: 'avize', name: 'Şık avize', emoji: '✨', price: 170, premium: true, category: 'dekor' },
  { id: 'somine', name: 'Şömine', emoji: '🔥', price: 200, premium: true, category: 'mobilya' },
  { id: 'bilardo', name: 'Bilardo masası', emoji: '🎱', price: 220, premium: true, category: 'ozel' },
  { id: 'piyano', name: 'Piyano', emoji: '🎹', price: 250, premium: true, category: 'elektronik' },
  { id: 'orkide', name: 'Orkide', emoji: '🌸', price: 35, category: 'bitki' },
  { id: 'kaktus', name: 'Kaktüs', emoji: '🌵', price: 35, category: 'bitki' },
  { id: 'monstera', name: 'Monstera yaprağı', emoji: '🌿', price: 45, category: 'bitki' },
  { id: 'sukulent', name: 'Sukulent', emoji: '🍃', price: 30, category: 'bitki' },
  { id: 'komodin', name: 'Komodin', emoji: '🗄️', price: 45, category: 'mobilya' },
  { id: 'calisma_masasi', name: 'Çalışma masası', emoji: '🖥️', price: 85, category: 'mobilya' },
  { id: 'berjer', name: 'Berjer koltuk', emoji: '🛋️', price: 95, category: 'mobilya' },
  { id: 'duvar_saati', name: 'Duvar saati', emoji: '🕰️', price: 55, category: 'dekor' },
  { id: 'tablo', name: 'Sanat tablosu', emoji: '🖼️', price: 75, category: 'dekor' },
  { id: 'ayna', name: 'Dekoratif ayna', emoji: '🪞', price: 65, category: 'dekor' },
  { id: 'kulaklik', name: 'Kablosuz kulaklık', emoji: '🎧', price: 60, category: 'elektronik' },
  { id: 'muzik_kutusu', name: 'Müzik kutusu', emoji: '🎵', price: 85, category: 'elektronik' },
  { id: 'hoparlor', name: 'Bluetooth hoparlör', emoji: '🔊', price: 95, category: 'elektronik' },
  { id: 'retro_radyo', name: 'Retro radyo', emoji: '📻', price: 100, category: 'elektronik' },
  { id: 'papagan', name: 'Papağan kafesi', emoji: '🦜', price: 130, category: 'evcil' },
  { id: 'akilli_mama', name: 'Akıllı mama kabı', emoji: '🍲', price: 75, category: 'evcil' },
  { id: 'kristal_kure', name: 'Kristal küre', emoji: '🔮', price: 160, premium: true, category: 'ozel' },
  { id: 'gramofon', name: 'Antika gramofon', emoji: '📻', price: 190, premium: true, category: 'ozel' },
  { id: 'sallanan_sandalye', name: 'Sallanan sandalye', emoji: '🪑', price: 105, category: 'mobilya' },
  { id: 'bonsai', name: 'Bonsai ağacı', emoji: '🌳', price: 115, premium: true, category: 'bitki' },
  { id: 'vazo', name: 'Seramik vazo', emoji: '🏺', price: 50, category: 'dekor' },
  { id: 'oyun_konsolu', name: 'Oyun konsolu', emoji: '🎮', price: 180, premium: true, category: 'elektronik' },
  { id: 'fotograf_makinesi', name: 'Fotoğraf makinesi', emoji: '📷', price: 135, category: 'elektronik' },
  { id: 'bambu', name: 'Bambu ağacı', emoji: '🎋', price: 90, category: 'bitki' },
  { id: 'duvar_rafi', name: 'Ahşap duvar rafı', emoji: '🪵', price: 40, category: 'dekor' },
  { id: 'masa_lambasi', name: 'Masa lambası', emoji: '🏮', price: 50, category: 'dekor' },
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
