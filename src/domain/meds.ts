import { uid } from '@/domain/logic';
import { addDays, dayKey, dayTs } from '@/domain/play';
import type { AppState, Med, MedMark } from '@/domain/types';

/** Vakit geçtikten bu kadar dakika sonra doz "unutuldu" sayılır ve Moka nazikçe hatırlatır. */
export const MISSED_AFTER_MIN = 45;
/** Aynı anda zamanlanacak en çok ilaç bildirimi (iOS 64 sınırı için, bkz. notifications/schedule.ts). */
export const MED_NOTIF_CAP = 16;
const NOTIF_DAYS = 3;

export const MED_DISCLAIMER = 'Homezy tıbbi tavsiye vermez. İlaç ve dozları doktorunun ya da eczacının söylediği gibi kullan; bu sadece kendi notlarını hatırlatır.';

export const doseKey = (id: string, time: string) => `${id}@${time}`;

export const newMed = (name: string, dose: string, times: string[], days: number[], now = Date.now()): Med => ({
  id: uid(), name: name.trim(), dose: dose.trim(), times: [...times].sort(), days: [...days].sort(), start: now,
});

export type Dose = { med: Med; time: string; key: string; mark?: MedMark };
export type DoseState = 'taken' | 'skipped' | 'missed' | 'due' | 'later';

const minutesOf = (t: string) => {
  const [h, m] = t.split(':').map(n => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
};

/** O gün alınması gereken dozlar, saat sırasıyla. İlaç eklendiği günden önceki günler boş. */
export function dosesOn(S: Pick<AppState, 'meds' | 'medLog'>, day: string): Dose[] {
  const wd = new Date(dayTs(day)).getDay();
  const out: Dose[] = [];
  for (const med of S.meds) {
    if (day < dayKey(med.start)) continue;
    if (med.days.length && !med.days.includes(wd)) continue;
    for (const time of med.times) {
      const key = doseKey(med.id, time);
      out.push({ med, time, key, mark: S.medLog[day]?.[key] });
    }
  }
  return out.sort((a, b) => minutesOf(a.time) - minutesOf(b.time) || a.med.name.localeCompare(b.med.name));
}

/** Bugünün bir dozunun durumu. */
export function doseState(d: Dose, now = Date.now()): DoseState {
  if (d.mark) return d.mark.s;
  const at = new Date(now);
  const cur = at.getHours() * 60 + at.getMinutes();
  const t = minutesOf(d.time);
  if (cur >= t + MISSED_AFTER_MIN) return 'missed';
  return cur >= t ? 'due' : 'later';
}

/** Bugün saati geçmiş ve işaretlenmemiş dozlar. */
export const missedNow = (S: Pick<AppState, 'meds' | 'medLog'>, now = Date.now()) =>
  dosesOn(S, dayKey(now)).filter(d => doseState(d, now) === 'missed');

/** Bir dozu işaretler; `null` işareti kaldırır. */
export function markDose(D: Pick<AppState, 'medLog'>, day: string, key: string, s: 'taken' | 'skipped' | null, now = Date.now()) {
  if (!s) {
    if (D.medLog[day]) {
      delete D.medLog[day][key];
      if (!Object.keys(D.medLog[day]).length) delete D.medLog[day];
    }
    return;
  }
  (D.medLog[day] ||= {})[key] = { s, at: now };
}

/** Silinen ilacın kayıtlarını da temizler. */
export function removeMed(D: Pick<AppState, 'meds' | 'medLog'>, id: string) {
  D.meds = D.meds.filter(m => m.id !== id);
  for (const day of Object.keys(D.medLog)) {
    for (const k of Object.keys(D.medLog[day])) if (k.startsWith(`${id}@`)) delete D.medLog[day][k];
    if (!Object.keys(D.medLog[day]).length) delete D.medLog[day];
  }
}

export type DayHist = { day: string; total: number; taken: number; skipped: number };

/** Son `n` günün özeti (bugün dahil, eskiden yeniye). Bugünün henüz gelmemiş dozları "total"a girmez. */
export function history(S: Pick<AppState, 'meds' | 'medLog'>, n = 7, now = Date.now()): DayHist[] {
  const today = dayKey(now);
  const out: DayHist[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const day = addDays(today, -i);
    const ds = dosesOn(S, day).filter(d => day !== today || d.mark || doseState(d, now) !== 'later');
    out.push({
      day, total: ds.length, taken: ds.filter(d => d.mark?.s === 'taken').length, skipped: ds.filter(d => d.mark?.s === 'skipped').length,
    });
  }
  return out;
}

/** 0–100: alınan / planlanan; hiç doz yoksa null. */
export function adherence(h: DayHist[]): number | null {
  const total = h.reduce((a, x) => a + x.total, 0);
  return total ? Math.round((h.reduce((a, x) => a + x.taken, 0) / total) * 100) : null;
}

/** Moka'nın nazik cümlesi. Doz atlama ya da katlama önerisi içermez. */
export function mokaMedLine(missed: Dose[], dueNow: Dose[], allDone: boolean): string {
  if (missed.length) {
    const n = missed[0].med.name;
    return missed.length === 1
      ? `☕ Moka usulca soruyor: ${n} vakti geçmiş gibi. Aldıysan işaretle; emin değilsen doktoruna ya da eczacına danışabilirsin.`
      : `☕ Moka usulca soruyor: ${missed.length} ilacın vakti geçmiş gibi. Aldıklarını işaretle; emin değilsen doktoruna ya da eczacına danışabilirsin.`;
  }
  if (dueNow.length) return `💊 ${dueNow[0].med.name} vakti geldi. Moka yanında, acele yok.`;
  if (allDone) return '🌟 Bugünkü ilaçların tamam. Moka seninle gurur duyuyor!';
  return '☕ Moka bugünkü ilaçlarını hatırlayacak.';
}

/**
 * Önümüzdeki günlerin ilaç bildirimleri: vakitte bir hatırlatma ve 45 dakika sonra tek nazik ikinci hatırlatma.
 * İşaretlenmiş dozlar atlanır. En yakın `MED_NOTIF_CAP` tanesi alınır.
 */
export function medNotifs(S: AppState, now = Date.now()) {
  if (!S.settings.meds || !S.meds.length) return [];
  const out: { id: string; at: Date; title: string; body: string }[] = [];
  const today = dayKey(now);
  for (let d = 0; d < NOTIF_DAYS; d++) {
    const day = addDays(today, d);
    for (const dose of dosesOn(S, day)) {
      if (dose.mark) continue;
      const t = minutesOf(dose.time);
      const label = dose.med.dose ? `${dose.med.name} · ${dose.med.dose}` : dose.med.name;
      const first = new Date(dayTs(day));
      first.setHours(Math.floor(t / 60), t % 60, 0, 0);
      if (first.getTime() > now) out.push({ id: `ilac-${dose.key}-${day}`, at: first, title: '💊 İlaç vakti', body: label });
      const again = new Date(first.getTime() + MISSED_AFTER_MIN * 60000);
      if (again.getTime() > now)
        out.push({ id: `ilac2-${dose.key}-${day}`, at: again, title: '☕ Moka usulca soruyor', body: `${dose.med.name} aldın mı? Aldıysan uygulamada işaretle.` });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MED_NOTIF_CAP);
}

