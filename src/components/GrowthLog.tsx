import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useToast } from '@/components/Toast';
import { Btn, Chip, Field, SecHead, T } from '@/components/ui';
import { bookPct, kindEmoji, openBooks, watchProgress } from '@/domain/growth';
import type { Watch } from '@/domain/types';
import { useGrow, useReadLog } from '@/hooks/useGrow';
import { useStore } from '@/store/AppStore';

/** Bir izleme öğesinin ilerleme düğmeleri: dizide bölüm / sezon, diğerlerinde kaldığın yer yüzdesi. */
export function WatchProgress({ id }: { id: string }) {
  const { state: S, update } = useStore();
  const toast = useToast();
  const grow = useGrow();
  const w = S.play.growth.watch.find(x => x.id === id);
  if (!w) return null;
  const tick = (patch: (x: Watch) => void, label: string) =>
    grow('izle-ilerleme', `${kindEmoji(w.kind)} ${w.title} · ${label}`, 'İzleme', 1, D => {
      const x = D.play.growth.watch.find(y => y.id === id);
      if (x) patch(x);
    });
  const prog = watchProgress(w);
  return (
    <View style={{ gap: 6 }}>
      {!!prog && <T v="small">📍 {prog}</T>}
      {w.kind === 'dizi' ? (
        <View style={st.wrap}>
          <Btn small label="+1 bölüm" onPress={() => tick(x => { x.season ??= 1; x.ep = (x.ep ?? 0) + 1; }, `Bölüm ${(w.ep ?? 0) + 1}`)} />
          <Btn small label="Yeni sezon" onPress={() => { update(D => { const x = D.play.growth.watch.find(y => y.id === id); if (x) { x.season = (x.season ?? 1) + 1; x.ep = 0; } }); toast('Yeni sezon başladı 📺'); }} />
        </View>
      ) : (
        <View style={st.wrap}>
          {[25, 50, 75].map(p => <Chip key={p} label={`%${p}`} on={w.pct === p} onPress={() => tick(x => void (x.pct = p), `%${p}`)} />)}
        </View>
      )}
    </View>
  );
}

/**
 * Pomodoro bitince "ne okudun / izledin?": okumada kitap + sayfa (dakika hedefe sayılır),
 * izlemede liste öğesi + bölüm ya da yüzde.
 */
export function GrowthLog({ mode, minutes, onDone }: { mode: 'oku' | 'izle'; minutes: number; onDone: () => void }) {
  const { state: S } = useStore();
  const G = S.play.growth;
  const readLog = useReadLog();
  const books = openBooks(G);
  const todo = G.watch.filter(w => !w.seen);
  const [bookId, setBookId] = useState<string | null>(books[0]?.id ?? null);
  const [pages, setPages] = useState('');
  const [wid, setWid] = useState<string | null>(todo[0]?.id ?? null);

  if (mode === 'oku') {
    const book = books.find(b => b.id === bookId);
    return (
      <View style={{ gap: 10 }}>
        <SecHead title="Ne okudun? 📖" h="h3" right={`${minutes} dk`} />
        {books.length > 0 && (
          <View style={st.wrap}>
            {books.slice(0, 5).map(b => <Chip key={b.id} label={b.title.length > 18 ? `${b.title.slice(0, 17)}…` : b.title} on={bookId === b.id} onPress={() => setBookId(b.id)} />)}
            <Chip label="Başka" on={!bookId} onPress={() => setBookId(null)} />
          </View>
        )}
        {bookId && <Field value={pages} onChangeText={setPages} keyboardType="number-pad" placeholder="Kaç sayfa okudun? (isteğe bağlı)" maxLength={4} />}
        {book && <T v="tiny">%{bookPct(book)} · {book.read}/{book.pages} sayfa</T>}
        <Btn kind="primary" label="Kaydet" block onPress={() => { readLog(minutes, Math.max(0, Math.min(2000, parseInt(pages, 10) || 0)), bookId); onDone(); }} />
        <Btn label="Şimdi değil" block onPress={onDone} />
      </View>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      <SecHead title="Ne izledin? 🎬" h="h3" right={`${minutes} dk`} />
      {todo.length === 0 && <T v="small">İzleme listen boş. Kendini geliştir ekranından ekleyebilirsin.</T>}
      <View style={st.wrap}>{todo.slice(0, 6).map(w => <Chip key={w.id} label={`${kindEmoji(w.kind)} ${w.title.length > 16 ? `${w.title.slice(0, 15)}…` : w.title}`} on={wid === w.id} onPress={() => setWid(w.id)} />)}</View>
      {wid && <WatchProgress id={wid} />}
      <Btn kind="primary" label="Tamam" block onPress={onDone} />
    </View>
  );
}

const st = StyleSheet.create({ wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
