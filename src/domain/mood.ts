import type { MokaPose } from '@/constants/moka';

import { quickPick } from './logic';
import { addDays, dayKey } from './play';
import type { AppState, DayKey, Play, TaskRef } from './types';

/**
 * Günün ilk açılışında Moka iki şey sorar: "Bugün nasıl hissediyorsun?" ve "Bugün için planın var mı?".
 * Cevap sadece sunumu değiştirir (önerilen iş sayısı, sıralama, metinler). İşler silinmez,
 * puan ve seri kuralları aynı kalır.
 */

export type Feel = 'enerjik' | 'iyi' | 'yorgun' | 'bunalmis' | 'keyifsiz';
export type DayBusy = 'evde' | 'biraz' | 'yogun';
/** O günün cevabı. `skip`: kullanıcı soruyu atladı, o gün bir daha sorulmaz. */
export type CheckIn = { feel: Feel; busy: DayBusy; at: number; note?: string } | { skip: true; at: number };

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

/**
 * Günlük iki soru (Melih, 2026-11-06): her günün ilk açılışında "Bugün nasılsın?", aynı günün ikinci
 * açılışında "Bugün evde misin?". Kurulum gününde (ilk indirme) ikisi de sorulmaz; ertesi günden başlar.
 * `first`: ilk açılış günü (kurulumdan önce yazılır; eski kullanıcılarda boş = kısıt yok).
 */
export type DailyAsk = { first?: DayKey; day?: DayKey; opens?: number; feel?: Feel; feelDone?: boolean; busyDone?: boolean };
export type Stage = 'feel' | 'busy';

/** Uygulama oturumu başına bir kere çağrılır: bugünün açılış sayacını artırır, yeni günde soruları sıfırlar. */
export function countOpen(P: Play, now = Date.now()) {
  const day = dayKey(now);
  const a: DailyAsk = P.ask ?? {};
  P.ask = a.day === day ? { ...a, opens: (a.opens ?? 0) + 1 } : { first: a.first, day, opens: 1 };
}
/** Kurulumdan önce ilk gün işaretlenir. */
export function markFirstDay(P: Play, now = Date.now()) {
  if (!P.ask?.first) P.ask = { ...(P.ask ?? {}), first: dayKey(now) };
}
/** Şu an hangi soru sorulmalı? (Sayaç henüz sayılmadıysa açılış 1 sayılır.) */
export function stageOf(P: Play, now = Date.now()): Stage | null {
  const day = dayKey(now);
  const a = P.ask;
  if (a?.first === day) return null;
  const same = a?.day === day;
  const opens = same ? a?.opens ?? 1 : 1;
  if (!same || !a?.feelDone) return 'feel';
  return opens >= 2 && !a.busyDone ? 'busy' : null;
}
/** Bugün sorulmalı mı. */
export const needsCheckin = (P: Play, now = Date.now()) => stageOf(P, now) != null;

const today = (P: Play, now: number) => {
  const day = dayKey(now);
  if (P.ask?.day !== day) P.ask = { first: P.ask?.first, day, opens: 1 };
  return P.ask!;
};
/** 1. soru: "nasılsın". Cevap hemen planı besler (yoğunluk 'biraz' varsayılır, 2. soru günceller). */
export function answerFeel(P: Play, feel: Feel, now = Date.now()) {
  const a = today(P, now);
  P.ask = { ...a, feel, feelDone: true };
  const prev = P.checkins?.[dayKey(now)] ?? null;
  saveCheckin(P, { feel, busy: answered(prev) ? prev.busy : 'biraz', at: now, note: answered(prev) ? prev.note : undefined }, now);
}
export function skipFeel(P: Play, now = Date.now()) {
  P.ask = { ...today(P, now), feelDone: true };
}
/** 2. soru: "evde misin". */
export function answerBusy(P: Play, busy: DayBusy, now = Date.now()) {
  const a = today(P, now);
  P.ask = { ...a, busyDone: true };
  const prev = P.checkins?.[dayKey(now)] ?? null;
  const feel: Feel = a.feel ?? (answered(prev) ? prev.feel : 'iyi');
  saveCheckin(P, { feel, busy, at: now, note: answered(prev) ? prev.note : undefined }, now);
}
export function skipBusy(P: Play, now = Date.now()) {
  P.ask = { ...today(P, now), busyDone: true };
}
export const answered = (c: CheckIn | null): c is { feel: Feel; busy: DayBusy; at: number; note?: string } => !!c && !('skip' in c);
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

export const NOTE_MAX = 140;
/** Notu kırpar; boşsa undefined (kayda yazılmaz). */
export const cleanNote = (n: string) => n.trim().slice(0, NOTE_MAX) || undefined;

/** Son `days` günün check-in geçmişi, yeniden eskiye. Sadece cevaplanmış günler. */
export function moodHistory(P: Play, now = Date.now(), days = 30): { key: DayKey; feel: Feel; note?: string }[] {
  const today = dayKey(now);
  const out: { key: DayKey; feel: Feel; note?: string }[] = [];
  for (let i = 0; i < days; i++) {
    const key = addDays(today, -i);
    const c = P.checkins?.[key] ?? null;
    if (answered(c)) out.push({ key, feel: c.feel, note: c.note });
  }
  return out;
}

/** Bugünün notunu günceller (check-in yoksa orta yoğunlukla oluşturmaz, sadece varsa yazar). */
export function setCheckinNote(P: Play, note: string, now = Date.now()) {
  const k = dayKey(now);
  const c = P.checkins?.[k];
  if (c && answered(c)) P.checkins[k] = { ...c, note: cleanNote(note) };
}
