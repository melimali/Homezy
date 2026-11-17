/**
 * Moka'yı kişiselleştirme: kürk rengi. Üretilmiş pozlarda uygulanır;
 * diğer çıkartmalar (bildirim, boş ekran) değişmez. Kürk resimleri scripts/make-moka-fur.py ile üretilir.
 */
export type FurId = 'orman' | 'kahve' | 'gri' | 'mavi' | 'mor' | 'pembe' | 'turuncu' | 'kirmizi';

export const FURS: { id: FurId; label: string; swatch: string }[] = [
  { id: 'orman', label: 'Orman', swatch: '#8A9A4B' },
  { id: 'kahve', label: 'Kahve', swatch: '#8A6340' },
  { id: 'gri', label: 'Gri', swatch: '#A5A8A8' },
  { id: 'mavi', label: 'Mavi', swatch: '#6F9FC4' },
  { id: 'mor', label: 'Mor', swatch: '#9A86C4' },
  { id: 'pembe', label: 'Pembe', swatch: '#D79BB8' },
  { id: 'turuncu', label: 'Turuncu', swatch: '#C8763A' },
  { id: 'kirmizi', label: 'Kırmızı', swatch: '#A8526A' },
];
