import type { ClothState, RoomModule, RoomType, StockLevel, WashType } from './types';

export const DAY = 864e5;

/** Oda türleri ve varsayılan rutinleri: [ad, kaç günde bir, tahmini dakika]. */
export const TYPES: Record<RoomType, { label: string; mod: RoomModule; tasks: [string, number, number][] }> = {
  yatak: { label: 'Yatak odası', mod: 'gardirop', tasks: [['Odayı süpür ve sil', 7, 20], ['Çarşaf değişimi', 7, 15], ['Toz alma', 7, 10], ['Havalandırma', 1, 5], ['Yastık ve yorgan havalandırma', 30, 10]] },
  mutfak: { label: 'Mutfak', mod: 'buzdolabi', tasks: [['Bulaşık', 1, 20], ['Tezgah silme', 1, 5], ['Çöpü çıkar', 2, 5], ['Buzdolabı temizliği', 30, 30], ['Fırın temizliği', 30, 30], ['Yer silme', 7, 15]] },
  banyo: { label: 'Banyo', mod: 'stok', tasks: [['Lavabo ve ayna', 3, 10], ['Klozet', 3, 10], ['Duş / küvet', 7, 15], ['Havlu değişimi', 4, 5], ['Yer silme', 7, 10]] },
  salon: { label: 'Salon', mod: 'bitki', tasks: [['Süpürme', 3, 15], ['Toz alma', 7, 15], ['Koltuk minderleri', 14, 10], ['Cam silme', 30, 40]] },
  calisma: { label: 'Çalışma odası', mod: null, tasks: [['Masa düzeni', 7, 10], ['Toz alma', 7, 10], ['Kablo ve şarj düzeni', 30, 15]] },
  cocuk: { label: 'Çocuk odası', mod: 'gardirop', tasks: [['Oyuncak toplama', 1, 10], ['Çarşaf değişimi', 7, 15], ['Süpürme', 3, 10]] },
  antre: { label: 'Antre', mod: null, tasks: [['Ayakkabılık düzeni', 7, 10], ['Yer silme', 7, 10]] },
  balkon: { label: 'Balkon', mod: 'bitki', tasks: [['Süpürme', 7, 10], ['Cam ve korkuluk', 30, 30]] },
  camasir: { label: 'Çamaşır odası', mod: 'stok', tasks: [['Çamaşır yıkama', 3, 10], ['Makine filtresi', 30, 15], ['Ütü', 7, 30]] },
};

export const ROOM_TYPES = Object.keys(TYPES) as RoomType[];

export const STOCK_DEF: Partial<Record<RoomType, string[]>> = {
  mutfak: ['Süt', 'Yumurta', 'Peynir', 'Ekmek'],
  banyo: ['Tuvalet kağıdı', 'Şampuan', 'Diş macunu', 'Sıvı sabun'],
  camasir: ['Deterjan', 'Yumuşatıcı', 'Leke çıkarıcı'],
};

export const CATS = ['Üst', 'Alt', 'Elbise / Takım', 'Dış giyim', 'Ev / Pijama', 'İç giyim', 'Ayakkabı', 'Aksesuar'];

export const CSTATE: Record<ClothState, string> = { temiz: 'Temiz', kirli: 'Kirli', utu: 'Ütülenecek' };
export const CSTATE_EMOJI: Record<ClothState, string> = { temiz: '🧼', kirli: '🧺', utu: '💨' };
export const NEXT_CSTATE: Record<ClothState, ClothState> = { temiz: 'kirli', kirli: 'utu', utu: 'temiz' };

export const LV: [StockLevel, string][] = [['var', 'Var'], ['az', 'Az'], ['yok', 'Bitti']];

/** Aynı yıkama türünden bu kadar kirli parça birikince bir makine dolusu sayılır ve çamaşır uyarısı verilir. */
export const LAUNDRY_THRESHOLD = 3;

export const WASH: Record<WashType, { label: string; hint: string; emoji: string }> = {
  beyaz: { label: 'Beyazlar', hint: '40-60°', emoji: '🤍' },
  renkli: { label: 'Renkliler', hint: '30-40°', emoji: '🌈' },
  koyu: { label: 'Koyular', hint: '30°, ters çevir', emoji: '🖤' },
  hassas: { label: 'Hassaslar', hint: 'yün / ipek, 30° ya da elde', emoji: '🪶' },
};
export const WASH_TYPES = Object.keys(WASH) as WashType[];
/** Bu kadar gündür giyilmeyen kıyafet için bağış önerilir. */
export const DONATE_AFTER = 365;
/** Son kullanma tarihine bu kadar gün kala hatırlatılır. */
export const EXPIRY_WARN = 2;
/** Faturanın son gününe bu kadar gün kala hatırlatılır. */
export const BILL_WARN = 2;
/** Garantinin bitişine bu kadar gün kala hatırlatılır. */
export const WARRANTY_WARN = 30;

/** Ev bakımı ve diğer "odasız" işlerin oda kimliği yerine kullandığı kimlik. */
export const CARE = '_ev';
/** Buzdolabı fotoğrafı bu kadar günden eskiyse yenisi istenir. */
export const PHOTO_MAX_AGE = 7;

/** Odaları bir bakışta tanımak için; çocuk bile anlasın diye yazının yanında durur. */
export const ROOM_EMOJI: Record<RoomType, string> = {
  yatak: '🛏️', mutfak: '🍳', banyo: '🛁', salon: '🛋️', calisma: '💻',
  cocuk: '🧸', antre: '🚪', balkon: '🌿', camasir: '🧺',
};
