import type { HouseTheme } from './types';

/**
 * Ücretsiz ile Premium arasındaki farklar tek yerde. Ödeme ekranındaki karşılaştırma tablosu
 * (`FEATURES`) ve uygulamadaki kilitler bu sabitleri kullanır. Sunucudaki sınırlar
 * (supabase/migrations/…_premium.sql) bunlarla aynı olmalı.
 */
export const LIMITS = {
  /** `scans`: yapay zekâ taraması; ücretsizde haftada, Premium'da günde. Sınırı sunucu tutar (…_scan_premium_50.sql). */
  free: { freezes: 1, homes: 1, mult: 1, scans: 2 },
  premium: { freezes: 3, homes: 5, mult: 1.5, scans: 50 },
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
  { emoji: '📸', label: 'Yapay zekâ ile fotoğraf tarama', free: `Haftada ${LIMITS.free.scans}`, premium: `Günde ${LIMITS.premium.scans}` },
  { emoji: '❄️', label: 'Seri dondurma (gün kaçırınca sığınak çökmez)', free: 'Ayda 1', premium: 'Ayda 3' },
  { emoji: '⭐', label: 'Görevlerden kazanılan puan', free: '1 kat', premium: '1,5 kat' },
  { emoji: '🎹', label: 'Premium eşyalar (akvaryum, şömine, piyano)', free: '—', premium: '✓' },
  { emoji: '🏡', label: 'Birden fazla sığınak (yedek bunker, dağ evi)', free: '1 sığınak', premium: '5 sığınak' },
  { emoji: '🌙', label: 'Sığınak temaları: gece, kış, sonbahar', free: 'Gündüz', premium: '✓' },
  { emoji: '📔', label: 'Seyir defterinde fotoğraf, ruh hali grafiği, "geçen yıl bugün"', free: 'Yazı', premium: '✓' },
  { emoji: '🏃', label: 'Kaçış antrenmanı grafikleri ve kişisel plan', free: 'Kayıt', premium: '✓' },
  { emoji: '🍳', label: 'Erzak deposundakilerle tayın tarifi', free: '—', premium: '✓' },
  { emoji: '🧥', label: 'Haftalık zırh kombini planı', free: '—', premium: '✓' },
  { emoji: '🔔', label: 'Akıllı telsiz anonsları (alışkanlığına göre saat)', free: 'Sabit saat', premium: '✓' },
  { emoji: '👨‍👩‍👧', label: 'Hayatta kalan ekibi: sığınağı paylaş, görevleri bölüş', free: '—', premium: '✓' },
  { emoji: '☁️', label: 'Bulut yedeği', free: 'Sığınak verisi', premium: '+ fotoğraflar' },
  { emoji: '🚫', label: 'Reklamsız', free: 'Az reklam', premium: '✓' },
];
