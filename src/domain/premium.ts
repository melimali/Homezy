import type { HouseTheme } from './types';

/**
 * Ücretsiz ile Premium arasındaki farklar tek yerde. Ödeme ekranındaki karşılaştırma tablosu
 * (`FEATURES`) ve uygulamadaki kilitler bu sabitleri kullanır. Sunucudaki sınırlar
 * (supabase/migrations/…_premium.sql) bunlarla aynı olmalı.
 */
export const LIMITS = {
  /** `scans`: yapay zekâ taraması; ücretsizde haftada, Premium'da günde. Sınırı sunucu tutar (…_ai_limits.sql). `picks`: Moka'nın gelişim önerisinde günde kaç kez "başka öner" denir (src/domain/growth.ts); `chats`: Moka sohbet mesajı, her gün; sınırı `…_ai_limits.sql` tutar. */
  free: { freezes: 2, homes: 1, mult: 1, scans: 2, chats: 0, chatsMonth: 0, picks: 1 },
  premium: { freezes: 3, homes: 5, mult: 1.5, scans: 10, chats: 25, chatsMonth: 750, picks: 6 },
} as const;

export const limits = (premium: boolean) => (premium ? LIMITS.premium : LIMITS.free);

export const THEMES: { id: HouseTheme; name: string; emoji: string; premium: boolean }[] = [
  { id: 'gunduz', name: 'Gündüz', emoji: '☀️', premium: false },
  { id: 'gece', name: 'Gece', emoji: '🌙', premium: true },
  { id: 'kis', name: 'Kış', emoji: '❄️', premium: true },
  { id: 'sonbahar', name: 'Sonbahar', emoji: '🍂', premium: true },
  { id: 'cottage', name: 'Cottagecore', emoji: '🌼', premium: false },
  { id: 'minimal', name: 'Minimal', emoji: '🤍', premium: true },
  { id: 'lavanta', name: 'Lavanta', emoji: '💜', premium: true },
];

/** Premium bittiyse seçili tema gündüze döner (seçim silinmez, üyelik dönünce geri gelir). */
export const themeFor = (theme: HouseTheme | undefined, premium: boolean): HouseTheme =>
  theme && (premium || !THEMES.find(t => t.id === theme)?.premium) ? theme : 'gunduz';

/**
 * Ödeme ekranındaki karşılaştırma. `free` / `premium`: '✓', '—' ya da kısa bir açıklama.
 * Sıra: önce herkese ücretsiz olan disiplin çekirdeği, sonra Premium'un konfor / yapay zekâ / süs katmanı.
 * Sayılar `LIMITS` ve sunucudaki sınırlarla (…_ai_limits_25_10.sql, …_dondurma_2.sql) aynı olmalı.
 */
export const FEATURES: { emoji: string; label: string; free: string; premium: string }[] = [
  { emoji: '🏠', label: 'Ev planı, odalar, rutinler, hatırlatmalar', free: '✓', premium: '✓' },
  { emoji: '🔥', label: 'Seri, disiplin rampası, hafif gün', free: '✓', premium: '✓' },
  { emoji: '👕', label: 'Gardırop, buzdolabı, stok, bitkiler', free: '✓', premium: '✓' },
  { emoji: '📔', label: 'Günlük, spor kaydı, haftalık özet', free: '✓', premium: '✓' },
  { emoji: '❄️', label: 'Seri dondurma', free: `Ayda ${LIMITS.free.freezes}`, premium: `Ayda ${LIMITS.premium.freezes}` },
  { emoji: '⭐', label: 'Görev puanı', free: '1 kat', premium: `${LIMITS.premium.mult.toString().replace('.', ',')} kat` },
  { emoji: '📸', label: 'Fotoğraf tarama (buzdolabı + kıyafet)', free: `Haftada ${LIMITS.free.scans}`, premium: `Günde ${LIMITS.premium.scans}` },
  { emoji: '💬', label: 'Moka ile sohbet', free: '—', premium: `Günde ${LIMITS.premium.chats} mesaj` },
  { emoji: '📚', label: 'Gelişim önerisi', free: 'Günde 1 öneri', premium: `Günde ${LIMITS.premium.picks} öneri + aylık grafik` },
  { emoji: '🍳', label: 'Buzdolabından tarif önerisi', free: '—', premium: '✓' },
  { emoji: '🧥', label: 'Haftalık kombin planı', free: '—', premium: '✓' },
  { emoji: '📊', label: 'Ayrıntılı rapor, ruh hali grafiği, "geçen yıl bugün"', free: 'Özet', premium: '✓' },
  { emoji: '🏃', label: 'Spor grafikleri ve antrenman planı', free: 'Kayıt', premium: '✓' },
  { emoji: '🏡', label: 'Ev sayısı', free: `${LIMITS.free.homes} ev`, premium: `${LIMITS.premium.homes} ev` },
  { emoji: '🌙', label: 'Ev temaları ve Premium eşyalar', free: 'Temel', premium: '✓' },
  { emoji: '👨‍👩‍👧', label: 'Aile paylaşımı', free: '—', premium: '✓' },
  { emoji: '🔔', label: 'Akıllı bildirim saatleri', free: 'Sabit saat', premium: '✓' },
  { emoji: '☁️', label: 'Bulut yedeği', free: 'Ev verisi', premium: '+ fotoğraflar' },
  { emoji: '🚫', label: 'Reklam', free: 'Az reklam', premium: 'Yok' },
];
