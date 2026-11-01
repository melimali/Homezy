import { LIMITS } from './premium';

/**
 * Moka sohbeti kapısı. Yapay zekâ kötüye kullanılamasın diye:
 * - Hesapsız (misafir) kullanıcı sohbet ve fotoğraf taramasını kullanamaz; üyelik ister.
 * - Hesaplı ama Premium olmayan kullanıcı sohbette yapay zekâya ulaşmaz: ilk mesaja ne yazarsa yazsın hazır bir metin döner,
 *   sonraki mesajlara kısa bir yönlendirme. Maliyet yok, sunucu çağrılmaz.
 * Sunucu aynı kuralları ayrıca zorlar (supabase/functions/moka-chat, scan). Metinlerin İngilizcesi src/i18n/en/b.ts'te.
 */
export const CHAT_PREMIUM_INTRO =
  `Selam, ben Moka ☕ Seninle sohbet etmeyi çok isterdim ama sohbet Premium'a özel! Premium'da benimle günde ${LIMITS.premium.chats} mesaj konuşabilir, iş ekletip yaptıklarını işaretletebilir, takvime not yazdırabilirsin. Üstüne günde ${LIMITS.premium.scans} yapay zekâ taraması, ikinci kat, 1,5 kat puan, ayda ${LIMITS.premium.freezes} seri dondurma, ev temaları, aile paylaşımı ve reklamsız kullanım da var. İstersen bir bak 💛`;

export const CHAT_PREMIUM_NUDGE = "Sohbet Premium'a özel ☕ Premium'a geçersen seninle seve seve konuşurum. Tüm avantajlara aşağıdaki butondan bakabilirsin 💛";

export const CHAT_ACCOUNT_NEEDED = 'Moka ile sohbet etmek için üye olman gerekiyor. E-posta ile ücretsiz hesap açıp giriş yapınca burada olacağım ☕';

export const SCAN_ACCOUNT_NEEDED = 'Yapay zekâ taraması için üye olman gerekiyor. E-posta ile ücretsiz hesap açıp giriş yap, sonra tekrar dene. Listeyi elle de güncelleyebilirsin.';
