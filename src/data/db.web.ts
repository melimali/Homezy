import { normalize } from '@/domain/play';
import type { AppState } from '@/domain/types';

/**
 * Web önizlemesi için basit yedek: tarayıcıda localStorage kullanır.
 * Telefonda `db.ts` (expo-sqlite) çalışır.
 */
const KEY = 'layfapp.v1';

export async function loadState(): Promise<AppState | null> {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? normalize(JSON.parse(raw) as AppState) : null;
  } catch {
    return null;
  }
}

export async function saveState(S: AppState): Promise<void> {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(S));
  } catch {
    // Tarayıcı depolaması kapalıysa veri yalnızca bu oturumda kalır.
  }
}
