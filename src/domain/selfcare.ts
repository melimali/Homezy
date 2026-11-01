import { dayKey } from './play';
import type { DayKey } from './types';

/** Küçük, isteğe bağlı kendine bakım önerileri. Rutinlerden ayrı; puan ya da seri etkilemez. */
export const SELF_CARE: { emoji: string; text: string }[] = [
  { emoji: '💧', text: 'Bir bardak su iç' },
  { emoji: '🫁', text: '5 derin nefes al' },
  { emoji: '🧴', text: 'Elini kremle' },
  { emoji: '🌤️', text: 'Pencereyi aç, biraz hava gir' },
  { emoji: '📖', text: 'Birkaç sayfa kitap oku' },
  { emoji: '🍵', text: 'Kendine sıcak bir şey yap' },
  { emoji: '🧘', text: '2 dakika omuzlarını gevşet' },
  { emoji: '🎶', text: 'Sevdiğin bir şarkıyı aç' },
  { emoji: '🚶', text: '10 dakika dışarı çık' },
  { emoji: '🫧', text: 'Yüzünü nazikçe yıka' },
  { emoji: '💌', text: 'Sevdiğin birine mesaj at' },
  { emoji: '🛋️', text: '5 dakika hiçbir şey yapma' },
];

/** Her gün aynı öneri (gün anahtarından), ertesi gün bir sonraki. */
export function selfCareOf(day: DayKey) {
  let h = 0;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return SELF_CARE[h % SELF_CARE.length];
}

/** Bugünkü öneri yapıldı mı (`Play.awarded` içinde `bakim` anahtarı, şema değişmez). */
export const careDone = (awarded: Record<string, DayKey>, now: number) => awarded.bakim === dayKey(now);
