import type { SkyKind } from '@/lib/weather';

/**
 * Moka'nın odadaki cümle bankası: yapay zekâ değil, telefonda. Sohbet hakkı düşmez, internetsiz çalışır.
 * Metinler Türkçe anahtardır; çevirileri src/i18n/mokaOda.ts (9 dil). `{}` sayı ya da ad yeridir.
 * Ton: sıcak ev arkadaşı, asla suçlamaz; en çok iki kısa cümle, en çok bir emoji.
 */
export const LINES = {
  morning: ['Günaydın! Kahvem hazır ☕ Bugün {} işimiz var.', 'Günaydın! Bugün {} küçük işimiz var, birlikte hallederiz 🌤️'],
  morningFree: ['Günaydın! Bugün işimiz yok, keyfine bak ☕'],
  afternoon: ['Selam! Bugün {} işimiz kaldı. En kısasından başlayalım mı?'],
  afternoonFree: ['Selam! Bugün sakin bir gün 🌿'],
  evening: ['İyi akşamlar! Bugün {} iş kaldı, istersen birini yapalım 🌙'],
  eveningFree: ['İyi akşamlar! Çay mı, kahve mi? ☕'],
  night: ['Geç oldu, uykun gelmedi mi? 🌙 Yarın için not alabilirim.'],
  allDone: ['Bugün harikaydın, oda pırıl pırıl ✨', 'Bugünün bütün işleri bitti! Seninle gurur duyuyorum 🥳'],
  manyLate: ['Birikmiş {} iş var. Hiç dert değil, en kısasından başlayalım mı?'],
  noTasks: ['Henüz işimiz yok. İlkini birlikte ekleyelim mi?'],
  sleeping: ['Zzz… 💤'],
  back: ['Döndün! Seni çok özledim 🥹', 'Geldin! Biraz toz birikmiş, birlikte silelim mi? 🧹'],
  tap: ['Hihi, gıdıklanıyorum! 🤭', 'Selam! 👋', 'Seni gördüğüme sevindim 💛', 'Kahve molası mı? ☕'],
  lampOn: ['Işık ne güzel, değil mi? ✨'],
  lampOff: ['Böyle daha huzurlu 🌙'],
  mug: ['Bir yudum kahve iyi gider ☕'],
  plant: ['Bitkilerim seni çok seviyor 🌿'],
  plantDue: ['{} sulanmayı bekliyor 💧'],
  idleDay: ['Kahvem soğumadan bir yudum ☕', 'Pencereden kuşları izliyorum 🐦'],
  idleNight: ['Hıı… biraz uykum geldi 🥱'],
  window_clear: ['Bugün dışarısı çok güzel!'],
  window_night: ['Yıldızlar çıkmış 🌙'],
  window_cloudy: ['Hava kapalı ama içerisi sıcacık ☁️'],
  window_rain: ['Yağmur yağıyor, içerisi ne güzel ☔'],
  window_storm: ['Fırtına var, iyi ki evdeyiz ⛈️'],
  window_snow: ['Kar yağıyor! Sıcak bir kahve şart ❄️'],
  window_fog: ['Dışarısı sisli, evde kalalım 🌫️'],
  introTap: ['Moka\'ya dokun 👆'],
  introHello: ['Burası benim odam! Hoş geldin ☕'],
  introObjects: ['Lambaya, kupaya ya da pencereye dokunabilirsin ✨'],
  introColor: ['Bana bir renk seçer misin? 🎨'],
  introNice: ['Çok yakıştı! 💛'],
  introPot: ['Bu kahve hep taze kalsın diye her gün küçük bir iş yeter ☕'],
  // Kahve sürahisi (seri): docs/moka-oda-usta-plan.md §4.1
  potFresh: ['Kahvemiz hâlâ taze ☕'],
  potFreshN: ['{} gündür taze ☕'],
  potWait: ['Bugün bir iş, kahve tazelenir ☕'],
  potWarm: ['Kahveyi senin için ılık tuttum ❄️'],
  potCold: ['Kahve soğumuş, yeniden demleyelim ☕'],
  potFirst: ['İlk kahveyi birlikte demleyelim ☕'],
  potBrewed: ['Kahve tazelendi, {} gün ☕'],
  potExplain: ['Serin artık benim kahvem ☕ {} gündür taze'],
  // Kilitli sohbet düğmesi (§3.3)
  lockLogin: ['Konuşmak için beni tanıman lazım ☕'],
  lockPremium: ["Sohbetimiz Premium'da. İşlerde hep yanındayım 💛"],
} as const;

export type LineKey = keyof typeof LINES;
/** Odada Moka'nın yüzü (MokaFace mimikleri). */
export type LineMood = 'happy' | 'cheer' | 'sleepy' | 'neutral' | 'wow';

/** Listeden `seed` ile bir cümle seç, `{}` yerine değeri koy. */
export function line(key: LineKey, seed = 0, value?: string | number): string {
  const list = LINES[key] as readonly string[];
  const s = list[Math.abs(seed) % list.length]!;
  return value == null ? s : s.replace('{}', String(value));
}

export type RoomDay = {
  /** Saat (0-23). */
  hour: number;
  /** Bugün yapılan iş sayısı. */
  done: number;
  /** Bugün bekleyen (geciken + bugünkü) iş sayısı. */
  due: number;
  /** Geciken iş sayısı. */
  late: number;
  /** Toplam iş sayısı (hiç yoksa ilk işi önerir). */
  total: number;
  /** Son girişten bu yana gün. */
  away: number;
};

/** Odaya girişte Moka'nın ilk cümlesi ve yüzü: gününe göre. */
export function openingLine(d: RoomDay, seed = 0): { key: LineKey; text: string; mood: LineMood; sleeping?: boolean } {
  const pick = (key: LineKey, mood: LineMood, v?: number) => ({ key, text: line(key, seed, v), mood });
  if (d.away >= 3) return { ...pick('sleeping', 'sleepy'), sleeping: true };
  if (d.total === 0) return pick('noTasks', 'happy');
  if (d.done > 0 && d.due === 0) return pick('allDone', 'cheer');
  if (d.late >= 3) return pick('manyLate', 'neutral', d.late);
  const h = d.hour;
  if (h >= 22 || h < 5) return pick('night', 'sleepy');
  if (h < 11) return d.due ? pick('morning', 'happy', d.due) : pick('morningFree', 'happy');
  if (h < 17) return d.due ? pick('afternoon', 'happy', d.due) : pick('afternoonFree', 'happy');
  return d.due ? pick('evening', 'happy', d.due) : pick('eveningFree', 'happy');
}

/** Pencereye dokununca: gerçek havaya göre. */
export function windowLine(sky: SkyKind, night: boolean): string {
  if (sky === 'clear') return line(night ? 'window_night' : 'window_clear');
  return line(`window_${sky}` as LineKey);
}
