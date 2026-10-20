import { DAY, LAUNDRY_THRESHOLD, PHOTO_MAX_AGE, STOCK_DEF, TYPES } from './constants';
import type { AppState, Notice, RoomType, StockItem, Task, TaskRef, TaskStatus } from './types';

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

export function greet(now = new Date()) {
  const h = now.getHours();
  if (h >= 5 && h < 12) return 'Günaydın';
  if (h >= 12 && h < 18) return 'İyi günler';
  if (h >= 18 && h < 23) return 'İyi akşamlar';
  return 'İyi geceler';
}

export function status(t: Task, now = Date.now()): TaskStatus {
  if (t.last == null) return { k: 'today', diff: 0, label: 'Başlanmadı' };
  const diff = t.every - daysSince(t.last, now);
  if (diff < 0) return { k: 'late', diff, label: `${-diff} gün gecikti` };
  if (diff === 0) return { k: 'today', diff, label: 'Bugün' };
  if (diff === 1) return { k: 'ok', diff, label: 'Yarın' };
  return { k: 'ok', diff, label: `${diff} gün kaldı` };
}

export function agoText(ts: number | null | undefined, now = Date.now()) {
  if (ts == null) return 'henüz yok';
  const n = daysSince(ts, now);
  return n <= 0 ? 'bugün' : n === 1 ? 'dün' : `${n} gün önce`;
}

export const everyText = (every: number) => (every === 1 ? 'her gün' : `${every} günde bir`);

export function allTasks(S: AppState, now = Date.now()): TaskRef[] {
  const out: TaskRef[] = [];
  for (const rid of S.order) {
    (S.tasks[rid] || []).forEach(t => out.push({ t, rid, list: 'tasks', s: status(t, now) }));
    (S.mod[rid]?.plants || []).forEach(t => out.push({ t, rid, list: 'plants', s: status(t, now) }));
  }
  return out;
}

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
    .map(t => ({ t, s: status(t, now) }))
    .sort((a, b) => a.s.diff - b.s.diff)
    .map(x => x.t);

export function shopItems(S: AppState) {
  const out: { x: StockItem; rid: string }[] = [];
  for (const rid of S.order) (S.mod[rid]?.stock || []).forEach(x => x.lvl !== 'var' && out.push({ x, rid }));
  return out;
}

export const shopLine = (x: StockItem) => x.name + (x.lvl === 'az' ? ' (azaldı)' : '');

/** Prototipteki `notifs()` kuralları. `now` ile ileri bir günün bildirimleri de hesaplanabilir. */
export function notifs(S: AppState, now = Date.now()): Notice[] {
  const ns: Notice[] = [];
  const set = S.settings;
  if (set.routine) {
    allTasks(S, now)
      .filter(x => x.s.k !== 'ok')
      .sort((a, b) => a.s.diff - b.s.diff)
      .forEach(({ t, rid, list, s }) => {
        const room = S.rooms[rid].name;
        const plant = list === 'plants';
        ns.push({
          k: s.k,
          rid,
          title: `${room} · ${t.name}`,
          text:
            s.k === 'late'
              ? `${-s.diff} gün gecikti. En son ${agoText(t.last, now)}.`
              : plant
                ? 'Bugün sulama günü.'
                : t.last == null
                  ? 'Henüz hiç işaretlenmedi.'
                  : 'Bugün yapılacak.',
        });
      });
  }
  for (const rid of S.order) {
    const m = S.mod[rid] || {};
    const room = S.rooms[rid].name;
    const mod = TYPES[S.rooms[rid].type].mod;
    if (set.stock && m.stock) {
      const out = m.stock.filter(x => x.lvl === 'yok');
      if (out.length)
        ns.push({ k: 'today', rid, title: `${room} · ${out.length} ürün bitti`, text: out.map(x => x.name).join(', ') });
    }
    if (set.stock && mod === 'buzdolabi' && (!m.photoAt || daysSince(m.photoAt, now) > PHOTO_MAX_AGE))
      ns.push({
        k: 'ok',
        rid,
        title: `${room} · Buzdolabı fotoğrafı`,
        text: m.photoAt
          ? `Son fotoğraf ${agoText(m.photoAt, now)} çekildi. Yenisini çek.`
          : 'Henüz fotoğraf yok. Markete gitmeden önce bir tane çek.',
      });
    if (set.laundry && m.wardrobe) {
      const d = m.wardrobe.filter(c => c.state === 'kirli').length;
      if (d >= LAUNDRY_THRESHOLD)
        ns.push({ k: 'today', rid, title: `${room} · ${d} parça kirli kıyafet`, text: 'Bir makine dolusu birikti, çamaşır zamanı.' });
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
  S.tasks[id] = TYPES[type].tasks.map(([name, every]) => ({ id: uid(), name, every, last: null }));
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
    settings: { time: '09:00', routine: true, stock: true, laundry: true },
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
  const w = (name: string, cat: string, state: 'temiz' | 'kirli' | 'utu') => ({ id: uid(), name, cat, state });
  S.mod[map.Y].wardrobe = [
    w('Beyaz gömlek', 'Üst', 'temiz'), w('Kot pantolon', 'Alt', 'temiz'), w('Siyah kazak', 'Üst', 'kirli'),
    w('Spor tişört', 'Üst', 'kirli'), w('Lacivert takım', 'Elbise / Takım', 'utu'), w('Kaban', 'Dış giyim', 'temiz'),
    w('Pijama takımı', 'Ev / Pijama', 'kirli'), w('Keten gömlek', 'Üst', 'utu'),
  ];
  const st = (name: string, lvl: 'var' | 'az' | 'yok') => ({ id: uid(), name, lvl });
  S.mod[map.M].stock = [
    st('Süt', 'az'), st('Yumurta', 'var'), st('Beyaz peynir', 'var'), st('Domates', 'yok'),
    st('Yoğurt', 'var'), st('Tereyağı', 'az'), st('Biber', 'yok'), st('Ekmek', 'var'),
  ];
  S.mod[map.B].stock = [st('Tuvalet kağıdı', 'az'), st('Şampuan', 'var'), st('Diş macunu', 'var'), st('Sıvı sabun', 'yok')];
  const p = (name: string, every: number, d: number) => ({ id: uid(), name, every, last: ago(d, now) });
  S.mod[map.S].plants = [p('Monstera', 7, 6), p('Paşa kılıcı', 14, 3)];
  S.mod[map.L].plants = [p('Fesleğen', 2, 2), p('Sardunya', 3, 1)];
  return S;
}
