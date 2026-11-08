import type { AudioPlayer } from 'expo-audio';
import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * Plak çaların sürekli (loop) çalan parçaları: lofi ve ambiyans sesleri. Birden fazlası aynı anda açılıp
 * karıştırılabilir (ör. lofi + yağmur). Dosyalar assets/sounds/ altında. Yerel ses modülü yoksa hiçbir şey çalmaz.
 */
export type AmbientId = 'lofi' | 'rain' | 'fireplace' | 'nature' | 'sea' | 'night' | 'storm' | 'slowlofi' | 'deepsea' | 'wind';

const SOURCES: Record<AmbientId, number> = {
  lofi: require('../../assets/sounds/lofi.mp3'),
  rain: require('../../assets/sounds/rain.mp3'),
  fireplace: require('../../assets/sounds/firepit.mp3'),
  nature: require('../../assets/sounds/bird.mp3'),
  sea: require('../../assets/sounds/sea.mp3'),
  night: require('../../assets/sounds/cricet.mp3'),
  // Aynı dosyalar farklı hız/seviyeyle: yeni ses dosyası eklemeden çeşit. Gerçek dosya gelince sadece buradaki require değişir.
  storm: require('../../assets/sounds/rain.mp3'),
  slowlofi: require('../../assets/sounds/lofi.mp3'),
  deepsea: require('../../assets/sounds/sea.mp3'),
  wind: require('../../assets/sounds/sea.mp3'),
};

/** Parçanın çalma hızı (1 = özgün). Perde düzeltmeli: yavaşlayınca tiz-bas bozulmaz. */
const RATE: Partial<Record<AmbientId, number>> = { storm: 1.3, slowlofi: 0.85, deepsea: 0.8, wind: 1.5 };

/** Lofi ana müzik, ambiyanslar altta durur ki karışınca birbirini bastırmasın. */
const VOLUME: Record<AmbientId, number> = { lofi: 0.7, rain: 0.5, fireplace: 0.5, nature: 0.5, sea: 0.5, night: 0.5, storm: 0.8, slowlofi: 0.7, deepsea: 0.55, wind: 0.3 };

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
      const r = RATE[id];
      if (r) {
        try {
          p.shouldCorrectPitch = true;
          p.setPlaybackRate(r);
        } catch {
          // Hız ayarlanamazsa özgün hızda çalar.
        }
      }
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

