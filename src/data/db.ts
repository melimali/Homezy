import * as SQLite from 'expo-sqlite';

import { TYPES } from '@/domain/constants';
import type { AppState, ClothState, RoomType, Settings, StockLevel, TaskList, WardrobeFilter } from '@/domain/types';

/**
 * Bütün veriler telefondaki `layfapp.db` dosyasında. Veri küçük olduğu için her kayıtta
 * tablolar tek bir işlemde baştan yazılır; böylece uygulama tarafı sade bir state ile çalışır.
 */
const SCHEMA_VERSION = 1;

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
      return db;
    })();
  }
  return dbPromise;
}

type RoomRow = {
  id: string; type: RoomType; name: string; ord: number;
  filter: WardrobeFilter | null; photo: string | null; photo_at: number | null;
};
type TaskRow = { id: string; room_id: string; list: TaskList; name: string; every: number; last: number | null };
type ClothRow = { id: string; room_id: string; name: string; cat: string; state: ClothState };
type StockRow = { id: string; room_id: string; name: string; lvl: StockLevel };

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
    if (!S.rooms[t.room_id]) continue;
    const task = { id: t.id, name: t.name, every: t.every, last: t.last };
    if (t.list === 'plants') (S.mod[t.room_id].plants ||= []).push(task);
    else S.tasks[t.room_id].push(task);
  }
  for (const c of await db.getAllAsync<ClothRow>('SELECT * FROM clothes ORDER BY ord'))
    S.mod[c.room_id]?.wardrobe?.push({ id: c.id, name: c.name, cat: c.cat, state: c.state });
  for (const s of await db.getAllAsync<StockRow>('SELECT * FROM stock ORDER BY ord'))
    if (S.mod[s.room_id]) (S.mod[s.room_id].stock ||= []).push({ id: s.id, name: s.name, lvl: s.lvl });

  return S;
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
    ];
    for (const [k, v] of meta) await tx.runAsync('INSERT INTO meta (key, value) VALUES (?, ?)', k, v);

    for (const [ord, id] of S.order.entries()) {
      const r = S.rooms[id];
      const m = S.mod[id] || {};
      await tx.runAsync(
        'INSERT INTO rooms (id, type, name, ord, filter, photo, photo_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        id, r.type, r.name, ord, m.filter ?? null, m.photo ?? null, m.photoAt ?? null,
      );
      for (const [i, t] of (S.tasks[id] || []).entries())
        await tx.runAsync('INSERT INTO tasks (id, room_id, list, name, every, last, ord) VALUES (?, ?, ?, ?, ?, ?, ?)',
          t.id, id, 'tasks', t.name, t.every, t.last, i);
      for (const [i, t] of (m.plants || []).entries())
        await tx.runAsync('INSERT INTO tasks (id, room_id, list, name, every, last, ord) VALUES (?, ?, ?, ?, ?, ?, ?)',
          t.id, id, 'plants', t.name, t.every, t.last, i);
      for (const [i, c] of (m.wardrobe || []).entries())
        await tx.runAsync('INSERT INTO clothes (id, room_id, name, cat, state, ord) VALUES (?, ?, ?, ?, ?, ?)',
          c.id, id, c.name, c.cat, c.state, i);
      for (const [i, s] of (m.stock || []).entries())
        await tx.runAsync('INSERT INTO stock (id, room_id, name, lvl, ord) VALUES (?, ?, ?, ?, ?)', s.id, id, s.name, s.lvl, i);
    }
    for (const [idx, rid] of S.cells.entries())
      if (rid) await tx.runAsync('INSERT INTO cells (idx, room_id) VALUES (?, ?)', idx, rid);
  });
}
