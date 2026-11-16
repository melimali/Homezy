import { eachList, inDays } from './home';
import { uid } from './logic';
import { DEFAULT_ANSWERS, personaOf, PLAN, type Answers, type Persona, type RoutineSpec } from './persona';
import type { ActId } from './secimData';
import type { AppState, Task } from './types';

/**
 * Kişiye özel rutinler: "Seni tanıyalım" cevaplarının HER BİRİ tek bir tabloya (`RULES`) bağlanır.
 * Cevap → ekstra rutinler (oda, sıklık, dakika). Günlük iş sayısı personaya (`PERSONA_CAP`) ve cevaplara göre ayarlanır. Hepsi telefonda, yapay zekâsız; ev kurulunca (ya da cevap değişince) bir kez uygulanır.
 *
 * Sadelik kuralları (1.0.2): toplamda en çok `MAX` kişisel iş; günlük sıklıkta en çok `MAX_DAILY`;
 * ortak alan işleri tek oda modunda ve aile evinde yaşayan gençte eklenmez; yeni işler birkaç güne yayılır.
 */
export type Quiz = {
  who: Answers['who'];
  rhythm: Answers['rhythm'];
  cook: Answers['cook'];
  effort: Answers['effort'];
  style: Answers['style'];
  acts: ActId[];
  /** Disiplin sorusu cevapları (kisilik.ts `DISC_QUESTIONS`): plan, start, focus, quit, drive. */
  plan?: string;
  start?: string;
  focus?: string;
  quit?: string;
  drive?: string;
};

export type QKey = 'acts' | 'start' | 'plan' | 'quit' | 'drive' | 'cook' | 'rhythm' | 'style';
type Rule = { q: QKey; a: string; tasks: RoutineSpec[] };

const S = (name: string, every: number, min: number, room: RoutineSpec['room'], x: Partial<RoutineSpec> = {}): RoutineSpec => ({ name, every, min, room, ...x });

