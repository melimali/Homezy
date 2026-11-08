// Moka sohbet araçlarının TEK kaydı (sunucu tarafı). Yeni özellik eklemek için buraya bir satır ekle,
// sonra uygulamadaki src/domain/chatTools.ts içine aynı adla bir uygulayıcı yaz (test iki kaydın adlarını karşılaştırır).
// Şemalar küçük bir alan tanımından üretilir ve aynı tanımla doğrulanır; model asla doğrudan veriye dokunmaz.

export type Ctx = {
  today: string;
  rooms: { id: string; name: string }[];
  tasks: { id: string; name: string; room: string; status: string }[];
  level: number;
  streak: number;
  late: number;
  due: number;
  shop: string[];
  meds: { id: string; name: string }[];
  pets: { id: string; name: string; items: { id: string; name: string }[] }[];
  water: { n: number; goal: number };
};

type Field =
  | { t: 's'; max: number; opt?: boolean; d?: string }
  | { t: 'i'; min: number; max: number; opt?: boolean; d?: string }
  | { t: 'e'; vals: string[]; opt?: boolean; d?: string }
  | { t: 'day'; d?: string }
  | { t: 'time'; opt?: boolean; d?: string }
  | { t: 'ref'; of: 'room' | 'task' | 'pet' | 'med'; d?: string }
  | { t: 'petitem'; d?: string }
  | { t: 'list'; max: number; len: number; d?: string };

type Tool = { name: string; d: string; f: Record<string, Field>; destructive?: boolean };

export const FOCUS_KINDS = ['ders', 'calisma', 'spor', 'temizlik'];
export const FEELS = ['enerjik', 'iyi', 'yorgun', 'bunalmis', 'keyifsiz'];
export const MOODS = ['😊', '😌', '😐', '😔', '😫', '🥰'];
/** Açılabilecek ekranlar (uygulamadaki karşılığı src/domain/chatTools.ts `SCREENS`). */
export const SCREENS = ['bugun', 'odalar', 'gelisim', 'ilac', 'gunluk', 'spor', 'evcil', 'yemek', 'bahce', 'magaza', 'bakim', 'odak', 'ruhhali', 'hafta', 'plan', 'aliskanlik'];
export const SPORT_TYPES = ['Yürüyüş', 'Koşu', 'Yoga', 'Bisiklet', 'Yüzme', 'Ağırlık', 'Pilates', 'Diğer'];

const day = { t: 'day', d: 'YYYY-MM-DD; "yarın" gibi ifadeleri bugünün tarihinden sen hesapla' } as const;

export const TOOLS: Tool[] = [
  { name: 'add_task', d: 'Bir odaya tekrarlayan iş (rutin) ekler.', f: {
    room_id: { t: 'ref', of: 'room' }, name: { t: 's', max: 60 }, every_days: { t: 'i', min: 1, max: 365, d: 'Kaç günde bir' } } },
  { name: 'complete_task', d: 'Listedeki işi bugün tamamlandı yapar. Sadece kullanıcı yaptığını söylediyse.', f: { task_id: { t: 'ref', of: 'task' } } },
  { name: 'snooze_task', d: 'Listedeki işi yarına erteler.', f: { task_id: { t: 'ref', of: 'task' } } },
  { name: 'remove_task', d: 'Listedeki bir işi tamamen siler (kullanıcıya onay sorulur).', destructive: true, f: { task_id: { t: 'ref', of: 'task' } } },
  { name: 'add_note', d: 'Takvime not ya da hatırlatma yazar.', f: { day, text: { t: 's', max: 140 }, time: { t: 'time', opt: true, d: 'Saat varsa HH:MM' } } },
  { name: 'start_focus', d: 'Odak (Pomodoro) ekranını açar.', f: { minutes: { t: 'i', min: 10, max: 90 }, kind: { t: 'e', vals: FOCUS_KINDS } } },
  { name: 'shop_add', d: 'Alışveriş listesine ürün ekler.', f: { items: { t: 'list', max: 10, len: 40, d: 'Ürün adları' } } },
  { name: 'shop_check', d: 'Alışveriş listesindeki ürünleri "alındı" yapar (listeden düşer).', f: { items: { t: 'list', max: 10, len: 40 } } },
  { name: 'shop_remove', d: 'Ürünleri alışveriş listesinden tamamen siler (onay sorulur).', destructive: true, f: { items: { t: 'list', max: 10, len: 40 } } },
  { name: 'journal_add', d: 'Bugünün günlüğüne yazı ekler.', f: { text: { t: 's', max: 400 }, mood: { t: 'e', vals: MOODS, opt: true } } },
  { name: 'med_add', d: 'İlaç ya da takviye hatırlatması ekler. Doz önermez.', f: {
    name: { t: 's', max: 40 }, dose: { t: 's', max: 30, opt: true }, times: { t: 'list', max: 4, len: 5, d: 'HH:MM saatleri' }, kind: { t: 'e', vals: ['ilac', 'takviye'], opt: true } } },
  { name: 'med_log', d: 'Listedeki ilacın bugünkü dozunu alındı ya da atlandı işaretler.', f: {
    med_id: { t: 'ref', of: 'med' }, status: { t: 'e', vals: ['taken', 'skipped'] }, time: { t: 'time', opt: true } } },
  { name: 'water_log', d: 'Bugünkü su bardağı sayısını artırır.', f: { glasses: { t: 'i', min: 1, max: 10 } } },
  { name: 'sport_log', d: 'Spor kaydı ekler.', f: { sport: { t: 'e', vals: SPORT_TYPES }, minutes: { t: 'i', min: 5, max: 300 } } },
  { name: 'pet_care', d: 'Evcil hayvan bakımını şimdi yapıldı işaretler (mama, yıkama…).', f: { pet_id: { t: 'ref', of: 'pet' }, item_id: { t: 'petitem' } } },
  { name: 'mood_checkin', d: 'Kullanıcının bugünkü ruh halini kaydeder.', f: { feel: { t: 'e', vals: FEELS } } },
  { name: 'open_screen', d: 'Uygulamada bir ekranı açar.', f: { screen: { t: 'e', vals: SCREENS } } },
];

