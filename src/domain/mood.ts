import type { MokaPose } from '@/constants/moka';

import { quickPick } from './logic';
import { dayKey } from './play';
import type { AppState, DayKey, Play, TaskRef } from './types';

/**
 * Günün ilk açılışında Moka iki şey sorar: "Bugün nasıl hissediyorsun?" ve "Bugün için planın var mı?".
 * Cevap sadece sunumu değiştirir (önerilen iş sayısı, sıralama, metinler). İşler silinmez,
 * puan ve seri kuralları aynı kalır.
 */

export type Feel = 'enerjik' | 'iyi' | 'yorgun' | 'bunalmis' | 'keyifsiz';
export type DayBusy = 'evde' | 'biraz' | 'yogun';
/** O günün cevabı. `skip`: kullanıcı soruyu atladı, o gün bir daha sorulmaz. */
export type CheckIn = { feel: Feel; busy: DayBusy; at: number } | { skip: true; at: number };

export const FEELS: { id: Feel; emoji: string; label: string; pose: MokaPose }[] = [
  { id: 'enerjik', emoji: '🤩', label: 'Enerjik', pose: 'party' },
  { id: 'iyi', emoji: '🙂', label: 'İyi', pose: 'happy' },
  { id: 'yorgun', emoji: '😴', label: 'Yorgun', pose: 'sleepy' },
  { id: 'bunalmis', emoji: '😵‍💫', label: 'Bunalmış', pose: 'panicked' },
  { id: 'keyifsiz', emoji: '😔', label: 'Keyifsiz', pose: 'blanket' },
];

export const BUSY: { id: DayBusy; emoji: string; label: string; sub: string }[] = [
  { id: 'evde', emoji: '🏠', label: 'Evdeyim', sub: 'Vaktim bol' },
  { id: 'biraz', emoji: '☕', label: 'Biraz işim var', sub: 'Arada vakit bulurum' },
  { id: 'yogun', emoji: '🏃', label: 'Yoğun bir gün', sub: 'Pek vaktim yok' },
];

/** Günlük ekranındaki emojiyle eşleşme (günlük yazarken mod önceden seçili gelsin). */
const JOURNAL_EMOJI: Record<Feel, string> = { enerjik: '😄', iyi: '🙂', yorgun: '😴', bunalmis: '😐', keyifsiz: '😔' };

export const checkinOf = (P: Play, now = Date.now()): CheckIn | null => P.checkins?.[dayKey(now)] ?? null;
/** Bugün sorulmalı mı: henüz cevap da yok, atlama da. */
export const needsCheckin = (P: Play, now = Date.now()) => !checkinOf(P, now);
export const answered = (c: CheckIn | null): c is { feel: Feel; busy: DayBusy; at: number } => !!c && !('skip' in c);
export const journalMood = (c: CheckIn | null) => (answered(c) ? JOURNAL_EMOJI[c.feel] : null);
export const feelOf = (id: Feel) => FEELS.find(f => f.id === id)!;

/** Cevaba göre günün planı: kaç dakikalık iş önerilir, Moka ne der. */
export type DayPlan = {
  minutes: number;
  title: string;
  line: string;
  /** Ana ekrandaki selamın altındaki cümle. */
  hello: string;
  pose: MokaPose;
  /** Önerilen işler bittiyse söylenecek. */
  doneLine: string;
};

const LOW: Feel[] = ['yorgun', 'bunalmis', 'keyifsiz'];

export function dayPlan(c: CheckIn | null): DayPlan | null {
  if (!answered(c)) return null;
  const low = LOW.includes(c.feel);
  const pose = feelOf(c.feel).pose;
  // Dakika: modun ve yoğunluğun en kısıtlayıcısı.
  const byBusy = { evde: 60, biraz: 30, yogun: 10 }[c.busy];
  const byFeel = { enerjik: 60, iyi: 45, yorgun: 15, bunalmis: 10, keyifsiz: 15 }[c.feel];
  const minutes = Math.min(byBusy, byFeel);
  if (c.feel === 'bunalmis')
    return { minutes, pose, title: 'Bugün sadece bir minik iş', line: 'Hepsini düşünme. Sadece bunu yap, gerisi bekleyebilir.', hello: 'Derin bir nefes al, bugün az ama öz.', doneLine: 'Yaptın bile! Bugün bu kadarı yeter 💛' };
  if (low)
    return {
      minutes, pose: c.feel === 'yorgun' ? 'sleepy' : pose,
      title: 'Bugün hafif gidelim',
      line: c.busy === 'yogun' ? 'Hem yorgun hem yoğunsun. Şu kısacık iş yeter.' : 'Kendini yorma. Şu kısa işler evini toparlar.',
      hello: c.feel === 'yorgun' ? 'Yorgunsun, bugün kendine nazik ol.' : 'Keyfin yoksa da sorun değil, ben buradayım.',
      doneLine: 'Bugünlük harika, şimdi biraz dinlen ☕',
    };
  if (c.busy === 'yogun')
    return { minutes, pose: 'laptop', title: '10 dakikalık hızlı plan', line: 'Yoğun gününe sığacak kadar kısa. Gerisi yarına.', hello: 'Yoğun gün! Seni hızlıca kurtaralım.', doneLine: 'Koşturmacada bile yaptın, süpersin!' };
  if (c.feel === 'enerjik')
    return { minutes, pose, title: 'Bugün evi parlatalım', line: c.busy === 'evde' ? 'Enerjin yüksek, vaktin bol. Bonus işlere de bakalım mı?' : 'Enerjin yerinde. Bu sıralamayla hızla bitirirsin.', hello: 'Enerjin süper, bugün ev parlayacak!', doneLine: 'Hepsi bitti! İstersen Bu hafta listesinden bir bonus seç 🌟' };
  return { minutes, pose, title: 'Bugünün planı', line: c.busy === 'evde' ? 'Rahat bir gün. Sırayla bunları yapalım.' : 'Arada yapabileceğin işleri seçtim.', hello: 'Güzel bir gün, birlikte halledelim.', doneLine: 'Plan tamam! Bugün harikaydın 🎉' };
}

/** Plana göre önerilen işler (bugün bitenler hariç). En az bir iş, varsa. */
export function planTasks(S: AppState, plan: DayPlan, now = Date.now()): TaskRef[] {
  const picked = quickPick(S, plan.minutes, now);
  if (picked.length) return picked;
  return quickPick(S, 600, now).sort((a, b) => a.min - b.min).slice(0, 1);
}

/** Bugünün cevabını yazar (draft içinde). */
export function saveCheckin(P: Play, c: CheckIn, now = Date.now()) {
  P.checkins = { ...(P.checkins || {}), [dayKey(now)]: c };
  // Eski cevaplar birikmesin: son 120 gün.
  const keys = Object.keys(P.checkins).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - 120))) delete P.checkins[k as DayKey];
}
