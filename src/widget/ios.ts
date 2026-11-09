import { Platform } from 'react-native';

import type { AppState } from '@/domain/types';

import { widgetData } from './data';

/** Swift widget'ı (targets/widget) ile paylaşılan app group; aynı kimlik expo-target.config.js'te. */
const GROUP = 'group.com.meikai.homezy';

type Storage = { set(key: string, value: string): void };
type StorageLib = { ExtensionStorage: { new (group: string): Storage; reloadWidget(name?: string): void } };

let lib: StorageLib | null | undefined;
function load(): StorageLib | null {
  if (lib !== undefined) return lib;
  lib = null;
  if (Platform.OS === 'ios') {
    try {
      // Eski derleme ya da Expo Go: yerel modül yok, widget yok.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      lib = require('@bacons/apple-targets') as StorageLib;
    } catch {
      lib = null;
    }
  }
  return lib;
}

/** iOS ana ekran widget'ının verisini app group'a yazar ve widget'ı yeniler. */
export async function refreshIosWidget(S: AppState, now = Date.now()) {
  const l = load();
  if (!l) return;
  const d = widgetData(S, now);
  const payload = {
    tasks: d.tasks.slice(0, 4).map(t => ({ emoji: t.emoji, name: t.name, room: t.room, label: t.label, late: t.late })),
    left: d.left,
    done: d.done,
    streak: d.streak,
    tip: d.tip.text,
    title: 'Bugün',
  };
  new l.ExtensionStorage(GROUP).set('widgetData', JSON.stringify(payload));
  l.ExtensionStorage.reloadWidget();
}
