import { CARE, DAY, DONATE_AFTER, EXPIRY_WARN, LAUNDRY_THRESHOLD, PHOTO_MAX_AGE, ROOM_EMOJI, STOCK_DEF, TYPES, WASH, WASH_TYPES } from './constants';
import { baseCare, billStatus, dayDiff, emptyProfile, GUEST_ROOMS, seasonalNow, taskMin, warrantyStatus } from './home';
import { defaultSettings, emptyPlay } from './play';
import { laundryLine, photoLine, statusTail, stockLine, stockTitle, taskLine } from './messages';
import type { AppState, Cloth, Notice, RoomType, StockItem, Task, TaskRef, TaskStatus, WashType } from './types';

export const uid = () => Math.random().toString(36).slice(2, 9);

/** Günün başlangıcı (yerel saat). */
export const sod = (ts: number) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
export const daysSince = (ts: number, now = Date.now()) => Math.round((sod(now) - sod(ts)) / DAY);
export const ago = (days: number, now = Date.now()) => now - days * DAY;

export const fmtShort = (ts: number) => new Date(ts).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
export const fmtLong = (ts: number) =>
  new Date(ts).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

export { greet, greeting } from './greeting';

/** Esnek zamanlamada zamanı geçen işin gecikmiş sayılmadan bekleyebileceği gün: sıklığın yarısı. */
export const tolerance = (every: number) => Math.floor(every / 2);

/**
 * İşin durumu. Ertelenen ya da atlanan işte vade `snooze` günüdür. `flex` açıksa zamanı geçen iş,
 * sıklığının yarısı kadar gün daha "bugün" sayılır, sonra gecikir.
 */
export function status(t: Task, now = Date.now(), flex = false): TaskStatus {
  if (t.last == null && t.snooze == null) return { k: 'today', diff: 0, label: 'Başlanmadı' };
  const diff = t.snooze != null ? dayDiff(now, t.snooze) : t.every - daysSince(t.last!, now);
  const snoozed = t.snooze != null && diff > 0;
  if (diff < 0) {
    if (flex && -diff <= tolerance(t.every)) return { k: 'today', diff, label: `${-diff} gün geçti` };
    return { k: 'late', diff, label: `${-diff} gün gecikti` };
  }
  if (diff === 0) return { k: 'today', diff, label: 'Bugün' };
  if (diff === 1) return { k: 'ok', diff, label: snoozed ? 'Yarına ertelendi' : 'Yarın' };
  return { k: 'ok', diff, label: snoozed ? `${diff} gün sonra` : `${diff} gün kaldı` };
}

/**
 * Ayarlar ve etkin moda göre durum: tatilde rutinler donar, yoğun/hasta modunda sadece
 * her gün yapılan işler görünür. Ekranlar ve bildirimler bunu kullanır.
 */
export function statusIn(S: AppState, t: Task, now = Date.now()): TaskStatus {
  const mode = S.mode?.k;
  if (mode === 'tatil') {
    const s = status(t, S.mode!.since, S.settings.flex);
    return { k: 'ok', diff: Math.max(s.diff, 1), label: '🏖️ Sığınak kilitli, dondu' };
  }
  const s = status(t, now, S.settings.flex);
  if (mode === 'yogun' && t.every > 1 && s.k !== 'ok') return { k: 'ok', diff: Math.max(s.diff, 1), label: '🤒 Revirdesin, sonraya kaldı' };
  return s;
}

/** İş bugün tamamlandı mı. */
export const doneToday = (t: Task, now = Date.now()) => t.last != null && daysSince(t.last, now) === 0;

export function agoText(ts: number | null | undefined, now = Date.now()) {
  if (ts == null) return 'henüz yok';
  const n = daysSince(ts, now);
  return n <= 0 ? 'bugün' : n === 1 ? 'dün' : `${n} gün önce`;
}

export const everyText = (every: number) => (every === 1 ? 'her gün' : `${every} günde bir`);

export function allTasks(S: AppState, now = Date.now()): TaskRef[] {
  const out: TaskRef[] = [];
  for (const rid of S.order) {
    (S.tasks[rid] || []).forEach(t => out.push({ t, rid, list: 'tasks', s: statusIn(S, t, now) }));
    (S.mod[rid]?.plants || []).forEach(t => out.push({ t, rid, list: 'plants', s: statusIn(S, t, now) }));
  }
  (S.care || []).forEach(t => out.push({ t, rid: CARE, list: 'care', s: statusIn(S, t, now) }));
  return out;
}

