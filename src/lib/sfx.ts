import type { AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';

// Yerel modüller bu sürümde yoksa (eski geliştirme sürümü) uygulama çökmesin, sadece ses çalmasın.
let Audio: typeof import('expo-audio') | null = null;
let Haptics: typeof import('expo-haptics') | null = null;
try {
  Audio = require('expo-audio'); // eslint-disable-line @typescript-eslint/no-require-imports
} catch {
  Audio = null;
}
try {
  Haptics = require('expo-haptics'); // eslint-disable-line @typescript-eslint/no-require-imports
} catch {
  Haptics = null;
}

/**
 * Yumuşak ses efektleri ve titreşim. Sesler assets/sounds içinde (scripts/make-sounds.js ile üretildi).
 * Ayarlardaki "Ses ve titreşim" kapalıysa hiçbiri çalmaz. Telefon sessizdeyse ses de çalmaz.
 */
const SOURCES = {
  tap: require('../../assets/sounds/tap.wav'),
  done: require('../../assets/sounds/done.wav'),
  coin: require('../../assets/sounds/coin.wav'),
  party: require('../../assets/sounds/party.wav'),
} as const;
export type Sfx = keyof typeof SOURCES;

const VOLUME: Record<Sfx, number> = { tap: 0.25, done: 0.6, coin: 0.5, party: 0.6 };

let enabled = true;
let players: Partial<Record<Sfx, AudioPlayer>> | null = null;

function load() {
  if (players) return players;
  players = {};
  if (!Audio) return players;
  try {
    // Başka bir uygulamanın müziğini durdurmasın; sessiz moda uysun.
    Audio.setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }).catch(() => {});
    for (const k of Object.keys(SOURCES) as Sfx[]) {
      const p = Audio.createAudioPlayer(SOURCES[k]);
      p.volume = VOLUME[k];
      players[k] = p;
    }
  } catch (e) {
    console.warn('sfx', e);
  }
  return players;
}

/** Ayar değişince (ve açılışta) çağrılır. */
export function setSfxEnabled(on: boolean) {
  enabled = on;
  if (on) load();
}

export function sfx(name: Sfx) {
  if (!enabled) return;
  const p = load()[name];
  if (p) {
    try {
      p.seekTo(0).catch(() => {});
      p.play();
    } catch {
      // Ses çalınamazsa sorun değil.
    }
  }
  if (Platform.OS === 'web' || !Haptics) return;
  if (name === 'tap') Haptics.selectionAsync().catch(() => {});
  else if (name === 'party' || name === 'done') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
