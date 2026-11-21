import { Platform } from 'react-native';

import type { AppState } from '@/domain/types';

import { taskEmoji } from '@/domain/icons';
import { setLang, tx } from '@/i18n/runtime';
import { palettes } from '@/theme';

import { widgetData } from './data';

/** Parantez içini at, uzun başlık widget'ta kesilmesin. */
const shortName = (n: string) => n.replace(/\s*\(.*$/, '').trim().slice(0, 28);

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

const pal = (c: typeof palettes.light) => ({
  bg: c.surface,
  ink: c.ink,
  muted: c.muted,
  late: c.late,
  ok: c.ok,
  today: c.today,
  accent: c.accent,
  accentSoft: c.accentSoft,
});

/**
 * iOS ana ekran widget'ının verisini app group'a yazar ve widget'ı yeniler.
 * İçerik Android widget'ıyla (TodayWidget.tsx) aynı: başlık, alt satır, seri, iş satırları, açık/koyu renk, dil.
 */
export async function refreshIosWidget(S: AppState, now = Date.now()) {
  const l = load();
  if (!l) return;
  setLang(S.settings?.language);
  const d = widgetData(S, now);
  const more = d.tasks.length - Math.min(4, d.tasks.length);
  const title = d.vacation ? tx('Tatildesin') : d.left ? tx(`Bugün ${d.left} iş`) : tx('Her şey tamam');
  const sub = more > 0 ? `+${more} ${tx('iş daha')}` : d.total ? tx(`${Math.min(d.done, d.total)}/${d.total} bitti`) : 'Homezy';
  const payload = {
    v: 2,
    title,
    sub,
    streak: d.streak,
    empty: d.vacation ? tx('🏖️ Rutinler dondu, iyi dinlen.') : tx('🎉 Bugünlük tamam!'),
    tasks: d.tasks.slice(0, 4).map(t => ({
      id: t.id,
      emoji: taskEmoji(t.name, t.emoji === '🪴'),
      name: shortName(tx(t.name)),
      sub: tx(`${t.room} · ${t.label}`),
      late: t.late,
    })),
    light: pal(palettes.light),
    dark: pal(palettes.dark),
  };
  new l.ExtensionStorage(GROUP).set('widgetData', JSON.stringify(payload));
  l.ExtensionStorage.reloadWidget();
}
