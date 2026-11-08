/**
 * Puanla alınan eşyalar. Sadece görev yaparak kazanılan puanla alınır; puan parayla satılmaz.
 * Fiyatlar sunucudaki `play_items` tablosuyla aynı olmalı (supabase/migrations/…_puan.sql).
 * Çizimleri `House3D.tsx` içinde (`itemShape`).
 */
export type ItemCategory = 'tum' | 'mobilya' | 'aydinlatma' | 'duvar' | 'dekor' | 'bitki' | 'elektronik' | 'evcil' | 'mevsim' | 'hobi' | 'dis' | 'ozel';

export type ItemId =
  | 'saksi' | 'hali' | 'puf' | 'abajur' | 'kitaplik' | 'kedi' | 'kopek' | 'gitar'
  | 'akvaryum' | 'somine' | 'piyano' | 'kahve_makinesi' | 'tv_unitesi' | 'teleskop'
  | 'avize' | 'bilardo' | 'orkide' | 'kaktus' | 'monstera' | 'sukulent' | 'komodin'
  | 'calisma_masasi' | 'berjer' | 'duvar_saati' | 'tablo' | 'ayna' | 'kulaklik'
  | 'muzik_kutusu' | 'hoparlor' | 'retro_radyo' | 'papagan' | 'akilli_mama'
  | 'kristal_kure' | 'gramofon' | 'sallanan_sandalye' | 'bonsai' | 'vazo'
  | 'koltuk_takimi' | 'yemek_masasi' | 'gardirop' | 'sehpa' | 'yatak_ranza' | 'kitap_koltugu' | 'sarkit_isik' | 'lava_lambasi' | 'zemin_lambasi' | 'mum' | 'fener'
  | 'duvar_halisi' | 'poster' | 'boy_ayna' | 'duvar_cicegi' | 'neon_yazi' | 'yucca' | 'sarmasik' | 'lavanta' | 'aloe' | 'limon_agaci' | 'palmiye'
  | 'kedi_yatagi' | 'kopek_yatagi' | 'tavsan' | 'hamster' | 'kus_yemligi' | 'yilbasi_agaci' | 'kar_adami' | 'balkabagi' | 'ramazan_feneri' | 'plaj_semsiyesi' | 'cicek_celengi'
  | 'bilgisayar_masasi' | 'spor_kosesi' | 'yoga_mati' | 'resim_sehpasi' | 'dikis_makinesi' | 'posta_kutusu' | 'cit' | 'bahce_lambasi' | 'kus_evi' | 'paspas' | 'salincak'
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
  { id: 'koltuk_takimi', name: 'Koltuk takımı', emoji: '🛋️', price: 140, category: 'mobilya' },
  { id: 'yemek_masasi', name: 'Yemek masası', emoji: '🍽️', price: 120, category: 'mobilya' },
  { id: 'gardirop', name: 'Gardırop', emoji: '🚪', price: 100, category: 'mobilya' },
  { id: 'sehpa', name: 'Orta sehpa', emoji: '☕', price: 55, category: 'mobilya' },
  { id: 'yatak_ranza', name: 'Konforlu yatak', emoji: '🛏️', price: 90, category: 'mobilya' },
  { id: 'kitap_koltugu', name: 'Kitap okuma koltuğu', emoji: '📖', price: 75, category: 'mobilya' },
  { id: 'sarkit_isik', name: 'Işık zinciri', emoji: '🎄', price: 45, category: 'aydinlatma' },
  { id: 'lava_lambasi', name: 'Lav lambası', emoji: '🫧', price: 65, category: 'aydinlatma' },
  { id: 'zemin_lambasi', name: 'Zemin lambası', emoji: '🛋️', price: 80, category: 'aydinlatma' },
  { id: 'mum', name: 'Mum', emoji: '🕯️', price: 25, category: 'aydinlatma' },
  { id: 'fener', name: 'Fener', emoji: '🏮', price: 40, category: 'aydinlatma' },
  { id: 'duvar_halisi', name: 'Duvar halısı', emoji: '🧵', price: 60, category: 'duvar' },
  { id: 'poster', name: 'Poster', emoji: '🖼️', price: 35, category: 'duvar' },
  { id: 'boy_ayna', name: 'Boy aynası', emoji: '🪞', price: 70, category: 'duvar' },
  { id: 'duvar_cicegi', name: 'Duvar çiçeği', emoji: '💐', price: 55, category: 'duvar' },
  { id: 'neon_yazi', name: 'Neon yazı', emoji: '💖', price: 120, premium: true, category: 'duvar' },
  { id: 'yucca', name: 'Yukka', emoji: '🌴', price: 50, category: 'bitki' },
  { id: 'sarmasik', name: 'Sarmaşık', emoji: '🌱', price: 40, category: 'bitki' },
  { id: 'lavanta', name: 'Lavanta', emoji: '💜', price: 35, category: 'bitki' },
  { id: 'aloe', name: 'Aloe vera', emoji: '🪴', price: 30, category: 'bitki' },
  { id: 'limon_agaci', name: 'Limon ağacı', emoji: '🍋', price: 130, premium: true, category: 'bitki' },
  { id: 'palmiye', name: 'Palmiye', emoji: '🌴', price: 85, category: 'bitki' },
  { id: 'kedi_yatagi', name: 'Kedi yatağı', emoji: '🐾', price: 45, category: 'evcil' },
  { id: 'kopek_yatagi', name: 'Köpek yatağı', emoji: '🦴', price: 45, category: 'evcil' },
  { id: 'tavsan', name: 'Tavşan', emoji: '🐰', price: 110, category: 'evcil' },
  { id: 'hamster', name: 'Hamster', emoji: '🐹', price: 90, category: 'evcil' },
  { id: 'kus_yemligi', name: 'Kuş yemliği', emoji: '🐦', price: 60, category: 'evcil' },
  { id: 'yilbasi_agaci', name: 'Yılbaşı ağacı', emoji: '🎄', price: 140, category: 'mevsim' },
  { id: 'kar_adami', name: 'Kardan adam', emoji: '⛄', price: 90, category: 'mevsim' },
  { id: 'balkabagi', name: 'Balkabağı', emoji: '🎃', price: 40, category: 'mevsim' },
  { id: 'ramazan_feneri', name: 'Ramazan feneri', emoji: '🌙', price: 50, category: 'mevsim' },
  { id: 'plaj_semsiyesi', name: 'Plaj şemsiyesi', emoji: '⛱️', price: 70, category: 'mevsim' },
  { id: 'cicek_celengi', name: 'Çiçek celengi', emoji: '🐷', price: 60, category: 'mevsim' },
  { id: 'bilgisayar_masasi', name: 'Bilgisayar masası', emoji: '💻', price: 160, category: 'hobi' },
  { id: 'spor_kosesi', name: 'Spor köşesi', emoji: '🏋️', price: 120, category: 'hobi' },
  { id: 'yoga_mati', name: 'Yoga matı', emoji: '🧘', price: 45, category: 'hobi' },
  { id: 'resim_sehpasi', name: 'Resim sehpası', emoji: '🎨', price: 90, category: 'hobi' },
  { id: 'dikis_makinesi', name: 'Dikiş makinesi', emoji: '🧵', price: 100, category: 'hobi' },
  { id: 'posta_kutusu', name: 'Posta kutusu', emoji: '📮', price: 40, category: 'dis' },
  { id: 'cit', name: 'Beyaz çit', emoji: '🏡', price: 60, category: 'dis' },
  { id: 'bahce_lambasi', name: 'Bahçe lambası', emoji: '💡', price: 55, category: 'dis' },
  { id: 'kus_evi', name: 'Kuş evi', emoji: '🏠', price: 70, category: 'dis' },
  { id: 'paspas', name: 'Kapı paspası', emoji: '🟫', price: 25, category: 'dis' },
  { id: 'salincak', name: 'Bahçe salıncağı', emoji: '🎠', price: 110, premium: true, category: 'dis' },
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
