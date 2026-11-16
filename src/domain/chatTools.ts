import { dateLocale } from '@/i18n/runtime';
import { applyTaskAction } from '@/notifications/actions';
import { DAY } from './constants';
import { addWater, hKey, waterOf } from './habits';
import { allTasks, uid } from './logic';
import { doseKey, dosesOn, markDose, newMed, removeMed } from './meds';
import { saveCheckin, answered, checkinOf, type Feel } from './mood';
import { markPetDone } from './pets';
import { awardLocal, dayKey, pruneLog } from './play';
import { addShop, removeShop, SHOP_CATS } from './shopping';
import type { AppState, DayKey, MedMark, ShopCat } from './types';

/**
 * Moka sohbet araçlarının uygulama tarafındaki TEK kaydı. Sunucudaki karşılığı:
 * supabase/functions/_shared/chatTools.ts (şema + doğrulama). Yeni araç eklemek için ikisine de aynı adla bir kayıt ekle;
 * test (chatTools.test.ts) adların eşleştiğini kontrol eder. Her uygulayıcı telefondaki gerçek veriye göre ikinci kez doğrular.
 */

export type ChatAction = { type: string; confirm?: boolean } & Record<string, unknown>;

export type Applied = {
  ok: boolean;
  line: string;
  focus?: { minutes: number; topic: string };
  /** Açılacak ekran (expo-router yolu). */
  go?: string;
  /** Yapılanı geri alır (taslak state üzerinde). Geri alınamayan işlerde yok. */
  undo?: (D: AppState) => void;
};

type Env = { now: number; mult: number };
type Exec = (D: AppState, a: Record<string, unknown>, env: Env) => Applied;

const FAIL: Applied = { ok: false, line: '' };
const txt = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const int = (v: unknown) => Math.floor(Number(v));
const list = (v: unknown, max: number, len: number) =>
  Array.isArray(v) ? [...new Set(v.map(x => txt(x, len)).filter(Boolean))].slice(0, max) : [];
const norm = (s: string) => s.toLocaleLowerCase('tr').trim();

const NOTE_CAP = 200;
/** Sunucudaki `start_focus` türleri → Odak ekranındaki konu hapları (src/app/odak.tsx, TOPICS). */
const FOCUS_KINDS: Record<string, { label: string; topic: string }> = {
  ders: { label: 'Ders', topic: '📚 Ders' },
  calisma: { label: 'Çalışma', topic: '💻 İş' },
  spor: { label: 'Spor', topic: '🧘 Diğer' },
  temizlik: { label: 'Temizlik', topic: '🧘 Diğer' },
};
const MOODS = ['😊', '😌', '😐', '😔', '😫', '🥰'];
const FEELS: Feel[] = ['enerjik', 'iyi', 'yorgun', 'bunalmis', 'keyifsiz'];
const SPORT_EMOJI: Record<string, string> = { Yürüyüş: '🚶', Koşu: '🏃', Yoga: '🧘', Bisiklet: '🚴', Yüzme: '🏊', Ağırlık: '🏋️', Pilates: '🤸', Diğer: '💪' };
/** `open_screen` ekranları → yollar. Sunucudaki SCREENS ile aynı adlar. */
export const SCREENS: Record<string, string> = {
  bugun: '/bugun', odalar: '/odalar', gelisim: '/gelisim', ilac: '/ilac', gunluk: '/gunluk', spor: '/spor', evcil: '/evcil', yemek: '/yemek',
  bahce: '/bahce', magaza: '/magaza', bakim: '/bakim', odak: '/odak', ruhhali: '/ruhhali', hafta: '/hafta', plan: '/plan', aliskanlik: '/aliskanlik',
};

export function noteDayLabel(day: DayKey, now = Date.now()) {
  const today = dayKey(now);
  if (day === today) return 'Bugün';
  if (day === dayKey(now + DAY)) return 'Yarın';
  return new Date(`${day}T12:00:00`).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long' });
}

/* ---------- araçlar ---------- */

