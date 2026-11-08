import { DAY } from '@/domain/constants';
import { uid } from '@/domain/logic';
import type { AppState, Pet, PetItem, PetKind } from '@/domain/types';

const HOUR = 36e5;
/** Aynı anda zamanlanacak en çok evcil hayvan bildirimi (iOS 64 sınırı için). */
export const PET_NOTIF_CAP = 12;
const NOTIF_DAYS = 3;

export const PET_KINDS: { id: PetKind; emoji: string; label: string }[] = [
  { id: 'kedi', emoji: '🐱', label: 'Kedi' },
  { id: 'kopek', emoji: '🐶', label: 'Köpek' },
  { id: 'kus', emoji: '🐦', label: 'Kuş' },
  { id: 'balik', emoji: '🐠', label: 'Balık' },
  { id: 'diger', emoji: '🐾', label: 'Diğer' },
];
export const petEmoji = (p: Pet) => p.emoji || PET_KINDS.find(k => k.id === p.kind)?.emoji || '🐾';

export type PetPreset = { name: string; emoji: string; h: number };
const MAMA: PetPreset = { name: 'Mama', emoji: '🍽️', h: 12 };
const SU: PetPreset = { name: 'Su', emoji: '💧', h: 24 };
const VET: PetPreset = { name: 'Veteriner kontrol', emoji: '🩺', h: 365 * 24 };
const ASI: PetPreset = { name: 'Aşı', emoji: '💉', h: 365 * 24 };
const PARAZIT: PetPreset = { name: 'Parazit damlası', emoji: '🛡️', h: 30 * 24 };
const YIKAMA: PetPreset = { name: 'Yıkama', emoji: '🛁', h: 30 * 24 };
const TIRNAK: PetPreset = { name: 'Tırnak kesimi', emoji: '✂️', h: 21 * 24 };
/** Türe göre hazır bakım önerileri. Kullanıcı hepsini değiştirebilir, silebilir, kendi işini ekleyebilir. */
export const PRESETS: Record<PetKind, PetPreset[]> = {
  kedi: [MAMA, SU, { name: 'Kum temizliği', emoji: '🧹', h: 24 }, { name: 'Tüy tarama', emoji: '🪮', h: 7 * 24 }, TIRNAK, { ...YIKAMA, h: 60 * 24 }, PARAZIT, ASI, VET],
  kopek: [MAMA, { name: 'Yürüyüş', emoji: '🦮', h: 24 }, SU, YIKAMA, { ...TIRNAK, h: 30 * 24 }, PARAZIT, ASI, VET],
  kus: [{ name: 'Yem', emoji: '🌾', h: 24 }, SU, { name: 'Kafes temizliği', emoji: '🧹', h: 7 * 24 }, VET],
  balik: [{ name: 'Yem', emoji: '🍤', h: 24 }, { name: 'Su değişimi', emoji: '💧', h: 7 * 24 }, { name: 'Filtre temizliği', emoji: '🧽', h: 30 * 24 }],
  diger: [{ ...MAMA, h: 24 }, SU, { name: 'Temizlik', emoji: '🧹', h: 7 * 24 }, VET],
};

export const itemKey = (petId: string, itemId: string) => `${petId}@${itemId}`;

export const newPet = (name: string, kind: PetKind, emoji = ''): Pet => ({ id: uid(), name: name.trim(), kind, ...(emoji.trim() ? { emoji: emoji.trim() } : {}), items: [] });

export const newPetItem = (name: string, emoji: string, everyH: number, now = Date.now(), remind = true): PetItem => ({
  id: uid(), name: name.trim(), emoji: emoji.trim() || '🐾', everyH: Math.max(1, Math.round(everyH)), last: null, start: now, remind,
});

/** Bir sonraki vakit: son yapılma (yoksa eklenme) + aralık. */
export const dueAt = (it: PetItem) => (it.last ?? it.start) + it.everyH * HOUR;

export type PetState = { k: 'late' | 'today' | 'ok'; diff: number };
/** Gecikti (vakit geçti) / bugün (bugün içinde) / yolunda. `diff`: vakte kalan ms (eksi: gecikme). */
export function itemState(it: PetItem, now = Date.now()): PetState {
  const diff = dueAt(it) - now;
  const endOfDay = new Date(now);
  endOfDay.setHours(24, 0, 0, 0);
  return { k: diff < 0 ? 'late' : dueAt(it) < endOfDay.getTime() ? 'today' : 'ok', diff };
}