/** Cevap → ekstra rutinler. Sıra öncelik sırasıdır (üstteki önce eklenir). */
export const RULES: Rule[] = [
  // Evde neler yaparsın? (çoklu)
  { q: 'acts', a: 'pc', tasks: [S('Klavyeni ve fareni temizle', 14, 5, ['calisma', 'yatak', 'salon']), S('Ekranı ve masayı sil', 14, 5, ['calisma', 'yatak', 'salon'])] },
  { q: 'acts', a: 'shoes', tasks: [S('Paspası silkele, ayakkabı tabanlarını sil', 7, 5, ['antre'])] },
  { q: 'acts', a: 'cook', tasks: [S('Ocağı ve tezgahı yağdan arındır', 3, 10, ['mutfak'], { shared: true }), S('Baharat ve kiler düzeni', 30, 10, ['mutfak'], { shared: true })] },
  { q: 'acts', a: 'pet', tasks: [S('Kum / tuvalet alanını temizle', 1, 5, ['balkon', 'banyo', 'salon']), S('Mama ve su kabını yıka', 1, 5, ['mutfak', 'salon'])] },
  { q: 'acts', a: 'plants', tasks: [S('Bitkileri sula', 4, 5, ['salon', 'balkon'], { plant: true })] },
  { q: 'acts', a: 'study', tasks: [S('Çalışma masanı topla', 1, 3, ['calisma', 'yatak']), S('Yarının planını ve çantayı hazırla', 1, 5, ['antre', 'calisma', 'yatak'])] },
  { q: 'acts', a: 'sport', tasks: [S('Spor matını ve çantayı sil', 7, 5, ['salon', 'yatak']), S('Spor kıyafetlerini yıka', 4, 5, ['camasir', 'yatak'])] },
  { q: 'acts', a: 'tv', tasks: [S('Kumandaları ve ekranı sil', 14, 5, ['salon']), S('Koltuğu silkele, battaniyeyi katla', 3, 5, ['salon'])] },
  { q: 'acts', a: 'coffee', tasks: [S('Kahve makinesini ya da cezveyi yıka', 3, 5, ['mutfak'], { shared: true }), S('Çaydanlığın kirecini çöz', 30, 20, ['mutfak'], { shared: true })] },
  { q: 'acts', a: 'phone', tasks: [S('Telefon ekranını ve kılıfı sil', 7, 3, ['yatak', 'salon'])] },
  { q: 'acts', a: 'car', tasks: [S('Arabanın içindeki çöpleri topla', 14, 10, ['antre'], { care: true }), S('Lastik basıncı ve cam suyunu kontrol et', 30, 10, [], { care: true })] },
  { q: 'acts', a: 'smoke', tasks: [S('Kül tablasını boşalt ve yıka', 1, 3, ['balkon', 'salon']), S('Perde ve yastıkları havalandır', 7, 10, ['salon', 'yatak']), S('Pencere ve duvarları sil', 30, 30, ['salon'])] },
  { q: 'acts', a: 'wfh', tasks: [S('Çalışma masanı topla', 1, 3, ['calisma', 'salon', 'yatak']), S('Kablo ve şarj düzeni', 14, 10, ['calisma', 'salon', 'yatak'])] },
  { q: 'acts', a: 'guest', tasks: [S('Misafir havlusunu ve çarşafı hazır tut', 14, 10, ['banyo', 'salon'], { shared: true }), S('Salon ve antreyi toparla', 3, 10, ['salon', 'antre'], { shared: true })] },
  { q: 'acts', a: 'hobby', tasks: [S('Hobi malzemelerini topla', 7, 10, ['calisma', 'salon', 'yatak'])] },
  { q: 'acts', a: 'allergy', tasks: [S('Nemli bezle toz al', 3, 10, ['yatak', 'salon']), S('Yastık kılıfını ve çarşafı yıka', 7, 15, ['yatak'])] },

  // Bir işe nasıl başlarsın?
  { q: 'start', a: 'birazdan', tasks: [S('5 dakikalık ısınma: gözüne ilk çarpanı yerine koy', 1, 5, ['salon', 'yatak'])] },
  { q: 'start', a: 'isinma', tasks: [] },
  { q: 'start', a: 'hemen', tasks: [] },
  { q: 'start', a: 'birakamam', tasks: [] },

  // Planın nasıl olsun?
  { q: 'plan', a: 'detay', tasks: [S('Haftalık planı gözden geçir', 7, 10, ['calisma', 'salon', 'yatak'])] },
  { q: 'plan', a: 'kisa', tasks: [] },
  { q: 'plan', a: 'esnek', tasks: [] },

  // Bir alışkanlığı neden bırakırsın?
  { q: 'quit', a: 'unutur', tasks: [S('Yarın için tek bir işi gözüne görünür yere bırak', 1, 2, ['antre', 'salon', 'yatak'])] },
  { q: 'quit', a: 'yorulur', tasks: [] },
  { q: 'quit', a: 'sikilir', tasks: [S('Bir köşeyi yeniden düzenle', 14, 10, ['salon', 'yatak'])] },
  { q: 'quit', a: 'hepsi', tasks: [] },
  { q: 'quit', a: 'dikkat', tasks: [] },

  // Seni ne harekete geçirir?
  { q: 'drive', a: 'hedef', tasks: [S('Bu haftanın tek hedefini yaz', 7, 5, ['calisma', 'salon', 'yatak'])] },
  { q: 'drive', a: 'baski', tasks: [S('Yaklaşan son tarihleri ve faturaları kontrol et', 7, 5, [], { care: true })] },
  { q: 'drive', a: 'soz', tasks: [] },
  { q: 'drive', a: 'puan', tasks: [] },
  { q: 'drive', a: 'odul', tasks: [] },

  // Quizde sorulmayanlar (varsayılan cevapla nötr; Evim / profil ekranından gelirse çalışır).
  { q: 'cook', a: 'sever', tasks: [S('Haftalık menüyü planla', 7, 10, ['mutfak'])] },
  { q: 'rhythm', a: 'yogun', tasks: [S('Akşam 10 dakikalık toparlanma turu', 1, 10, ['salon', 'yatak'])] },
  { q: 'style', a: 'duzenli', tasks: [S('Dolap ve çekmece düzeni', 14, 15, ['yatak', 'salon'])] },
];

/** Kişilik tipine göre günlük iş sayısı üst sınırı (süre ayarı yok; sayı ve tür personadan gelir). */
export const PERSONA_CAP: Record<Persona, number> = { ogrenci: 4, genc: 3, tek: 5, cift: 6, anne: 6, sef: 5 };
/** Diğer cevapların günlük sayıya etkisi (+/-). */
export const CAP_DELTA: Record<string, number> = {
  'rhythm:yogun': -1, 'rhythm:evde': 1, 'plan:detay': 1, 'plan:esnek': -1, 'quit:yorulur': -1, 'start:birazdan': -1,
  'focus:10': -1, 'focus:45': 1, 'focus:90': 2,
};

export const MAX = 8;
export const MAX_DAILY = 3;
const CAP_MIN = 2;
const CAP_MAX = 10;

/** Kayıtlı cevaplardan (persona + disiplin + etkinlikler) tek cevap nesnesi. */
export function quizOf(a: Partial<Answers> | undefined, disc: Record<string, string | string[] | undefined> | undefined, acts: ActId[]): Quiz {
  const A = { ...DEFAULT_ANSWERS, ...a };
  const str = (k: string) => (typeof disc?.[k] === 'string' ? (disc[k] as string) : undefined);
  return { who: A.who, rhythm: A.rhythm, cook: A.cook, effort: A.effort, style: A.style, acts, plan: str('plan'), start: str('start'), focus: str('focus'), quit: str('quit'), drive: str('drive') };
}