/** Görünen ad ve emoji: oda ya da "Ev bakımı". */
export function placeOf(S: AppState, rid: string) {
  const r = S.rooms[rid];
  return r ? { name: r.name, emoji: ROOM_EMOJI[r.type], type: r.type as RoomType | null } : { name: 'Sığınak bakımı', emoji: '🔧', type: null };
}

/* ---------- canlı ev haritası: temizlik yüzdesi ---------- */

/**
 * Bir işin tazeliği (0-1): yapıldıktan sonra sıklığın yarısı kadar gün tam temiz, sonra azalır,
 * sıklığın iki katında sıfıra iner. Hiç yapılmamış iş yarım sayılır.
 */
export function freshness(t: Task, now = Date.now()) {
  if (t.last == null) return 0.5;
  const e = daysSince(t.last, now);
  return Math.min(1, Math.max(0, 1 - Math.max(0, e - t.every / 2) / (t.every * 1.5)));
}

/** Odanın temizlik yüzdesi (0-100). Tatilde, tatile çıkılan andaki hali. Rutini yoksa 100. */
export function roomClean(S: AppState, rid: string, now = Date.now()) {
  const at = S.mode?.k === 'tatil' ? S.mode.since : now;
  const ts = S.tasks[rid] || [];
  if (!ts.length) return 100;
  return Math.round((100 * ts.reduce((a, t) => a + freshness(t, at), 0)) / ts.length);
}

/** Ev puanı: odaların temizlik yüzdelerinin, odaların büyüklüğüyle ağırlıklı ortalaması. */
export function homeScore(S: AppState, now = Date.now()) {
  let sum = 0, w = 0;
  for (const rid of S.order) {
    const n = Math.max(1, cellCount(S, rid));
    sum += roomClean(S, rid, now) * n;
    w += n;
  }
  return w ? Math.round(sum / w) : 100;
}

export function cleanWord(p: number) {
  if (p >= 100) return 'Tam tahkimat 🛡️';
  if (p >= 80) return 'Güvenli';
  if (p >= 55) return 'Çatlaklar var';
  if (p >= 30) return 'Barikat zayıflıyor';
  return 'Sızıntı riski!';
}

/* ---------- "ne kadar vaktin var?" ---------- */

/**
 * `minutes` dakikaya sığan en acil işler: önce gecikenler, sonra bugünküler, sonra yarınkiler.
 * Misafir modunda misafirin göreceği odalar öne geçer. Bugün yapılmış işler alınmaz.
 */
export function quickPick(S: AppState, minutes: number, now = Date.now()): (TaskRef & { min: number })[] {
  if (S.mode?.k === 'tatil') return [];
  const guest = S.mode?.k === 'misafir';
  const cand = allTasks(S, now)
    .filter(x => !doneToday(x.t, now) && (x.s.k !== 'ok' || x.s.diff <= 1))
    .map(x => ({ ...x, min: taskMin(x.t) }))
    .sort((a, b) => {
      if (guest) {
        const ga = isGuestRoom(S, a.rid) ? 0 : 1, gb = isGuestRoom(S, b.rid) ? 0 : 1;
        if (ga !== gb) return ga - gb;
      }
      return a.s.diff - b.s.diff || a.min - b.min;
    });
  const out: typeof cand = [];
  let left = minutes;
  for (const x of cand) {
    if (x.min > left) continue;
    out.push(x);
    left -= x.min;
  }
  return out;
}

export const isGuestRoom = (S: AppState, rid: string) => !!S.rooms[rid] && GUEST_ROOMS.includes(S.rooms[rid].type);

/* ---------- gardırop ---------- */

/** Kirli kıyafetler yıkama türüne göre; `full` bir makine dolusu birikti mi. */
export function laundryPlan(list: Cloth[]) {
  return WASH_TYPES.map(w => {
    const items = list.filter(c => c.state === 'kirli' && (c.wash ?? 'renkli') === w);
    return { w, items, full: items.length >= LAUNDRY_THRESHOLD };
  }).filter(g => g.items.length);
}

/** Bir yıldır giyilmeyen kıyafetler (bağış önerisi). */
export const donateList = (list: Cloth[], now = Date.now()) =>
  list.filter(c => daysSince(c.worn ?? c.added ?? now, now) >= DONATE_AFTER);

/* ---------- buzdolabı ---------- */

export function expiryText(exp: number, now = Date.now()) {
  const d = dayDiff(now, exp);
  if (d < 0) return { k: 'late' as const, d, label: `SKT ${-d} gün geçti` };
  if (d === 0) return { k: 'late' as const, d, label: 'SKT bugün' };
  if (d <= EXPIRY_WARN) return { k: 'today' as const, d, label: d === 1 ? 'SKT yarın' : `SKT ${d} gün kaldı` };
  return { k: 'ok' as const, d, label: `SKT ${fmtShort(exp)}` };
}