export function setPlaying(id: AmbientId, on: boolean, volume?: number) {
  const p = player(id);
  if (on) {
    if (!p) return;
    try {
      p.volume = volume ?? levels[id] ?? VOLUME[id];
      if (volume !== undefined) levels[id] = volume;
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
  if (sleepTimer && !active.length) setSleep(null);
}

/** Sadece bu parçayı çal (öncekileri durdurur): önceki/sonraki düğmeleri için. */
export function solo(id: AmbientId) {
  for (const other of active) if (other !== id) setPlaying(other, false);
  setPlaying(id, true);
}

/** Hazır kombo: katman seviyeleri önceden ayarlı, tek dokunuşla (öncekileri durdurur). */
export type Combo = { id: string; emoji: string; name: string; desc: string; layers: Partial<Record<AmbientId, number>> };
export const COMBOS: Combo[] = [
  { id: 'rainy-coffee', emoji: '☕', name: 'Yağmurlu Kahve', desc: 'Yumuşak lo-fi, pencerede yağmur', layers: { lofi: 0.6, rain: 0.45 } },
  { id: 'night-focus', emoji: '🌙', name: 'Gece Odak', desc: 'Yavaş lo-fi ve uzaktan cırcır böcekleri', layers: { slowlofi: 0.65, night: 0.3 } },
  { id: 'fire-evening', emoji: '🪵', name: 'Şömine Akşamı', desc: 'Çıtırdayan odun ve hafif rüzgâr', layers: { fireplace: 0.6, wind: 0.2 } },
  { id: 'forest-morning', emoji: '🌿', name: 'Orman Sabahı', desc: 'Kuş sesleri, uzaktan lo-fi', layers: { nature: 0.6, lofi: 0.3 } },
  { id: 'storm-cozy', emoji: '⛈️', name: 'Fırtınalı Kış', desc: 'Dışarıda fırtına, içeride şömine', layers: { storm: 0.7, fireplace: 0.45 } },
  { id: 'deep-sleep', emoji: '😴', name: 'Derin Uyku', desc: 'Derin dalgalar ve hafif yağmur', layers: { deepsea: 0.55, rain: 0.25 } },
];

/** Bir kombonun katmanlarını çalar; kombo zaten çalıyorsa durdurur. */
export function playCombo(combo: Combo) {
  const ids = Object.keys(combo.layers) as AmbientId[];
  if (comboActive(combo)) return stopAll();
  for (const other of active) if (!ids.includes(other)) setPlaying(other, false);
  for (const id of ids) {
    setPlaying(id, true, combo.layers[id]);
  }
}

export const comboActive = (combo: Combo) => {
  const ids = Object.keys(combo.layers) as AmbientId[];
  return ids.length === active.length && ids.every(i => active.includes(i));
};

/** Katman ses seviyesi (0–1): çalarken anında uygulanır, "kendi kombom" olarak kaydedilebilir. */
const levels: Partial<Record<AmbientId, number>> = {};
export const getLevel = (id: AmbientId) => levels[id] ?? VOLUME[id];
export function setLevel(id: AmbientId, v: number) {
  const x = Math.min(1, Math.max(0.05, v));
  levels[id] = x;
  try {
    const p = players[id];
    if (p) p.volume = x;
  } catch {
    // Ayarlanamazsa bir sonraki çalışta uygulanır.
  }
  emit([...active]); // arayüz yenilensin
}

/** Uyku zamanlayıcısı: süre bitince sesi yavaşça kısıp durdurur. */
let sleepAt: number | null = null;
let sleepTimer: ReturnType<typeof setInterval> | null = null;
export const getSleepAt = () => sleepAt;
export function setSleep(minutes: number | null) {
  if (sleepTimer) clearInterval(sleepTimer);
  sleepTimer = null;
  sleepAt = minutes ? Date.now() + minutes * 60000 : null;
  if (sleepAt) {
    sleepTimer = setInterval(() => {
      const left = (sleepAt ?? 0) - Date.now();
      if (left <= 0) {
        stopAll();
        for (const id of Object.keys(players) as AmbientId[]) {
          try {
            players[id]!.volume = levels[id] ?? VOLUME[id];
          } catch {
            // Sorun değil.
          }
        }
        setSleep(null);
      } else if (left < 20000) {
        for (const id of active) {
          try {
            players[id]!.volume = (levels[id] ?? VOLUME[id]) * (left / 20000);
          } catch {
            // Sorun değil.
          }
        }
      }
    }, 1000);
  }
  emit([...active]);
}

/** Kaydedilmiş "kendi kombom": çalan katmanlar ve seviyeleri. */
const KEY = 'homezy.ambient.custom';
function kv() {
  try {
    return (require('expo-sqlite/kv-store') as typeof import('expo-sqlite/kv-store')).default; // eslint-disable-line @typescript-eslint/no-require-imports
  } catch {
    return null;
  }
}
let customMem: Combo | null = null;
export function getCustom(): Combo | null {
  if (customMem) return customMem;
  try {
    const raw = kv()?.getItemSync(KEY);
    if (raw) customMem = JSON.parse(raw) as Combo;
  } catch {
    // Okunamazsa kayıt yok sayılır.
  }
  return customMem;
}
/** Şu an çalanları kombo olarak kaydeder. Çalan yoksa false. */
export function saveCustom() {
  if (!active.length) return false;
  const layers: Partial<Record<AmbientId, number>> = {};
  for (const id of active) layers[id] = getLevel(id);
  customMem = { id: 'custom', emoji: '⭐', name: 'Benim Kombom', desc: 'Kendi karışımın', layers };
  try {
    kv()?.setItemSync(KEY, JSON.stringify(customMem));
  } catch {
    // Kalıcı yazılamazsa bu oturumda kalır.
  }
  emit([...active]);
  return true;
}

/** Moka'nın seçimi: ruh haline (verilmişse) ve günün saatine göre kombo. */
export function suggestCombo(feel?: string | null, hour = new Date().getHours()): Combo {
  const by = (id: string) => COMBOS.find(k => k.id === id) ?? COMBOS[0];
  if (feel === 'yorgun' || feel === 'keyifsiz') return by(hour >= 18 || hour < 6 ? 'deep-sleep' : 'rainy-coffee');
  if (feel === 'bunalmis') return by('forest-morning');
  if (hour >= 23 || hour < 5) return by('deep-sleep');
  if (hour >= 19) return by('fire-evening');
  if (hour >= 17) return by('night-focus');
  if (hour < 11) return by('forest-morning');
  return by('rainy-coffee');
}

/** Odak oturumu için müzik: kendi kombon varsa o, yoksa Moka'nın seçimi. Zaten bir şey çalıyorsa dokunmaz; başlattıysa true. */
export function startFocusMusic(feel?: string | null) {
  if (!ambientAvailable() || active.length) return false;
  playCombo(getCustom() ?? suggestCombo(feel));
  return active.length > 0;
}