const EXEC: Record<string, Exec> = {
  add_task(D, a) {
    const name = txt(a.name, 60);
    const every = int(a.every_days);
    const rid = txt(a.room_id, 40);
    const tasks = D.tasks[rid];
    if (!D.rooms[rid] || !tasks || !name || !(every >= 1 && every <= 365)) return FAIL;
    const id = uid();
    tasks.push({ id, name, every, last: null });
    return {
      ok: true,
      line: `➕ ${D.rooms[rid].name}: ${name} (${every === 1 ? 'her gün' : `${every} günde bir`})`,
      undo: X => void (X.tasks[rid] &&= X.tasks[rid].filter(t => t.id !== id)),
    };
  },
  complete_task(D, a, { now, mult }) {
    const out = applyTaskAction(D, txt(a.task_id, 40), 'yaptim', now, mult);
    if (!out) return FAIL;
    return { ok: true, line: out.already ? `✓ ${out.name} zaten tamamdı` : `✅ ${out.name} tamam` };
  },
  snooze_task(D, a, { now }) {
    const out = applyTaskAction(D, txt(a.task_id, 40), 'yapmadim', now);
    return out ? { ok: true, line: `⏰ ${out.name} yarına ertelendi` } : FAIL;
  },
  remove_task(D, a, { now }) {
    const id = txt(a.task_id, 40);
    const ref = allTasks(D, now).find(x => x.t.id === id);
    if (!ref) return FAIL;
    if (ref.list === 'care') D.care = D.care.filter(t => t.id !== id);
    else if (ref.list === 'plants') D.mod[ref.rid].plants = (D.mod[ref.rid].plants ?? []).filter(t => t.id !== id);
    else D.tasks[ref.rid] = (D.tasks[ref.rid] ?? []).filter(t => t.id !== id);
    return { ok: true, line: `🗑️ ${ref.t.name} silindi` };
  },
  add_note(D, a, { now }) {
    const text = txt(a.text, 140);
    const day = String(a.day ?? '');
    const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(a.time ?? '')) ? String(a.time) : '';
    const t = Date.parse(`${day}T12:00:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(t) || !text) return FAIL;
    if (t < now - 366 * DAY || t > now + 731 * DAY) return FAIL;
    const id = uid();
    const full = time ? `${time} · ${text}` : text;
    D.play.notes.push({ id, day, text: full, at: now });
    D.play.notes = D.play.notes.slice(-NOTE_CAP);
    return { ok: true, line: `📝 ${noteDayLabel(day, now)}: ${full}`, undo: X => void (X.play.notes = X.play.notes.filter(n => n.id !== id)) };
  },
  start_focus(_D, a) {
    const minutes = int(a.minutes);
    const kind = FOCUS_KINDS[String(a.kind)];
    if (!kind || !(minutes >= 10 && minutes <= 90)) return FAIL;
    return { ok: true, line: `🍅 ${kind.label} odağı: ${minutes} dk`, focus: { minutes, topic: kind.topic } };
  },
  shop_add(D, a, { now }) {
    const names = list(a.items, 10, 40);
    const cat = SHOP_CATS.some(c => c.id === a.cat) ? (a.cat as ShopCat) : 'market';
    if (!names.length) return FAIL;
    const added = names.filter(n => addShop(D, n, cat, now));
    if (!added.length) return { ok: true, line: '🛒 Hepsi zaten listede' };
    const ids = D.shop.filter(i => added.some(n => norm(n) === norm(i.name)) && i.at === now).map(i => i.id);
    return { ok: true, line: `🛒 Ekledim: ${added.join(', ')}`, undo: X => void (X.shop = X.shop.filter(i => !ids.includes(i.id))) };
  },
  shop_check(D, a) {
    const names = list(a.items, 10, 40).map(norm);
    const hit = D.shop.filter(i => !i.done && names.includes(norm(i.name)));
    if (!hit.length) return { ok: false, line: 'Listede bulamadım' };
    hit.forEach(i => void (i.done = true));
    const ids = hit.map(i => i.id);
    return { ok: true, line: `✅ Alındı: ${hit.map(i => i.name).join(', ')}`, undo: X => void X.shop.forEach(i => { if (ids.includes(i.id)) i.done = false; }) };
  },
  shop_remove(D, a) {
    const names = list(a.items, 10, 40).map(norm);
    const hit = D.shop.filter(i => names.includes(norm(i.name)));
    if (!hit.length) return { ok: false, line: 'Listede bulamadım' };
    hit.forEach(i => removeShop(D, i.id));
    return { ok: true, line: `🗑️ Listeden çıkardım: ${hit.map(i => i.name).join(', ')}` };
  },
  journal_add(D, a, { now, mult }) {
    const text = txt(a.text, 400);
    if (!text) return FAIL;
    const mood = MOODS.includes(String(a.mood)) ? String(a.mood) : null;
    const day = dayKey(now);
    const prev = D.play.journal[day];
    D.play.journal[day] = { ...prev, text: prev?.text ? `${prev.text}\n${text}`.slice(0, 2000) : text, mood: mood ?? prev?.mood ?? null, at: now };
    awardLocal(D, 'gunluk', 'gunluk', '📔 Günlüğe yazdım', now, mult);
    pruneLog(D.play);
    return { ok: true, line: '📔 Günlüğe yazdım', undo: X => { if (prev) X.play.journal[day] = prev; else delete X.play.journal[day]; } };
  },
  med_add(D, a, { now }) {
    const name = txt(a.name, 40);
    const times = list(a.times, 4, 5).filter(t => /^([01]\d|2[0-3]):[0-5]\d$/.test(t));
    if (!name || !times.length) return FAIL;
    const med = newMed(name, txt(a.dose, 30), times, [], now, a.kind === 'takviye' ? 'takviye' : 'ilac');
    D.meds.push(med);
    return { ok: true, line: `💊 ${name}: ${times.join(', ')} hatırlatması`, undo: X => removeMed(X, med.id) };
  },
  med_log(D, a, { now }) {
    const med = D.meds.find(m => m.id === txt(a.med_id, 40));
    const s = a.status === 'skipped' ? 'skipped' : a.status === 'taken' ? 'taken' : null;
    if (!med || !s) return FAIL;
    const day = dayKey(now);
    const doses = dosesOn(D, day).filter(d => d.med.id === med.id);
    const wanted = String(a.time ?? '');
    const dose = doses.find(d => d.time === wanted) ?? doses.find(d => !d.mark) ?? doses[0];
    if (!dose) return { ok: false, line: `${med.name} bugün için planlı değil` };
    const prev: MedMark | undefined = D.medLog[day]?.[dose.key];
    markDose(D, day, doseKey(med.id, dose.time), s, now);
    return {
      ok: true,
      line: `${s === 'taken' ? '✅' : '⏭️'} ${med.name} ${dose.time} ${s === 'taken' ? 'alındı' : 'atlandı'}`,
      undo: X => void (prev ? ((X.medLog[day] ||= {})[dose.key] = prev) : markDose(X, day, dose.key, null)),
    };
  },
  water_log(D, a, { now }) {
    const n = int(a.glasses);
    if (!(n >= 1 && n <= 10)) return FAIL;
    const day = hKey(now);
    const before = waterOf(D.play.habits, day);
    addWater(D.play.habits, day, n);
    const after = waterOf(D.play.habits, day);
    return { ok: true, line: `💧 ${after}/${D.play.habits.waterGoal} bardak`, undo: X => addWater(X.play.habits, day, before - waterOf(X.play.habits, day)) };
  },
  sport_log(D, a, { now, mult }) {
    const type = String(a.sport);
    const min = int(a.minutes);
    if (!(type in SPORT_EMOJI) || !(min >= 5 && min <= 300)) return FAIL;
    const id = uid();
    const day = dayKey(now);
    D.play.sport.unshift({ id, day, type, min, at: now });
    D.play.sport.splice(400);
    const label = `${SPORT_EMOJI[type]} ${type} · ${min} dk`;
    const r = awardLocal(D, 'spor', 'spor', label, now, mult);
    if (!r.awarded) (D.play.log[day] ||= []).push(label);
    pruneLog(D.play);
    return { ok: true, line: label, undo: X => void (X.play.sport = X.play.sport.filter(s => s.id !== id)) };
  },
  pet_care(D, a, { now }) {
    const pet = D.pets.find(p => p.id === txt(a.pet_id, 40));
    const item = pet?.items.find(i => i.id === txt(a.item_id, 40));
    if (!pet || !item) return FAIL;
    const prev = item.last;
    markPetDone(D, pet.id, item.id, now);
    return {
      ok: true,
      line: `${item.emoji} ${pet.name}: ${item.name} ✓`,
      undo: X => { const it = X.pets.find(p => p.id === pet.id)?.items.find(i => i.id === item.id); if (it) it.last = prev; },
    };
  },
  mood_checkin(D, a, { now }) {
    const feel = String(a.feel) as Feel;
    if (!FEELS.includes(feel)) return FAIL;
    const prev = D.play.checkins?.[dayKey(now)];
    const cur = checkinOf(D.play, now);
    saveCheckin(D.play, { feel, busy: answered(cur) ? cur.busy : 'biraz', at: now, note: answered(cur) ? cur.note : undefined }, now);
    return { ok: true, line: '💛 Ruh halini not aldım', undo: X => { const c = { ...(X.play.checkins ?? {}) }; if (prev) c[dayKey(now)] = prev; else delete c[dayKey(now)]; X.play.checkins = c; } };
  },
  open_screen(_D, a) {
    const go = SCREENS[String(a.screen)];
    return go ? { ok: true, line: '', go } : FAIL;
  },
};

/** Kayıtlı araç adları (testler sunucudaki kayıtla karşılaştırır). */
export const TOOL_NAMES = Object.keys(EXEC);

/** Silme gibi onay isteyen araçlar. Sunucu da `confirm` işareti koyar; telefon ikisine de bakar. */
export const DESTRUCTIVE = new Set(['remove_task', 'shop_remove']);
export const needsConfirm = (a: ChatAction) => !!a.confirm || DESTRUCTIVE.has(a.type);

/** Tek bir eylemi taslak state üzerinde uygular. Geçersizse `ok: false` döner, hiçbir şey değişmez. */
export function applyChatAction(D: AppState, a: ChatAction, now = Date.now(), mult = 1): Applied {
  const run = Object.hasOwn(EXEC, a?.type) ? EXEC[a.type] : null;
  if (!run) return FAIL;
  try {
    return run(D, a, { now, mult });
  } catch {
    return FAIL;
  }
}

/** Eylemin kısa okunur adı (onay sorusu için). */
export function describeAction(D: AppState, a: ChatAction, now = Date.now()): string {
  if (a.type === 'remove_task') return `🗑️ "${allTasks(D, now).find(x => x.t.id === a.task_id)?.t.name ?? 'iş'}" silinsin mi?`;
  if (a.type === 'shop_remove') return `🗑️ Listeden silinsin mi: ${list(a.items, 10, 40).join(', ')}`;
  return a.type;
}
