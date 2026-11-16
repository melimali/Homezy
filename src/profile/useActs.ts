import { useSyncExternalStore } from 'react';

import type { ActId } from '@/domain/secimData';
import { ACTS } from '@/domain/secimData';
import { prefs } from '@/lib/supabase';

/**
 * "Evde neler yaparsın?" cevapları (çoklu seçim). Telefonda tutulur; "Seni tanıyalım" ve Bugün'deki
 * "Seç" kartı aynı kaydı yazar. Bu cevaplar özel işleri açar (klavye, ayakkabı, evcil hayvan...).
 */
const KEY = 'acts';
const valid = (a: unknown): ActId[] => (Array.isArray(a) ? (a.filter(x => ACTS.some(o => o.id === x)) as ActId[]) : []);

function read(): ActId[] {
  try {
    return valid(JSON.parse(prefs.get(KEY) ?? '[]'));
  } catch {
    return [];
  }
}

let cur: ActId[] = read();
const subs = new Set<() => void>();

export function saveActs(a: unknown) {
  cur = valid(a);
  prefs.set(KEY, JSON.stringify(cur));
  subs.forEach(f => f());
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};

export const useActs = (): ActId[] => useSyncExternalStore(subscribe, () => cur, () => cur);
