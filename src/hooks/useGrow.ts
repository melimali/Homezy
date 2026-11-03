import { useToast } from '@/components/Toast';
import { addRead, gKey, goalMet, grantBadges, readMin } from '@/domain/growth';
import { addXp } from '@/domain/mokaLevel';
import type { AppState, MokaStat } from '@/domain/types';
import { usePlay } from '@/play/usePlay';
import { useStore } from '@/store/AppStore';

/** Puan veren bir gelişim adımı: günde bir kez, Zeka (ya da Sağlık) exp'si ve rozet kontrolüyle. */
export function useGrow() {
  const toast = useToast();
  const { award } = usePlay();
  return (ref: string, label: string, what: string, xp: number, mutate?: (D: AppState) => void, stat: MokaStat = 'zeka') => {
    let fresh: string[] = [];
    award('gorev', `buyume:${ref}`, label, what, D => {
      mutate?.(D);
      addXp(D.play, stat, xp);
      fresh = grantBadges(D.play.growth).map(b => `${b.emoji} ${b.name}`);
    });
    if (fresh.length) setTimeout(() => toast(`Yeni Moka rozeti: ${fresh.join(', ')}!`), 1900);
  };
}

/** Okuma kaydı: dakika, (varsa) sayfa ve kitap. Hedef tutarsa ya da kitap biterse puan verir. */
export function useReadLog() {
  const toast = useToast();
  const { state: S, update } = useStore();
  const grow = useGrow();
  return (min: number, p: number, bookId: string | null, now = Date.now()) => {
    const G = S.play.growth;
    const day = gKey(now);
    const book = bookId ? G.books.find(b => b.id === bookId) : undefined;
    const willMeet = !goalMet(G, day) && readMin(G, day) + min >= G.goalMin;
    const willFinish = !!book && !book.done && p > 0 && book.read + p >= book.pages;
    let done = false;
    const run = (D: AppState) => {
      if (done) return;
      done = true;
      addRead(D.play.growth, { min, pages: p, book: bookId });
    };
    if (willFinish && book) {
      grow(`kitap:${book.id}`, `📖 ${book.title} bitti`, 'Kitap', 5, run);
      if (willMeet) grow('okuma', `📖 ${G.goalMin} dk okuma`, 'Okuma hedefi', 3);
    } else if (willMeet) {
      grow('okuma', `📖 ${G.goalMin} dk okuma`, 'Okuma hedefi', 3, run);
    } else {
      update(run);
      toast(`+${min} dk okuma kaydedildi 📖`);
    }
  };
}
