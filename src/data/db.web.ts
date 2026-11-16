import { normalize } from '@/domain/play';
import { runMigrations, storedVersion, type Migration } from './migrate';
import type { AppState } from '@/domain/types';

/**
 * Web önizlemesi için basit yedek: tarayıcıda localStorage kullanır.
 * Telefonda `db.ts` (expo-sqlite) çalışır.
 */
const KEY = 'layfapp.v1';
const SCHEMA_KEY = 'layfapp.schema';
const SCHEMA_VERSION = 3;
/** Geçiş adımları (`steps[v]`: v-1 → v); veri silmez. `db.ts` ile aynı sürüm numarası. */
const MIGRATIONS: Record<number, Migration<Record<string, unknown>>> = {};
let schemaToWrite = SCHEMA_VERSION;

/** Kayıtlı sürüm eskiyse adımları çalıştırır; hata olursa eski veri durur, yedek ve hata anahtarı bırakılır. */
async function migrate(raw: string, data: Record<string, unknown>) {
  const ls = globalThis.localStorage;
  const stored = ls?.getItem(SCHEMA_KEY);
  const from = storedVersion(stored);
  if (stored == null || from >= SCHEMA_VERSION) return;
  ls.setItem(`${KEY}.backup_v${from}`, raw);
  const res = await runMigrations(from, SCHEMA_VERSION, MIGRATIONS, data, v => ls.setItem(SCHEMA_KEY, String(v)));
  if (!res.ok) {
    schemaToWrite = res.to;
    ls.setItem('layfapp.migrate_error', `${from}->${res.to}: ${res.error}`);
  }
}

export async function loadState(): Promise<AppState | null> {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as AppState;
    await migrate(raw, data as unknown as Record<string, unknown>).catch(() => void (schemaToWrite = 0));
    return normalize(data);
  } catch {
    return null;
  }
}

export async function saveState(S: AppState): Promise<void> {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(S));
    if (schemaToWrite > 0) globalThis.localStorage?.setItem(SCHEMA_KEY, String(schemaToWrite));
  } catch {
    // Tarayıcı depolaması kapalıysa veri yalnızca bu oturumda kalır.
  }
}