const str = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const validDay = (d: string) => DAY_RE.test(d) && new Date(`${d}T12:00:00Z`).toISOString().startsWith(d);

/** Araç tanımlarından Claude `tools` şeması üretir (kısa tutulur: önbelleksiz girdi token'ı maliyeti). */
export function toolSchemas() {
  return TOOLS.map(t => ({
    name: t.name,
    description: t.d,
    input_schema: {
      type: 'object',
      properties: Object.fromEntries(Object.entries(t.f).map(([k, f]) => [k, schemaOf(f)])),
      required: Object.entries(t.f).filter(([, f]) => !('opt' in f && f.opt)).map(([k]) => k),
    },
  }));
}

function schemaOf(f: Field): Record<string, unknown> {
  const d = f.d ? { description: f.d } : {};
  switch (f.t) {
    case 'i': return { type: 'integer', minimum: f.min, maximum: f.max, ...d };
    case 'e': return { type: 'string', enum: f.vals, ...d };
    case 'list': return { type: 'array', items: { type: 'string' }, maxItems: f.max, ...d };
    default: return { type: 'string', ...d };
  }
}

export type Action = { type: string; confirm?: true } & Record<string, unknown>;

/** Modelin araç çağrısını doğrular; geçersizse null. Bilinmeyen alanlar atılır. */
export function validate(name: string, input: unknown, ctx: Ctx): Action | null {
  const tool = TOOLS.find(t => t.name === name);
  if (!tool) return null;
  const inp = (input ?? {}) as Record<string, unknown>;
  const out: Action = { type: name };
  for (const [k, f] of Object.entries(tool.f)) {
    const v = inp[k];
    const opt = 'opt' in f && f.opt;
    if (v == null || v === '') {
      if (opt) continue;
      return null;
    }
    switch (f.t) {
      case 's': { const s = str(v, f.max); if (!s) return null; out[k] = s; break; }
      case 'i': { const n = Number(v); if (!Number.isInteger(n) || n < f.min || n > f.max) return null; out[k] = n; break; }
      case 'e': { const s = str(v, 12); if (!f.vals.includes(s)) return null; out[k] = s; break; }
      case 'time': { const s = str(v, 5); if (!TIME_RE.test(s)) return null; out[k] = s; break; }
      case 'day': {
        const s = str(v, 10);
        // Takvim notu bugünden bir yıl öncesine ya da iki yıl sonrasına gitmesin.
        const t = Date.parse(`${s}T12:00:00Z`), now = Date.parse(`${ctx.today}T12:00:00Z`);
        if (!validDay(s) || t < now - 366 * 86400_000 || t > now + 731 * 86400_000) return null;
        out[k] = s;
        break;
      }
      case 'ref': {
        const s = str(v, 40);
        const ids = f.of === 'room' ? ctx.rooms : f.of === 'task' ? ctx.tasks : f.of === 'pet' ? ctx.pets : ctx.meds;
        if (!ids.some(x => x.id === s)) return null;
        out[k] = s;
        break;
      }
      case 'petitem': {
        const s = str(v, 40);
        const pet = ctx.pets.find(p => p.id === out.pet_id);
        if (!pet?.items.some(i => i.id === s)) return null;
        out[k] = s;
        break;
      }
      case 'list': {
        if (!Array.isArray(v)) return null;
        const list = [...new Set(v.map(x => str(x, f.len)).filter(Boolean))].slice(0, f.max);
        if (!list.length) return null;
        // Saat listesi gibi biçimli listeler: ilaç saatleri HH:MM olmalı.
        if (name === 'med_add' && list.some(x => !TIME_RE.test(x))) return null;
        out[k] = list;
        break;
      }
    }
  }
  if (tool.destructive) out.confirm = true;
  return out;
}

/** Araç gerektiren mesajları ayıran kaba süzgeç; sıradan sohbette araç şeması hiç gönderilmez. */
export const ACTION_RE = /(ekle|eklesene|yaptım|yaptim|tamamla|bitti|bitirdim|ertele|yarına|yarina|\bnot\b|hatırlat|hatirlat|takvim|odak|pomodoro|başlat|baslat|\bsil|çıkar|cikar|kaldır|kaldir|liste|alışveriş|alisveris|market|aldım|aldim|günlük|gunluk|yaz\b|ilaç|ilac|vitamin|takviye|içtim|ictim|bardak|su\b|spor|yürüdüm|yurudum|koştum|kostum|mama|verdim|yıkadım|hissed|moral|modum|\baç\b|\bac\b|git\b|göster|goster|neler|durum|add|done|finished|complete|snooze|postpone|remind|note|calendar|focus|start|delete|remove|shopping|list\b|bought|journal|diary|medic|pill|water|glass|workout|walked|ran\b|fed\b|feel|mood|open|show|every|her \d|günde bir|gunde bir)/i;
