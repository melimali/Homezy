import type { HouseTheme } from './types';

/**
 * Ücretsiz ile Premium arasındaki farklar tek yerde. Ödeme ekranındaki karşılaştırma tablosu
 * (`FEATURES`) ve uygulamadaki kilitler bu sabitleri kullanır. Sunucudaki sınırlar
 * (supabase/migrations/…_premium.sql) bunlarla aynı olmalı.
 */
export const LIMITS = {
  free: { freezes: 1, homes: 1, mult: 1 },
  premium: { freezes: 3, homes: 5, mult: 1.5 },
} as const;

export const limits = (premium: boolean) => (premium ? LIMITS.premium : LIMITS.free);

export const THEMES: { id: HouseTheme; name: string; emoji: string; premium: boolean }[] = [
  { id: 'gunduz', name: 'Gündüz', emoji: '☀️', premium: false },
  { id: 'gece', name: 'Gece', emoji: '🌙', premium: true },
  { id: 'kis', name: 'Kış', emoji: '❄️', premium: true },
  { id: 'sonbahar', name: 'Sonbahar', emoji: '🍂', premium: true },
];

/** Premium bittiyse seçili tema gündüze döner (seçim silinmez, üyelik dönünce geri gelir). */
export const themeFor = (theme: HouseTheme | undefined, premium: boolean): HouseTheme =>
  theme && (premium || !THEMES.find(t => t.id === theme)?.premium) ? theme : 'gunduz';

/** Ödeme ekranındaki karşılaştırma. `free` / `premium`: '✓', '—' ya da kısa bir açıklama. */
export const FEATURES: { emoji: string; label: string; free: string; premium: string }[] = [
  { emoji: '🏠', label: 'Ev planı, odalar, rutinler, hatırlatmalar', free: '✓', premium: '✓' },
  { emoji: '👕', label: 'Gardırop, buzdolabı, stok, bitkiler', free: '✓', premium: '✓' },
  { emoji: '📸', label: 'Yapay zekâ ile fotoğraf tarama', free: 'Haftada 2', premium: 'Günde 2' },
  { emoji: '❄️', label: 'Seri dondurma (gün kaçırınca ev yıkılmaz)', free: 'Ayda 1', premium: 'Ayda 3' },
  { emoji: '⭐', label: 'Görevlerden kazanılan puan', free: '1 kat', premium: '1,5 kat' },
  { emoji: '🎹', label: 'Premium eşyalar (akvaryum, şömine, piyano)', free: '—', premium: '✓' },
  { emoji: '🏡', label: 'Birden fazla ev (yazlık, iş yeri)', free: '1 ev', premium: '5 ev' },
  { emoji: '🌙', label: 'Ev temaları: gece, kış, sonbahar', free: 'Gündüz', premium: '✓' },
  { emoji: '📔', label: 'Günlükte fotoğraf, ruh hali grafiği, "geçen yıl bugün"', free: 'Yazı', premium: '✓' },
  { emoji: '🏃', label: 'Spor grafikleri ve kişisel antrenman planı', free: 'Kayıt', premium: '✓' },
  { emoji: '🍳', label: 'Buzdolabındakilerle tarif önerisi', free: '—', premium: '✓' },
  { emoji: '🧥', label: 'Haftalık kombin planı', free: '—', premium: '✓' },
  { emoji: '🔔', label: 'Akıllı bildirimler (alışkanlığına göre saat)', free: 'Sabit saat', premium: '✓' },
  { emoji: '👨‍👩‍👧', label: 'Aile paylaşımı: evi paylaş, işleri bölüş', free: '—', premium: '✓' },
  { emoji: '☁️', label: 'Bulut yedeği', free: 'Ev verisi', premium: '+ fotoğraflar' },
  { emoji: '🚫', label: 'Reklamsız', free: 'Az reklam', premium: '✓' },
];
