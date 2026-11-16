/**
 * Moka'yı kişiselleştirme: kürk rengi. Üretilmiş pozlarda uygulanır;
 * diğer çıkartmalar (bildirim, boş ekran) değişmez. Kürk resimleri scripts/make-moka-fur.py ile üretilir.
 */
export type FurId = 'orman' | 'kahve' | 'gri' | 'mavi' | 'mor' | 'pembe' | 'turuncu' | 'kirmizi';

export const FURS: { id: FurId; label: string; swatch: string }[] = [
  { id: 'orman', label: 'Orman', swatch: '#8A9A4B' },
  { id: 'kahve', label: 'Kahve', swatch: '#9A7A4B' },
  { id: 'gri', label: 'Gri', swatch: '#8E8E8A' },
  { id: 'mavi', label: 'Mavi', swatch: '#4B8A9A' },
  { id: 'mor', label: 'Mor', swatch: '#7A4B9A' },
  { id: 'pembe', label: 'Pembe', swatch: '#C97A9A' },
  { id: 'turuncu', label: 'Turuncu', swatch: '#C9783A' },
  { id: 'kirmizi', label: 'Kırmızı', swatch: '#A8544A' },
];
