/** Sonlu ve negatif olmayan tam sayı; bozuk değer (NaN, Infinity, negatif) → fallback. */
export function safeCount(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : fallback;
}

/** Sayaç animasyonunun ara değeri: 0 ile hedef arasında kalır (saat bozulsa da taşmaz). */
export function clampCount(v: number, target: number): number {
  const t = safeCount(target);
  if (!Number.isFinite(v)) return t;
  return Math.min(t, Math.max(0, Math.round(v)));
}
