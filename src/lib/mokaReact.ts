/** Moka'ya dışarıdan tepki verdirme: iş bitti (jump), seri kırıldı (hug), seviye atlandı (confetti). */
export type MokaReaction = 'jump' | 'hug' | 'confetti';

const subs = new Set<(r: MokaReaction) => void>();

export function reactMoka(r: MokaReaction) {
  subs.forEach(f => f(r));
}

export function onMokaReact(f: (r: MokaReaction) => void) {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
}
