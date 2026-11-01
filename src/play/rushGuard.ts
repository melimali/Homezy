/**
 * Hızlı tamamlama uyarısı: kısa sürede çok iş "yaptım" denirse Moka nazikçe sorar.
 * Oturum başına bir kez sorar; geri alınanlar için puan da geri çekilir.
 */
export const RUSH_COUNT = 5;
export const RUSH_WINDOW = 3 * 60 * 1000;
export const RUSH_COOLDOWN = 30 * 60 * 1000;

type Entry = { at: number; undo: () => void };

let recent: Entry[] = [];
let lastAsk = 0;

/** Bir iş tamamlandı. Uyarı gerekiyorsa son hızlı işleri geri alacak fonksiyonu döner. */
export function noteDone(undo: () => void, now = Date.now()): (() => void) | null {
  recent = recent.filter(e => now - e.at <= RUSH_WINDOW);
  recent.push({ at: now, undo });
  if (recent.length < RUSH_COUNT || (lastAsk && now - lastAsk < RUSH_COOLDOWN)) return null;
  lastAsk = now;
  const batch = recent;
  recent = [];
  return () => batch.reverse().forEach(e => e.undo());
}