/* ---------- haftalık özet ---------- */

/** Son 7 günün özeti: yapılan iş sayısı, aktif gün, ev puanı ve en temiz oda. */
export function weekSummary(S: AppState, now = Date.now()) {
  let done = 0, days = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now - i * DAY);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const n = S.play.log[k]?.length ?? 0;
    done += n;
    if (S.play.days.includes(k)) days++;
  }
  let best: string | null = null, top = -1;
  for (const rid of S.order) {
    const p = roomClean(S, rid, now);
    if ((S.tasks[rid] || []).length && p > top) [best, top] = [S.rooms[rid].name, p];
  }
  return { done, days, score: homeScore(S, now), best };
}

const washLabel = (w: WashType) => `${WASH[w].emoji} ${WASH[w].label}`;

export function roomCounts(S: AppState, rid: string, now = Date.now()) {
  const all = allTasks(S, now).filter(x => x.rid === rid);
  return {
    late: all.filter(x => x.s.k === 'late').length,
    today: all.filter(x => x.s.k === 'today').length,
    all,
  };
}

export const cellCount = (S: AppState, id: string) => S.cells.filter(x => x === id).length;

export const sortByDue = (arr: Task[], now = Date.now()) =>
  arr
    .map(t => ({ t, s: status(t, now, true) }))
    .sort((a, b) => a.s.diff - b.s.diff)
    .map(x => x.t);

export function shopItems(S: AppState) {
  const out: { x: StockItem; rid: string }[] = [];
  for (const rid of S.order) (S.mod[rid]?.stock || []).forEach(x => x.lvl !== 'var' && out.push({ x, rid }));
  return out;
}

export const shopLine = (x: StockItem) => x.name + (x.lvl === 'az' ? ' (azaldı)' : '');

/**
 * Prototipteki `notifs()` kuralları, tatlı emojili metinlerle (`messages.ts`).
 * `now` ile ileri bir günün bildirimleri de hesaplanabilir.
 */
