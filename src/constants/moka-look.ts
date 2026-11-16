/**
 * Moka'yı kişiselleştirme: kürk rengi + aksesuar. Sadece kafası görünen az sayıda pozda uygulanır;
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

/** Kürk ve aksesuarın uygulandığı pozlar, `happy`ye göre başın yeri: dx/dy (şapka), fy (yüz), s (ölçek). */
export const LOOK_POSES: Record<string, { dx: number; dy: number; fy: number; s: number }> = {
  happy: { dx: 0, dy: 0, fy: 0, s: 1 },
  wink: { dx: -5, dy: -12, fy: 22, s: 0.95 },
  sipping: { dx: 16, dy: 6, fy: 40, s: 1.1 },
  thumbs_up: { dx: -3, dy: 4, fy: 70, s: 1.15 },
  love: { dx: -7, dy: -4, fy: 48, s: 1 },
};
