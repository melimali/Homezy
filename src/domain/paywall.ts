import { dayKey, dayTs } from './play';

/**
 * Paywall'un kendiliğinden çıkabileceği anlar (docs/premium-retention-plan.md §4).
 * Kural: günde en çok 1 kez, ilk 3 gün hiç, Premium'a hiç. Kullanıcının kendi dokunuşuyla
 * açılan ekran (Premium temada "Uygula" gibi) bu sınırlara takılmaz.
 */
export type PaywallMoment = 'onboarding' | 'streak' | 'levelup' | 'theme' | 'report';

export const QUIET_DAYS = 3;
/** Seri kilometre taşları: bu günlerde kutlamadan sonra paywall düşünülür. */
export const STREAK_MARKS = [3, 7, 14, 30] as const;

export type PaywallMemory = { first: string | null; last: string | null };

export const emptyPaywallMemory = (): PaywallMemory => ({ first: null, last: null });

/** Anın başlığı ve Moka cümlesi (suçlamasız, hediye dili). */
export const MOMENT_COPY: Record<PaywallMoment, { title: string; text: string }> = {
  onboarding: { title: 'Evin için bir hediye', text: 'Evin işleri hep ücretsiz. Premium evini güzelleştirir ve serini korur.' },
  streak: { title: 'Harika gidiyorsun', text: 'Serini korumak ve evine yeni şeyler eklemek için Premium\'a bak.' },
  levelup: { title: 'Evin büyüdü', text: 'Yeni mobilyalar seni bekliyor. Premium ile hepsini açabilirsin.' },
  theme: { title: 'Bu tema Premium\'da', text: 'Evini istediğin gibi süsle. İlerlemen her zaman senin.' },
  report: { title: 'Haftanın ayrıntısı', text: 'Hangi oda, hangi gün, hangi ruh hali: ayrıntılı rapor Premium\'da.' },
};

/** Kullanıcının kendi eylemiyle açtığı anlar sıklık sınırına takılmaz. */
const USER_INITIATED: PaywallMoment[] = ['theme', 'report'];

export function shouldShowPaywall(
  moment: PaywallMoment, mem: PaywallMemory, premium: boolean, now = Date.now(),
): boolean {
  if (premium) return false;
  if (USER_INITIATED.includes(moment)) return true;
  const today = dayKey(now);
  if (moment === 'onboarding') return mem.last !== today;
  if (!mem.first) return false;
  const age = Math.round((dayTs(today) - dayTs(mem.first)) / 86400000);
  if (age < QUIET_DAYS) return false;
  return mem.last !== today;
}

/** Paywall gösterildi: ilk gün ve son gün kaydedilir. */
export function markPaywallShown(mem: PaywallMemory, now = Date.now()): PaywallMemory {
  const today = dayKey(now);
  return { first: mem.first ?? today, last: today };
}

/** Uygulamanın ilk açıldığı günü kaydeder (sessiz dönem buradan sayılır). */
export function markFirstSeen(mem: PaywallMemory, now = Date.now()): PaywallMemory {
  return mem.first ? mem : { ...mem, first: dayKey(now) };
}

export const isStreakMark = (streak: number) => (STREAK_MARKS as readonly number[]).includes(streak);

/* ---------- ne zaman satış önerisi? ---------- */

export type UpsellSignals = {
  /** Uygulamayı kullandığı toplam gün. */
  activeDays: number;
  /** Güncel seri. */
  streak: number;
  /** Bu hafta Premium'a kilitli bir şeye dokunma sayısı (tema, rapor, 2. kat...). */
  lockedTaps: number;
  /** Yapay zekâ tarama hakkı bitti mi. */
  scanLimitHit: boolean;
  /** Paywall kaç kez gösterildi ve kaç kez kapatıldı. */
  shown: number;
  dismissed: number;
  /** Paywall en son kaç gün önce gösterildi (hiç yoksa null). */
  daysSinceShown: number | null;
};

/**
 * Premium önerisi puanı: değer görmüş (aktif gün, seri) ve kilide çarpmış (kilitli dokunuş, tarama sınırı) kişi hazırdır.
 * Her kapatma bekleme süresini uzatır (2, 4, 8... gün, en çok 30); ilk 3 gün hiç. Eşik 50.
 */
export function upsellScore(s: UpsellSignals): number {
  if (s.activeDays < QUIET_DAYS) return 0;
  const value = Math.min(30, s.activeDays * 2) + Math.min(20, s.streak * 2);
  const intent = Math.min(30, s.lockedTaps * 15) + (s.scanLimitHit ? 30 : 0);
  return Math.min(100, value + intent);
}

export const UPSELL_THRESHOLD = 50;

/** Bekleme süresi (gün): her kapatmada ikiye katlanır. */
export const upsellCooldown = (dismissed: number) => Math.min(30, 2 ** Math.max(1, dismissed));

export function shouldUpsell(s: UpsellSignals, premium: boolean): boolean {
  if (premium) return false;
  if (s.daysSinceShown != null && s.daysSinceShown < upsellCooldown(s.dismissed)) return false;
  return upsellScore(s) >= UPSELL_THRESHOLD;
}
