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