export function notifs(S: AppState, now = Date.now()): Notice[] {
  const ns: Notice[] = [];
  const set = S.settings;
  if (set.routine) {
    allTasks(S, now)
      .filter(x => x.s.k !== 'ok')
      .sort((a, b) => a.s.diff - b.s.diff)
      .forEach(({ t, rid, list, s }) => {
        const p = placeOf(S, rid);
        const plant = list === 'plants';
        const care = list === 'care';
        // Ev bakımı işleri "Faturalar ve bakım" ayarına bağlı.
        if (care && !set.bills) return;
        ns.push({
          k: s.k,
          rid,
          tid: t.id,
          list,
          url: care ? '/bakim' : undefined,
          title: `${plant ? '🪴' : p.emoji} ${p.name} · ${t.name}`,
          text: `${taskLine({ name: t.name, type: p.type, plant, k: s.k, key: t.id, now })} ${statusTail(s.k, s.diff, t.last == null)}`,
        });
      });
  }
  if (set.bills) {
    for (const b of S.bills || []) {
      const st = billStatus(b, now);
      if (st.paid || st.k === 'ok') continue;
      ns.push({ k: st.k, rid: CARE, url: '/bakim', title: `🧾 ${b.name} faturası`, text: st.k === 'late' ? `Son ödeme günü ${-st.diff} gün önceydi. Ödediysen işaretle ✓` : st.diff === 0 ? 'Son ödeme günü bugün 📅' : `Son ödeme gününe ${st.diff} gün kaldı 📅` });
    }
    for (const w of S.warranties || []) {
      const st = warrantyStatus(w, now);
      if (st.k !== 'today') continue;
      ns.push({ k: 'today', rid: CARE, url: '/bakim', title: `🛡️ ${w.name} garantisi`, text: st.days === 0 ? 'Garanti bugün bitiyor. Bir sorun varsa servise bugün başvur 🔧' : `Garantinin bitmesine ${st.days} gün kaldı. Bir sorunu varsa şimdi servise götür 🔧` });
    }
    const d = new Date(now).getDate();
    // Mevsimlik işler ayın 1'inde ve 15'inde hatırlatılır, her gün değil.
    if (d === 1 || d === 15)
      for (const x of seasonalNow(S, now))
        ns.push({ k: 'ok', rid: CARE, url: '/bakim', title: `${x.emoji} Mevsimlik görev`, text: `${x.name} zamanı geldi. Bu ay bir gün ayıralım mı? 📆` });
  }
  if (S.mode?.k === 'bayram') {
    const left = (S.mode.list || []).filter(x => !x.done).length;
    if (left) ns.push({ k: 'today', rid: CARE, url: '/bugun', title: '✨ Büyük tahkimat', text: `${left} görev kaldı. Bugün birkaç barikatı daha sağlamlaştıralım mı? 💪` });
  }
  for (const rid of S.order) {
    const m = S.mod[rid] || {};
    const room = S.rooms[rid].name;
    const fridge = TYPES[S.rooms[rid].type].mod === 'buzdolabi';
    if (set.stock && m.stock) {
      const out = m.stock.filter(x => x.lvl === 'yok');
      if (out.length) ns.push({ k: 'today', rid, title: stockTitle(room, out.length, fridge), text: stockLine(out, fridge, rid, now) });
    }
    if (set.stock && fridge && (!m.photoAt || daysSince(m.photoAt, now) > PHOTO_MAX_AGE))
      ns.push({
        k: 'ok',
        rid,
        title: `📸 ${room} · Erzak & ambar taraması`,
        text: photoLine(m.photoAt ? daysSince(m.photoAt, now) : null, rid, now),
      });
    if (set.expiry && fridge && m.stock) {
      const soon = m.stock.filter(x => x.exp != null && x.lvl !== 'yok' && dayDiff(now, x.exp) <= EXPIRY_WARN);
      if (soon.length) {
        const gone = soon.filter(x => dayDiff(now, x.exp!) < 0);
        ns.push({
          k: gone.length ? 'late' : 'today',
          rid,
          title: `⏳ ${room} · Son kullanma tarihi`,
          text: `${soon.slice(0, 3).map(x => `${x.name} (${expiryText(x.exp!, now).label})`).join(', ')}${soon.length > 3 ? ` ve ${soon.length - 3} ürün daha` : ''}. ${gone.length ? 'Tarihi geçenlere bir göz at 👀' : 'Önce bunları tüketelim 🍽️'}`,
        });
      }
    }
    if (set.laundry && m.wardrobe) {
      for (const g of laundryPlan(m.wardrobe).filter(g => g.full))
        ns.push({ k: 'today', rid, title: `🧺 ${room} · ${washLabel(g.w)}: ${g.items.length} parça`, text: `${laundryLine(g.items.length, rid + g.w, now)} (${WASH[g.w].hint})` });
      const d = new Date(now).getDate();
      if (d === 1) {
        const old = donateList(m.wardrobe, now);
        if (old.length)
          ns.push({ k: 'ok', rid, title: `💝 ${room} · Teçhizat bağışı`, text: `${old.length} parça bir yıldır keşfe çıkmadı. Başka bir hayatta kalana verelim mi?` });
      }
      if (d === 1 || d === 15)
        for (const x of seasonalNow(S, now).filter(x => x.wardrobe))
          ns.push({ k: 'ok', rid, title: `${x.emoji} ${room} · Mevsim değişimi`, text: `${x.name} zamanı geldi 🔄` });
    }
  }
  const order = { late: 0, today: 1, ok: 2 };
  return ns.sort((a, b) => order[a.k] - order[b.k]);
}

/** Odanın plandaki kapladığı dikdörtgen. Odanın bloğu yoksa null. */
export function roomBounds(S: AppState, id: string) {
  let minr = Infinity, minc = Infinity, maxr = -1, maxc = -1;
  S.cells.forEach((x, i) => {
    if (x !== id) return;
    const r = Math.floor(i / S.cols), c = i % S.cols;
    minr = Math.min(minr, r); maxr = Math.max(maxr, r);
    minc = Math.min(minc, c); maxc = Math.max(maxc, c);
  });
  return maxr < 0 ? null : { minr, minc, maxr, maxc };
}

/* ---------- state mutations (state üzerinde yerinde çalışır) ---------- */

export function makeRoom(S: AppState, type: RoomType) {
  const id = uid();
  const n = S.order.filter(r => S.rooms[r].type === type).length;
  S.rooms[id] = { id, type, name: TYPES[type].label + (n ? ' ' + (n + 1) : '') };
  S.order.push(id);
  S.tasks[id] = TYPES[type].tasks.map(([name, every, min]) => ({ id: uid(), name, every, min, last: null }));
  const m = TYPES[type].mod;
  const stock = (names: string[] = []) => names.map(name => ({ id: uid(), name, lvl: 'var' as const }));
  if (m === 'gardirop') S.mod[id] = { wardrobe: [], filter: 'all' };
  else if (m === 'buzdolabi') S.mod[id] = { photo: null, photoAt: null, stock: stock(STOCK_DEF.mutfak) };
  else if (m === 'stok') S.mod[id] = { stock: stock(STOCK_DEF[type]) };
  else if (m === 'bitki') S.mod[id] = { plants: [] };
  else S.mod[id] = {};
  return id;
}

