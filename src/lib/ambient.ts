import type { AudioPlayer } from 'expo-audio';
import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * Plak çaların sürekli (loop) çalan parçaları: lofi ve ambiyans sesleri. Birden fazlası aynı anda açılıp
 * karıştırılabilir (ör. lofi + yağmur). Dosyalar assets/sounds/lofi/ altında. Yerel ses modülü yoksa hiçbir şey çalmaz.
 */
export type AmbientId = 'lofi' | 'rain' | 'fireplace' | 'nature' | 'sea' | 'night';

const SOURCES: Record<AmbientId, number> = {
  lofi: require('../../assets/sounds/lofi/lofi.mp3'),
  rain: require('../../assets/sounds/lofi/yagmur.mp3'),
  fireplace: require('../../assets/sounds/lofi/somine.mp3'),
  nature: require('../../assets/sounds/lofi/kus.mp3'),
  sea: require('../../assets/sounds/lofi/deniz.mp3'),
  night: require('../../assets/sounds/lofi/circir.mp3'),
};

/** Lofi ana müzik, ambiyanslar altta durur ki karışınca birbirini bastırmasın. */
const VOLUME: Record<AmbientId, number> = { lofi: 0.7, rain: 0.5, fireplace: 0.5, nature: 0.5, sea: 0.5, night: 0.5 };

let Audio: typeof import('expo-audio') | null | undefined;
function audio() {
  if (Audio !== undefined) return Audio;
  try {
    // Yerel modül bu derlemede yoksa require etme: JS try/catch yerel çökmeyi yakalamaz.
    Audio = requireOptionalNativeModule('ExpoAudio') ? (require('expo-audio') as typeof import('expo-audio')) : null; // eslint-disable-line @typescript-eslint/no-require-imports
  } catch {
    Audio = null;
  }
  return Audio;
}

const players: Partial<Record<AmbientId, AudioPlayer>> = {};
let active: AmbientId[] = [];
let modeSet = false;
const listeners = new Set<() => void>();

const emit = (next: AmbientId[]) => {
  active = next; // useSyncExternalStore her değişimde yeni dizi ister
  listeners.forEach(l => l());
};

function player(id: AmbientId) {
  const A = audio();
  if (!A) return null;
  try {
    if (!modeSet) {
      modeSet = true;
      // Çalar kullanıcının isteğiyle açılır: sessiz modda da çalsın, ama arka planda sürmesin.
      A.setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }).catch(() => {});
    }
    let p = players[id];
    if (!p) {
      p = A.createAudioPlayer(SOURCES[id]);
      p.loop = true;
      p.volume = VOLUME[id];
      players[id] = p;
    }
    return p;
  } catch (e) {
    console.warn('ambient', e);
    return null;
  }
}

/** Bu derlemede ses çalınabiliyor mu (yerel modül var mı). */
export const ambientAvailable = () => !!audio();

export const getActive = () => active;
export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function setPlaying(id: AmbientId, on: boolean) {
  const p = player(id);
  if (on) {
    if (!p) return;
    try {
      p.play();
    } catch {
      return;
    }
    if (!active.includes(id)) emit([...active, id]);
  } else {
    try {
      p?.pause();
    } catch {
      // Duraklatılamazsa sorun değil.
    }
    if (active.includes(id)) emit(active.filter(x => x !== id));
  }
}

export const toggle = (id: AmbientId) => setPlaying(id, !active.includes(id));

/** Hepsini durdur; çalan yoksa bir şey yapmaz. */
export function stopAll() {
  for (const id of active) {
    try {
      players[id]?.pause();
    } catch {
      // Duraklatılamazsa sorun değil.
    }
  }
  if (active.length) emit([]);
}

/** Sadece bu parçayı çal (öncekileri durdurur): önceki/sonraki düğmeleri için. */
export function solo(id: AmbientId) {
  for (const other of active) if (other !== id) setPlaying(other, false);
  setPlaying(id, true);
}