const keysOf = (q: Quiz): [QKey, string][] => [
  ...q.acts.map((a): [QKey, string] => ['acts', a]),
  ...(['start', 'plan', 'quit', 'drive'] as const).filter(k => q[k]).map((k): [QKey, string] => [k, q[k]!]),
  ['cook', q.cook], ['rhythm', q.rhythm], ['style', q.style],
];

/** Günlük iş üst sınırı: persona tabanı + cevap farkları, 2-10 arası. */
export function limits(q: Quiz): { cap: number } {
  let cap = PERSONA_CAP[personaOf({ ...DEFAULT_ANSWERS, who: q.who, cook: q.cook, effort: q.effort })];
  for (const [k, a] of keysOf(q)) cap += CAP_DELTA[`${k}:${a}`] ?? 0;
  if (q.focus) cap += CAP_DELTA[`focus:${q.focus}`] ?? 0;
  return { cap: Math.max(CAP_MIN, Math.min(CAP_MAX, cap)) };
}

export type Pick = { tag: string; spec: RoutineSpec };

/** Bu cevaplara göre eklenecek işler (etiketli, tekilleştirilmiş, sınırlı). `solo`: tek oda modu. */
export function picks(q: Quiz, solo = false): Pick[] {
  const personal = q.who === 'aile' || solo;
  const out: Pick[] = [];
  const names = new Set<string>();
  let daily = 0;
  const push = (tag: string, spec: RoutineSpec) => {
    if (out.length >= MAX || names.has(spec.name) || (personal && spec.shared)) return;
    if (spec.every <= 1 && daily >= MAX_DAILY) return;
    if (spec.every <= 1) daily++;
    names.add(spec.name);
    out.push({ tag, spec });
  };
  const p = personaOf({ ...DEFAULT_ANSWERS, who: q.who, cook: q.cook, effort: q.effort });
  PLAN[p].tasks.forEach(t => push(`q:persona:${p}`, t));
  for (const [k, a] of keysOf(q)) RULES.filter(r => r.q === k && r.a === a).forEach(r => r.tasks.forEach(t => push(`q:${k}:${a}`, t)));
  return out;
}

const keyOf = (p: Pick) => `${p.tag}|${p.spec.name}`;
const isQuizTag = (t?: string | null) => !!t && t.startsWith('q:');

/** Bir işin hedef listesi (taslak üzerinde). */
function listOf(S: AppState, spec: RoutineSpec, solo: string | null): Task[] {
  const pick = (rid: string) => {
    if (spec.plant) return ((S.mod[rid] ||= {}).plants ||= []);
    return (S.tasks[rid] ||= []);
  };
  if (spec.care) return S.care;
  if (solo) return pick(solo);
  for (const type of spec.room) {
    const rid = S.order.find(r => S.rooms[r].type === type);
    if (rid) return pick(rid);
  }
  return S.order.length ? pick(S.order[0]) : S.care;
}

/** Cevapların imzası: değişmedikçe yeniden uygulanmaz (oda türleri de imzada). */
export const sigOf = (S: AppState, q: Quiz) => JSON.stringify([q, S.order.map(r => S.rooms[r]?.type), S.settings.solo ?? null]);

/**
 * Cevaplara göre işleri ekler, cevabı geri alınan işleri kaldırır, günlük sınırı ayarlar (taslak üzerinde).
 * Kullanıcı bir işi silerse bir daha eklenmez (`quizAdded`). Aynı adlı iş (kurulum sorusu dahil) varsa eklenmez.
 * Dönen: eklenen iş sayısı.
 */
export function applyQuiz(S: AppState, q: Quiz, now = Date.now()): number {
  const solo = S.settings.solo && S.rooms[S.settings.solo] ? S.settings.solo : null;
  const want = picks(q, !!solo);
  const wantKeys = new Set(want.map(keyOf));
  const added = new Set(S.settings.quizAdded ?? []);
  // Artık istenmeyenleri kaldır.
  eachList(S, arr => {
    for (let i = arr.length - 1; i >= 0; i--) {
      const t = arr[i];
      if (isQuizTag(t.tag) && !wantKeys.has(`${t.tag}|${t.name}`)) {
        added.delete(`${t.tag}|${t.name}`);
        arr.splice(i, 1);
      }
    }
  });
  const have = new Set<string>();
  eachList(S, arr => arr.forEach(t => have.add(t.name)));
  let n = 0;
  for (const p of want) {
    const k = keyOf(p);
    if (added.has(k) || have.has(p.spec.name)) continue;
    const { name, every, min } = p.spec;
    const snooze = every <= 1 ? null : inDays(Math.min(Math.ceil(every / 2), 2 + n), now);
    listOf(S, p.spec, solo).push({ id: uid(), name, every, min, last: null, tag: p.tag, snooze });
    added.add(k);
    have.add(name);
    n++;
  }
  S.settings.quizAdded = [...added];
  S.settings.quizCap = limits(q).cap;
  S.settings.quizSig = sigOf(S, q);
  return n;
}
