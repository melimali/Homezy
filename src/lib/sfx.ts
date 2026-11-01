import type { AudioPlayer } from 'expo-audio';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

// Yerel modül bu derlemede yoksa require etmeden geç: JS try/catch yerel çökmeyi yakalamaz.
function optional<T>(native: string, pkg: () => T): T | null {
  try {
    return requireOptionalNativeModule(native) ? pkg() : null;
  } catch {
    return null;
  }
}
const Audio = optional('ExpoAudio', () => require('expo-audio') as typeof import('expo-audio')); // eslint-disable-line @typescript-eslint/no-require-imports
const Haptics = optional('ExpoHaptics', () => require('expo-haptics') as typeof import('expo-haptics')); // eslint-disable-line @typescript-eslint/no-require-imports

/**
 * Yumuşak ses efektleri ve titreşim. Sesler assets/sounds içinde (scripts/make-sounds.js ile üretildi).
 * Ayarlardaki "Ses ve titreşim" kapalıysa hiçbiri çalmaz. Telefon sessizdeyse ses de çalmaz.
 */
const SOURCES = {
  tap: require('../../assets/sounds/tap.wav'),
  done: require('../../assets/sounds/done.wav'),
  coin: require('../../assets/sounds/coin.wav'),
  party: require('../../assets/sounds/party.wav'),
  levelup: require('../../assets/sounds/levelup.wav'),
  pop: require('../../assets/sounds/pop.wav'),
} as const;
export type Sfx = keyof typeof SOURCES;

const VOLUME: Record<Sfx, number> = { tap: 0.25, done: 0.6, coin: 0.5, party: 0.6, levelup: 0.65, pop: 0.3 };

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
  else if (name === 'party' || name === 'done' || name === 'levelup') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Sessiz titreşim (ses yok). Ses ve titreşim ayarına uyar, modül yoksa sessizce geçer. */
export function haptic(kind: 'light' | 'medium' | 'success' = 'light') {
  if (!enabled || Platform.OS === 'web' || !Haptics) return;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.impactAsync(kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
