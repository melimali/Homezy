import * as SQLite from 'expo-sqlite';

import { CARE, TYPES } from '@/domain/constants';
import { emptyPlay, normalize } from '@/domain/play';
import type {
  AppState, Bill, ClothState, HomeProfile, Mode, Play, RoomType, Settings, StockLevel, Task, TaskList, Warranty, WardrobeFilter, WashType,
} from '@/domain/types';

/**
 * Bütün veriler telefondaki `layfapp.db` dosyasında. Veri küçük olduğu için her kayıtta
 * tablolar tek bir işlemde baştan yazılır; böylece uygulama tarafı sade bir state ile çalışır.
 */
const SCHEMA_VERSION = 2;

/** Sürüm 2'de eklenen sütunlar: işlerde süre, erteleme, etiket, fotoğraf; kıyafette yıkama türü ve tarihler; üründe son kullanma tarihi. */
const ADDED_COLUMNS: [string, string, string][] = [
  ['tasks', 'min', 'INTEGER'], ['tasks', 'snooze', 'INTEGER'], ['tasks', 'tag', 'TEXT'], ['tasks', 'photo', 'TEXT'],
  ['clothes', 'wash', 'TEXT'], ['clothes', 'worn', 'INTEGER'], ['clothes', 'added', 'INTEGER'],
  ['stock', 'exp', 'INTEGER'],
];

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('layfapp.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS rooms (
          id TEXT PRIMARY KEY NOT NULL, type TEXT NOT NULL, name TEXT NOT NULL, ord INTEGER NOT NULL,
          filter TEXT, photo TEXT, photo_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS cells (idx INTEGER PRIMARY KEY NOT NULL, room_id TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY NOT NULL, room_id TEXT NOT NULL, list TEXT NOT NULL,
          name TEXT NOT NULL, every INTEGER NOT NULL, last INTEGER, ord INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS clothes (
          id TEXT PRIMARY KEY NOT NULL, room_id TEXT NOT NULL, name TEXT NOT NULL,
          cat TEXT NOT NULL, state TEXT NOT NULL, ord INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS stock (
          id TEXT PRIMARY KEY NOT NULL, room_id TEXT NOT NULL, name TEXT NOT NULL,
          lvl TEXT NOT NULL, ord INTEGER NOT NULL
        );
      `);
      for (const [table, col, type] of ADDED_COLUMNS) {
        const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
        if (!cols.some(c => c.name === col)) await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
      }
      return db;
    })();
  }
  return dbPromise;
}

type RoomRow = {
  id: string; type: RoomType; name: string; ord: number;
  filter: WardrobeFilter | null; photo: string | null; photo_at: number | null;
};
type TaskRow = {
  id: string; room_id: string; list: TaskList; name: string; every: number; last: number | null;
  min: number | null; snooze: number | null; tag: string | null; photo: string | null;
};
type ClothRow = {
  id: string; room_id: string; name: string; cat: string; state: ClothState;
  wash: WashType | null; worn: number | null; added: number | null;
};
type StockRow = { id: string; room_id: string; name: string; lvl: StockLevel; exp: number | null };

const json = <T,>(v: string | undefined, fallback: T): T => (v ? (JSON.parse(v) as T) : fallback);

export async function loadState(): Promise<AppState | null> {
  const db = await getDb();
  const meta = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM meta');
  if (!meta.length) return null;
  const m = Object.fromEntries(meta.map(r => [r.key, r.value]));
  const cols = Number(m.cols) || 6;
  const rows = Number(m.rows) || 8;

  const S: AppState = {
    v: 1,
    setup: m.setup === '1',
    cols,
    rows,
    cells: Array(cols * rows).fill(null),
    rooms: {},
    order: [],
    tasks: {},
    mod: {},
    settings: JSON.parse(m.settings) as Settings,
    play: m.play ? (JSON.parse(m.play) as Play) : emptyPlay(),
    // Eksikse `normalize` doldurur.
    home: json<HomeProfile>(m.home, undefined as unknown as HomeProfile),
    mode: json<Mode | null>(m.mode, null),
    care: m.care_init === '1' ? [] : (undefined as unknown as Task[]),
    bills: json<Bill[]>(m.bills, []),
    warranties: json<Warranty[]>(m.warranties, []),
    seasonal: json<Record<string, number>>(m.seasonal, {}),
  };

  for (const r of await db.getAllAsync<RoomRow>('SELECT * FROM rooms ORDER BY ord')) {
    S.rooms[r.id] = { id: r.id, type: r.type, name: r.name };
    S.order.push(r.id);
    S.tasks[r.id] = [];
    const mod = TYPES[r.type].mod;
    S.mod[r.id] =
      mod === 'gardirop' ? { wardrobe: [], filter: r.filter ?? 'all' }
      : mod === 'buzdolabi' ? { photo: r.photo, photoAt: r.photo_at, stock: [] }
      : mod === 'stok' ? { stock: [] }
      : mod === 'bitki' ? { plants: [] }
      : {};
  }
  for (const c of await db.getAllAsync<{ idx: number; room_id: string }>('SELECT * FROM cells'))
    if (c.idx < S.cells.length && S.rooms[c.room_id]) S.cells[c.idx] = c.room_id;
  for (const t of await db.getAllAsync<TaskRow>('SELECT * FROM tasks ORDER BY ord')) {
    const task: Task = { id: t.id, name: t.name, every: t.every, last: t.last };
    if (t.min != null) task.min = t.min;
    if (t.snooze != null) task.snooze = t.snooze;
    if (t.tag != null) task.tag = t.tag;
    if (t.photo != null) task.photo = t.photo;
    if (t.list === 'care') {
      (S.care ||= []).push(task);
      continue;
    }
    if (!S.rooms[t.room_id]) continue;
    if (t.list === 'plants') (S.mod[t.room_id].plants ||= []).push(task);
    else S.tasks[t.room_id].push(task);
  }
  for (const c of await db.getAllAsync<ClothRow>('SELECT * FROM clothes ORDER BY ord'))
    S.mod[c.room_id]?.wardrobe?.push({
      id: c.id, name: c.name, cat: c.cat, state: c.state, wash: c.wash ?? undefined, worn: c.worn, added: c.added ?? undefined,
    });
  for (const s of await db.getAllAsync<StockRow>('SELECT * FROM stock ORDER BY ord'))
    if (S.mod[s.room_id]) (S.mod[s.room_id].stock ||= []).push({ id: s.id, name: s.name, lvl: s.lvl, exp: s.exp });

  return normalize(S);
}

export async function saveState(S: AppState): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async tx => {
    await tx.execAsync('DELETE FROM meta; DELETE FROM rooms; DELETE FROM cells; DELETE FROM tasks; DELETE FROM clothes; DELETE FROM stock;');
    const meta: [string, string][] = [
      ['schema', String(SCHEMA_VERSION)],
      ['setup', S.setup ? '1' : '0'],
      ['cols', String(S.cols)],
      ['rows', String(S.rows)],
      ['settings', JSON.stringify(S.settings)],
      ['play', JSON.stringify(S.play)],
      ['home', JSON.stringify(S.home)],
      ['mode', JSON.stringify(S.mode)],
      ['bills', JSON.stringify(S.bills)],
      ['warranties', JSON.stringify(S.warranties)],
      ['seasonal', JSON.stringify(S.seasonal)],
      // Ev bakımı listesi bir kere oluşturuldu; kullanıcı hepsini silse de yeniden eklenmesin.
      ['care_init', '1'],
    ];
    for (const [k, v] of meta) await tx.runAsync('INSERT INTO meta (key, value) VALUES (?, ?)', k, v);

    for (const [ord, id] of S.order.entries()) {
      const r = S.rooms[id];
      const m = S.mod[id] || {};
      await tx.runAsync(
        'INSERT INTO rooms (id, type, name, ord, filter, photo, photo_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        id, r.type, r.name, ord, m.filter ?? null, m.photo ?? null, m.photoAt ?? null,
      );
      for (const [i, t] of (S.tasks[id] || []).entries()) await insertTask(tx, t, id, 'tasks', i);
      for (const [i, t] of (m.plants || []).entries()) await insertTask(tx, t, id, 'plants', i);
      for (const [i, c] of (m.wardrobe || []).entries())
        await tx.runAsync('INSERT INTO clothes (id, room_id, name, cat, state, ord, wash, worn, added) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          c.id, id, c.name, c.cat, c.state, i, c.wash ?? null, c.worn ?? null, c.added ?? null);
      for (const [i, s] of (m.stock || []).entries())
        await tx.runAsync('INSERT INTO stock (id, room_id, name, lvl, ord, exp) VALUES (?, ?, ?, ?, ?, ?)', s.id, id, s.name, s.lvl, i, s.exp ?? null);
    }
    for (const [i, t] of (S.care || []).entries()) await insertTask(tx, t, CARE, 'care', i);
    for (const [idx, rid] of S.cells.entries())
      if (rid) await tx.runAsync('INSERT INTO cells (idx, room_id) VALUES (?, ?)', idx, rid);
  });
}

function insertTask(tx: SQLite.SQLiteDatabase, t: Task, roomId: string, list: TaskList, ord: number) {
  return tx.runAsync(
    'INSERT INTO tasks (id, room_id, list, name, every, last, ord, min, snooze, tag, photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    t.id, roomId, list, t.name, t.every, t.last, ord, t.min ?? null, t.snooze ?? null, t.tag ?? null, t.photo ?? null,
  );
}
