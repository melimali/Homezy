import type { ClothState, RoomModule, RoomType, StockLevel } from './types';

export const DAY = 864e5;

export const TYPES: Record<RoomType, { label: string; mod: RoomModule; tasks: [string, number][] }> = {
  yatak: { label: 'Yatak odası', mod: 'gardirop', tasks: [['Odayı süpür ve sil', 7], ['Çarşaf değişimi', 7], ['Toz alma', 7], ['Havalandırma', 1], ['Yastık ve yorgan havalandırma', 30]] },
  mutfak: { label: 'Mutfak', mod: 'buzdolabi', tasks: [['Bulaşık', 1], ['Tezgah silme', 1], ['Çöpü çıkar', 2], ['Buzdolabı temizliği', 30], ['Fırın temizliği', 30], ['Yer silme', 7]] },
  banyo: { label: 'Banyo', mod: 'stok', tasks: [['Lavabo ve ayna', 3], ['Klozet', 3], ['Duş / küvet', 7], ['Havlu değişimi', 4], ['Yer silme', 7]] },
  salon: { label: 'Salon', mod: 'bitki', tasks: [['Süpürme', 3], ['Toz alma', 7], ['Koltuk minderleri', 14], ['Cam silme', 30]] },
  calisma: { label: 'Çalışma odası', mod: null, tasks: [['Masa düzeni', 7], ['Toz alma', 7], ['Kablo ve şarj düzeni', 30]] },
  cocuk: { label: 'Çocuk odası', mod: 'gardirop', tasks: [['Oyuncak toplama', 1], ['Çarşaf değişimi', 7], ['Süpürme', 3]] },
  antre: { label: 'Antre', mod: null, tasks: [['Ayakkabılık düzeni', 7], ['Yer silme', 7]] },
  balkon: { label: 'Balkon', mod: 'bitki', tasks: [['Süpürme', 7], ['Cam ve korkuluk', 30]] },
  camasir: { label: 'Çamaşır odası', mod: 'stok', tasks: [['Çamaşır yıkama', 3], ['Makine filtresi', 30], ['Ütü', 7]] },
};

export const ROOM_TYPES = Object.keys(TYPES) as RoomType[];

export const STOCK_DEF: Partial<Record<RoomType, string[]>> = {
  mutfak: ['Süt', 'Yumurta', 'Peynir', 'Ekmek'],
  banyo: ['Tuvalet kağıdı', 'Şampuan', 'Diş macunu', 'Sıvı sabun'],
  camasir: ['Deterjan', 'Yumuşatıcı', 'Leke çıkarıcı'],
};

export const CATS = ['Üst', 'Alt', 'Elbise / Takım', 'Dış giyim', 'Ev / Pijama', 'İç giyim', 'Ayakkabı', 'Aksesuar'];

export const CSTATE: Record<ClothState, string> = { temiz: 'Temiz', kirli: 'Kirli', utu: 'Ütülenecek' };
export const NEXT_CSTATE: Record<ClothState, ClothState> = { temiz: 'kirli', kirli: 'utu', utu: 'temiz' };

export const LV: [StockLevel, string][] = [['var', 'Var'], ['az', 'Az'], ['yok', 'Bitti']];

/** Bu kadar kirli parça birikince çamaşır uyarısı verilir. */
export const LAUNDRY_THRESHOLD = 3;
/** Buzdolabı fotoğrafı bu kadar günden eskiyse yenisi istenir. */
export const PHOTO_MAX_AGE = 7;