export function removeRoom(S: AppState, id: string) {
  S.cells = S.cells.map(x => (x === id ? null : x));
  delete S.rooms[id];
  delete S.tasks[id];
  delete S.mod[id];
  S.order = S.order.filter(x => x !== id);
}

export function emptyState(): AppState {
  return {
    v: 1,
    setup: false,
    cols: 6,
    rows: 8,
    cells: Array(48).fill(null),
    rooms: {},
    order: [],
    tasks: {},
    mod: {},
    settings: defaultSettings(),
    play: emptyPlay(),
    homeId: 'ev1',
    homeName: 'Evim',
    others: [],
    home: emptyProfile(),
    mode: null,
    care: baseCare(),
    bills: [],
    warranties: [],
    seasonal: {},
  };
}

/** İlk açılışta gelen örnek ev (prototipteki `seed()`). */
export function seed(now = Date.now()): AppState {
  const S = emptyState();
  const map = {
    Y: makeRoom(S, 'yatak'),
    M: makeRoom(S, 'mutfak'),
    B: makeRoom(S, 'banyo'),
    A: makeRoom(S, 'antre'),
    S: makeRoom(S, 'salon'),
    L: makeRoom(S, 'balkon'),
  };
  S.rooms[map.Y].name = 'Yatak odam';
  const layout = 'YYYMMM' + 'YYYMMM' + 'YYYABB' + 'AAAABB' + 'SSSSSL' + 'SSSSSL' + 'SSSSSL' + '......';
  S.cells = [...layout].map(ch => (map as Record<string, string>)[ch] || null);
  const agos: Record<keyof typeof map, number[]> = {
    Y: [5, 9, 7, 0, 12], M: [1, 0, 3, 26, 40, 4], B: [2, 5, 9, 4, 3], A: [3, 8], S: [3, 7, 6, 31], L: [10, 12],
  };
  for (const k of Object.keys(map) as (keyof typeof map)[])
    S.tasks[map[k]].forEach((t, i) => (t.last = ago(agos[k][i], now)));
  S.care.forEach((t, i) => (t.last = ago([12, 20, 25][i] ?? 10, now)));
  const w = (name: string, cat: string, state: 'temiz' | 'kirli' | 'utu', wash: WashType) =>
    ({ id: uid(), name, cat, state, wash, added: now, worn: state === 'kirli' ? now : null });
  S.mod[map.Y].wardrobe = [
    w('Beyaz gömlek', 'Üst', 'temiz', 'beyaz'), w('Kot pantolon', 'Alt', 'temiz', 'koyu'), w('Siyah kazak', 'Üst', 'kirli', 'koyu'),
    w('Spor tişört', 'Üst', 'kirli', 'renkli'), w('Lacivert takım', 'Elbise / Takım', 'utu', 'hassas'), w('Kaban', 'Dış giyim', 'temiz', 'hassas'),
    w('Pijama takımı', 'Ev / Pijama', 'kirli', 'renkli'), w('Keten gömlek', 'Üst', 'utu', 'beyaz'), w('Lacivert tişört', 'Üst', 'kirli', 'koyu'), w('Siyah çorap', 'İç giyim', 'kirli', 'koyu'),
  ];
  const st = (name: string, lvl: 'var' | 'az' | 'yok') => ({ id: uid(), name, lvl });
  S.mod[map.M].stock = [
    { ...st('Süt', 'az'), exp: sod(now) + 2 * DAY }, st('Yumurta', 'var'), st('Beyaz peynir', 'var'), st('Domates', 'yok'),
    st('Yoğurt', 'var'), st('Tereyağı', 'az'), st('Biber', 'yok'), st('Ekmek', 'var'),
  ];
  S.mod[map.B].stock = [st('Tuvalet kağıdı', 'az'), st('Şampuan', 'var'), st('Diş macunu', 'var'), st('Sıvı sabun', 'yok')];
  const p = (name: string, every: number, d: number) => ({ id: uid(), name, every, last: ago(d, now) });
  S.mod[map.S].plants = [p('Monstera', 7, 6), p('Paşa kılıcı', 14, 3)];
  S.mod[map.L].plants = [p('Fesleğen', 2, 2), p('Sardunya', 3, 1)];
  return S;
}