/** "20 dk" / "5 saat" / "3 gün". */
export function span(ms: number): string {
  const m = Math.round(Math.abs(ms) / 6e4);
  if (m < 60) return `${Math.max(1, m)} dk`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} saat`;
  const d = Math.round(h / 24);
  return d < 60 ? `${d} gün` : `${Math.round(d / 30)} ay`;
}

/** Durum yazısı: "2 saat gecikti" / "Vakti geldi" / "5 saat kaldı". */
export function stateText(s: PetState): string {
  if (s.k === 'late') return Math.abs(s.diff) < HOUR ? 'Vakti geldi' : `${span(s.diff)} gecikti`;
  return `${span(s.diff)} kaldı`;
}

/** "Son: 3 saat önce" / "Henüz kaydedilmedi". */
export const lastText = (it: PetItem, now = Date.now()) => (it.last == null ? 'Henüz kaydedilmedi' : `Son: ${span(now - it.last)} önce`);

/** Sıklık yazısı: "Her 12 saatte" / "Her 30 günde". */
export function everyText(h: number): string {
  if (h < 24 || h % 24) return `Her ${h} saatte`;
  const d = h / 24;
  return d % 365 === 0 ? (d === 365 ? 'Her yıl' : `Her ${d / 365} yılda`) : `Her ${d} günde`;
}

export type PetDue = { pet: Pet; item: PetItem; s: PetState };
/** Gecikmiş ve bugün vakti gelen işler, en acilden başlayarak. */
export function petsDue(S: Pick<AppState, 'pets'>, now = Date.now()): PetDue[] {
  const out: PetDue[] = [];
  for (const pet of S.pets ?? []) for (const item of pet.items) {
    const s = itemState(item, now);
    if (s.k !== 'ok') out.push({ pet, item, s });
  }
  return out.sort((a, b) => a.s.diff - b.s.diff);
}

/** "Şimdi yaptım": son yapılma zamanı şimdi olur. Aynı dakikada tekrar basmak bir şeyi değiştirmez. */
export function markPetDone(D: Pick<AppState, 'pets'>, petId: string, itemId: string, now = Date.now()): { pet: Pet; item: PetItem } | null {
  const pet = D.pets.find(p => p.id === petId);
  const item = pet?.items.find(i => i.id === itemId);
  if (!pet || !item) return null;
  if (item.last == null || now - item.last > 6e4) item.last = now;
  return { pet, item };
}

/** Son kaydı geri alır (yanlışlıkla basıldıysa): bir önceki hale dönmek yerine "kaydedilmedi" olur. */
export function undoPetDone(D: Pick<AppState, 'pets'>, petId: string, itemId: string) {
  const item = D.pets.find(p => p.id === petId)?.items.find(i => i.id === itemId);
  if (item) item.last = null;
}

export function removePet(D: Pick<AppState, 'pets'>, id: string) {
  D.pets = D.pets.filter(p => p.id !== id);
}

/** Bildirimdeki anahtardan işi bulur. */
export function findItem(S: Pick<AppState, 'pets'>, key: string): { pet: Pet; item: PetItem } | null {
  const [pid, iid] = key.split('@');
  const pet = (S.pets ?? []).find(p => p.id === pid);
  const item = pet?.items.find(i => i.id === iid);
  return pet && item ? { pet, item } : null;
}

/** Bildirim hâlâ geçerli mi: iş duruyor ve vakti geldi (ya da çok yakın). */
export function stillDue(S: Pick<AppState, 'pets'>, key: string, now = Date.now()) {
  const f = findItem(S, key);
  return !!f && dueAt(f.item) <= now + HOUR;
}

/** Gece yarısı ile 07:00 arası bildirim gitmesin: sabah 07:30'a kaydır. */
function awake(t: number): number {
  const d = new Date(t);
  if (d.getHours() >= 7) return t;
  d.setHours(7, 30, 0, 0);
  return d.getTime();
}

/**
 * Önümüzdeki günlerin evcil hayvan bildirimleri. Her iş için vakitte bir bildirim; sonraki turlar işin
 * zamanında yapılacağı varsayılarak eklenir (yapılmazsa uygulama açılınca ya da bildirim cevaplanınca yeniden kurulur).
 * Gecikmiş iş için tek bir bildirim, sabah özeti saatinde (ya da 30 dk sonra, o saat geçmediyse). Hatırlatması kapalı işler atlanır.
 */
export function petNotifs(S: AppState, now = Date.now()) {
  if (!S.settings.pets || !S.pets?.length) return [];
  const out: { id: string; at: Date; title: string; body: string; key: string }[] = [];
  const horizon = now + NOTIF_DAYS * DAY;
  const [hh, mm] = S.settings.time.split(':').map(n => parseInt(n, 10));
  for (const pet of S.pets) for (const it of pet.items) {
    if (!it.remind) continue;
    let t = dueAt(it);
    if (t <= now) {
      // Gecikmiş: bir sonraki sabah özeti saatinde bir kez.
      const m = new Date(now);
      m.setHours(hh || 9, mm || 0, 0, 0);
      t = m.getTime() > now ? m.getTime() : m.getTime() + DAY;
      if (t > horizon) continue;
      out.push({ id: `evcil-${pet.id}-${it.id}-${t}`, at: new Date(t), key: itemKey(pet.id, it.id), ...petNudge(pet, it) });
      continue;
    }
    for (let n = 0; n < 6 && t < horizon; n++, t += it.everyH * HOUR) {
      const at = awake(t);
      if (at > now) out.push({ id: `evcil-${pet.id}-${it.id}-${at}`, at: new Date(at), key: itemKey(pet.id, it.id), ...petNudge(pet, it) });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, PET_NOTIF_CAP);
}

/** Bildirim metni. Başlıkta hayvanın adı, gövdede ne yapılacağı. */
export const petNudge = (pet: Pet, it: PetItem) => ({
  title: `${petEmoji(pet)} ${pet.name}: ${it.name}`,
  body: 'Vakti geldi. Yaptıysan “Yaptım”a dokun, Moka not alsın ☕',
});
