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
 * Ödeme ekranındaki karşılaştırma: kısa liste. `free` / `premium`: '✓', '—' ya da kısa bir açıklama.
 * Ücretsizde de olan çekirdek tek satırda toplanır; tabloda sadece fark yaratanlar kalır.
 * Sayılar `LIMITS` ve sunucudaki sınırlarla (…_ai_limits_25_10.sql, …_dondurma_2.sql) aynı olmalı.
 */
export const FEATURES: { emoji: string; label: string; free: string; premium: string }[] = [
  { emoji: '📸', label: 'Fotoğraf tarama', free: `Haftada ${LIMITS.free.scans}`, premium: `Günde ${LIMITS.premium.scans}` },
  { emoji: '💬', label: 'Moka ile sohbet', free: '—', premium: `Günde ${LIMITS.premium.chats}` },
  { emoji: '🏡', label: '2. kat, temalar, birden çok ev', free: 'Temel', premium: '✓' },
  { emoji: '👨‍👩‍👧', label: 'Aile paylaşımı', free: '—', premium: '✓' },
  { emoji: '🍳', label: 'Tarif ve haftalık kombin planı', free: '—', premium: '✓' },
  { emoji: '📊', label: 'Ayrıntılı raporlar', free: 'Özet', premium: '✓' },
  { emoji: '⭐', label: 'Puan ve seri dondurma', free: 'Temel', premium: `${LIMITS.premium.mult.toString().replace('.', ',')} kat` },
  { emoji: '🚫', label: 'Reklam', free: 'Az', premium: 'Yok' },
];

/** Tablonun üstünde tek satırda: ev işleri her iki planda da ücretsiz. */
export const FREE_CORE = 'Ev planı, rutinler, gardırop, buzdolabı, günlük ve seri her iki planda ücretsiz.';
