import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { WatchProgress } from '@/components/GrowthLog';
import { MokaMascot } from '@/components/MokaMascot';
import { Appear, Squish, useReduceMotion } from '@/components/motion';
import { PremiumLock } from '@/components/PremiumLock';
import { useToast } from '@/components/Toast';
import { Ring, WeekBars } from '@/components/charts';
import { BackLink, Bar, Btn, Card, Chip, EmptyMsg, Field, Screen, SecHead, T, Tabs, XBtn } from '@/components/ui';
import {
  BADGES, bookPct, ensurePick, GOALS, gKey, goalMet, goalPct, growthTitle, kindEmoji, learnOf, lessonOf, markLearn,
  monthLine, monthRows, openBooks, readMin, readStreak, reshuffle, saveSuggestion, shufflesLeft, suggestionById, WATCH_KINDS, wordOf,
} from '@/domain/growth';
import { uid } from '@/domain/logic';
import { answered, checkinOf } from '@/domain/mood';
import { limits } from '@/domain/premium';
import type { WatchKind } from '@/domain/types';
import { useGrow, useReadLog } from '@/hooks/useGrow';
import { useNow } from '@/hooks/useNow';
import { usePersona } from '@/profile/usePersona';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import { radius, useColors } from '@/theme';

type Tab = 'bugun' | 'kitap' | 'izle' | 'ogren' | 'ozet';
const MINS = [5, 10, 15, 30];

/**
 * Kendini geliştir: Moka'nın günlük önerisi, okuma hedefi, kitaplık, izleme listesi, kelime / mini ders / nefes
 * ve aylık özet. Veri `Play.growth` içinde (src/domain/growth.ts). Puan `gorev:buyume:*` olarak günde bir kez.
 */
export default function Buyume() {
  const [tab, setTab] = useState<Tab>('bugun');
  const { state: S } = useStore();
  const G = S.play.growth;
  return (
    <Screen header={false} tone="sky">
      <BackLink />
      <T v="h1">Kendini geliştir 🌱</T>
      <T v="small">{growthTitle(G) ?? 'Her gün küçük bir adım. Moka yanında.'}</T>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { k: 'bugun', emoji: '✨', label: 'Bugün' },
          { k: 'kitap', emoji: '📚', label: 'Kitaplık' },
          { k: 'izle', emoji: '🎬', label: 'İzleme' },
          { k: 'ogren', emoji: '🧠', label: 'Öğren' },
          { k: 'ozet', emoji: '📊', label: 'Özet' },
        ]}
      />
      {tab === 'bugun' && <TodayTab />}
      {tab === 'kitap' && <BooksTab />}
      {tab === 'izle' && <WatchTab />}
      {tab === 'ogren' && <LearnTab />}
      {tab === 'ozet' && <SummaryTab />}
    </Screen>
  );
}

/* ---------- Bugün ---------- */

function TodayTab() {
  const c = useColors();
  const now = useNow();
  const toast = useToast();
  const { state: S, update } = useStore();
  const { premium } = usePurchases();
  const { persona } = usePersona();
  const G = S.play.growth;
  const day = gKey(now);
  const ci = checkinOf(S.play, now);
  const feel = answered(ci) ? ci.feel : null;
  const lim = limits(premium.active);

  // Bugünün önerisi ilk bakışta seçilir ve saklanır.
  const pick = G.pick && G.pick.day === day && suggestionById(G.pick.id) ? G.pick : null;
  useEffect(() => {
    if (!pick) update(D => void ensurePick(D.play.growth, persona, feel, day));
  }, [pick, update, persona, feel, day]);
  const sug = pick ? suggestionById(pick.id) : null;
  const more = shufflesLeft(G, lim.picks, day);

  const [min, setMin] = useState(15);
  const [bookId, setBookId] = useState<string | null>(null);
  const [pages, setPages] = useState('');
  const books = openBooks(G);
  const mins = readMin(G, day);
  const pct = goalPct(G, day);
  const streak = readStreak(G, now);

  const readLog = useReadLog();
  const log = () => {
    readLog(min, Math.max(0, Math.min(2000, parseInt(pages, 10) || 0)), bookId);
    setPages('');
  };

  return (
    <>
      <Appear index={1}>
        <Card>
          <View style={st.row}>
            <MokaMascot pose="reading" size="sm" showBubble={false} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <T v="tiny">MOKA BUGÜN SANA ÖNERİYOR</T>
              {sug ? (
                <>
                  <T v="h3">{kindEmoji(sug.kind)} {sug.title}</T>
                  <T v="small">{sug.by}{sug.pages ? ` · ${sug.pages} sayfa` : ''}</T>
                </>
              ) : (
                <T v="small">Bir saniye…</T>
              )}
            </View>
          </View>
          {sug && <T v="small">{sug.why}</T>}
          {sug && (
            <View style={st.wrap}>
              <Btn
                kind="primary"
                small
                label={pick?.saved ? '✓ Listende' : sug.kind === 'kitap' ? 'Kitaplığıma ekle' : 'Listeme ekle'}
                onPress={() => {
                  if (pick?.saved) return;
                  update(D => void saveSuggestion(D.play.growth, sug, uid()));
                  toast(sug.kind === 'kitap' ? 'Kitaplığa eklendi 📚' : 'İzleme listene eklendi 🎬');
                }}
              />
              <Btn
                small
                label={more ? `Başka öner (${more})` : 'Yarın yeni öneri'}
                onPress={() => {
                  if (!more) {
                    toast(premium.active ? 'Bugünlük bu kadar, yarın yenisi var 🌙' : 'Daha fazla öneri Premium’da ⭐');
                    return;
                  }
                  update(D => reshuffle(D.play.growth, persona, feel, day));
                }}
              />
            </View>
          )}
          {!premium.active && !more && <T v="tiny">Premium ile günde {limits(true).picks} kez başka öneri isteyebilirsin ⭐</T>}
        </Card>
      </Appear>

      <Appear index={2}>
        <Card>
          <SecHead title="Günlük okuma hedefi" h="h3" right={streak ? `🔥 ${streak} gün` : undefined} />
          <View style={st.row}>
            <Ring pct={pct} size={92} color={c.sage} label="hedef" />
            <View style={{ flex: 1, gap: 6 }}>
              <T v="bold">{mins} / {G.goalMin} dk</T>
              <T v="small">{goalMet(G, day) ? 'Hedefi tuttun, ev bugün de büyüdü 🌷' : `${G.goalMin - mins} dakika kaldı. Hedef serine ve evine sayılır.`}</T>
            </View>
          </View>
          <View style={st.wrap}>{GOALS.map(g => <Chip key={g} label={`${g} dk`} on={G.goalMin === g} onPress={() => update(D => void (D.play.growth.goalMin = g))} />)}</View>
        </Card>
      </Appear>

      <Appear index={3}>
        <Card>
          <SecHead title="Okudum" h="h3" />
          {books.length > 0 && (
            <View style={st.wrap}>
              <Chip label="📖 Kitap seçme" on={!bookId} onPress={() => setBookId(null)} />
              {books.slice(0, 4).map(b => <Chip key={b.id} label={b.title.length > 18 ? `${b.title.slice(0, 17)}…` : b.title} on={bookId === b.id} onPress={() => setBookId(b.id)} />)}
            </View>
          )}
          <View style={st.wrap}>{MINS.map(m => <Chip key={m} label={`${m} dk`} on={min === m} onPress={() => setMin(m)} />)}</View>
          {bookId && <Field value={pages} onChangeText={setPages} keyboardType="number-pad" placeholder="Kaç sayfa okudun? (isteğe bağlı)" maxLength={4} />}
          <Btn kind="primary" label={`Kaydet · ${min} dk`} block onPress={log} />
          {books.length === 0 && <T v="tiny">Kitaplık sekmesinden bir kitap eklersen sayfaların da takip edilir.</T>}
        </Card>
      </Appear>
    </>
  );
}

/* ---------- Kitaplık ---------- */

function BooksTab() {
  const c = useColors();
  const toast = useToast();
  const { state: S, update } = useStore();
  const grow = useGrow();
  const G = S.play.growth;
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [pages, setPages] = useState('');
  const reading = G.books.filter(b => !b.done);
  const done = G.books.filter(b => b.done);

  const add = () => {
    const t = title.trim();
    if (!t) return;
    update(D => void D.play.growth.books.unshift({ id: uid(), title: t.slice(0, 80), author: author.trim().slice(0, 60), pages: Math.max(1, Math.min(5000, parseInt(pages, 10) || 200)), read: 0, added: Date.now(), done: null }));
    setTitle(''); setAuthor(''); setPages('');
    toast('Kitaplığa eklendi 📚');
  };
  const finish = (id: string) => {
    const b = G.books.find(x => x.id === id);
    if (!b) return;
    grow(`kitap:${id}`, `📖 ${b.title} bitti`, 'Kitap', 5, D => {
      const x = D.play.growth.books.find(y => y.id === id);
      if (x) { x.read = x.pages; x.done = gKey(); }
    });
  };

  return (
    <>
      <Card>
        <SecHead title="Kitap ekle" h="h3" />
        <Field value={title} onChangeText={setTitle} placeholder="Kitabın adı" maxLength={80} />
        <Field value={author} onChangeText={setAuthor} placeholder="Yazar (isteğe bağlı)" maxLength={60} />
        <Field value={pages} onChangeText={setPages} keyboardType="number-pad" placeholder="Sayfa sayısı (varsayılan 200)" maxLength={4} />
        <Btn kind="primary" label="Ekle" block onPress={add} />
      </Card>
      {reading.length === 0 && done.length === 0 && <EmptyMsg pose="reading">Henüz kitap yok. Bugünkü öneriden ya da yukarıdan ekleyebilirsin.</EmptyMsg>}
      {reading.map((b, i) => (
        <Appear key={b.id} index={i}>
          <Card>
            <View style={st.row}>
              <T style={{ fontSize: 30 }}>📖</T>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T v="bold" numberOfLines={2}>{b.title}</T>
                {!!b.author && <T v="tiny">{b.author}</T>}
              </View>
              <XBtn label="Sil" onPress={() => update(D => void (D.play.growth.books = D.play.growth.books.filter(x => x.id !== b.id)))} />
            </View>
            <Bar value={b.read / Math.max(1, b.pages)} />
            <T v="tiny">%{bookPct(b)} · {b.read} / {b.pages} sayfa{b.read ? ` · kaldığın yer: s. ${b.read}` : ''}</T>
            <View style={st.wrap}>
              {[10, 25, 50].map(n => (
                <Chip key={n} label={`+${n} sayfa`} on={false} onPress={() => (b.read + n >= b.pages ? finish(b.id) : update(D => { const x = D.play.growth.books.find(y => y.id === b.id); if (x) x.read = Math.min(x.pages, x.read + n); }))} />
              ))}
            </View>
            <Btn small label="Bitirdim 🎉" onPress={() => finish(b.id)} style={{ alignSelf: 'flex-start' }} />
          </Card>
        </Appear>
      ))}
      {done.length > 0 && (
        <Card>
          <SecHead title="Bitirdiklerin" h="h3" right={`${done.length} kitap`} />
          {done.map(b => (
            <View key={b.id} style={[st.row, { gap: 8 }]}>
              <T style={{ fontSize: 20 }}>✅</T>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T v="bold" numberOfLines={1}>{b.title}</T>
                <T v="tiny" style={{ color: c.muted }}>{b.done}</T>
              </View>
            </View>
          ))}
        </Card>
      )}
    </>
  );
}

/* ---------- İzleme ---------- */

function WatchTab() {
  const toast = useToast();
  const { state: S, update } = useStore();
  const grow = useGrow();
  const G = S.play.growth;
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<WatchKind>('film');
  const [open, setOpen] = useState<string | null>(null);
  const [rating, setRating] = useState(4);
  const [note, setNote] = useState('');
  const todo = G.watch.filter(w => !w.seen);
  const seen = G.watch.filter(w => w.seen);

  const add = () => {
    const t = title.trim();
    if (!t) return;
    update(D => void D.play.growth.watch.unshift({ id: uid(), title: t.slice(0, 80), kind, added: Date.now(), seen: null }));
    setTitle('');
    toast('Listene eklendi 🎬');
  };
  const markSeen = (id: string) => {
    const w = G.watch.find(x => x.id === id);
    if (!w) return;
    grow(`izle:${id}`, `${kindEmoji(w.kind)} ${w.title}`, 'İzleme', 2, D => {
      const x = D.play.growth.watch.find(y => y.id === id);
      if (x) { x.seen = gKey(); x.rating = rating; x.note = note.trim().slice(0, 200) || undefined; }
    });
    setOpen(null); setNote(''); setRating(4);
  };

  return (
    <>
      <Card>
        <SecHead title="Listeye ekle" h="h3" />
        <Field value={title} onChangeText={setTitle} placeholder="Film, dizi, belgesel ya da podcast adı" maxLength={80} />
        <View style={st.wrap}>{WATCH_KINDS.map(k => <Chip key={k.id} label={`${k.emoji} ${k.name}`} on={kind === k.id} onPress={() => setKind(k.id)} />)}</View>
        <Btn kind="primary" label="Ekle" block onPress={add} />
      </Card>
      {todo.length === 0 && seen.length === 0 && <EmptyMsg pose="happy">Liste boş. Moka’nın önerisinden ya da yukarıdan ekleyebilirsin.</EmptyMsg>}
      {todo.map((w, i) => (
        <Appear key={w.id} index={i}>
          <Card>
            <View style={st.row}>
              <T style={{ fontSize: 28 }}>{kindEmoji(w.kind)}</T>
              <T v="bold" style={{ flex: 1 }} numberOfLines={2}>{w.title}</T>
              <XBtn label="Sil" onPress={() => update(D => void (D.play.growth.watch = D.play.growth.watch.filter(x => x.id !== w.id)))} />
            </View>
            {open !== w.id && <WatchProgress id={w.id} />}
            {open === w.id ? (
              <>
                <View style={st.wrap}>{[1, 2, 3, 4, 5].map(n => <Chip key={n} label={'⭐'.repeat(n)} on={rating === n} onPress={() => setRating(n)} />)}</View>
                <Field value={note} onChangeText={setNote} placeholder="Kısa bir not (isteğe bağlı)" maxLength={200} multiline />
                <Btn kind="primary" small label="Kaydet" onPress={() => markSeen(w.id)} style={{ alignSelf: 'flex-start' }} />
              </>
            ) : (
              <Btn small label="İzledim ✓" onPress={() => { setOpen(w.id); setNote(''); setRating(4); }} style={{ alignSelf: 'flex-start' }} />
            )}
          </Card>
        </Appear>
      ))}
      {seen.length > 0 && (
        <Card>
          <SecHead title="İzlediklerin" h="h3" right={`${seen.length}`} />
          {seen.map(w => (
            <View key={w.id} style={{ gap: 2 }}>
              <T v="bold">{kindEmoji(w.kind)} {w.title} {w.rating ? '⭐'.repeat(w.rating) : ''}</T>
              {!!w.note && <T v="small">“{w.note}”</T>}
            </View>
          ))}
        </Card>
      )}
    </>
  );
}

/* ---------- Öğren ---------- */

function LearnTab() {
  const now = useNow();
  const { state: S } = useStore();
  const grow = useGrow();
  const G = S.play.growth;
  const day = gKey(now);
  const L = learnOf(G, day);
  const w = wordOf(day);
  const lesson = lessonOf(day);
  const [step, setStep] = useState(0);
  return (
    <>
      <Card>
        <SecHead title="Günün kelimesi" h="h3" right="🇬🇧" />
        <T v="h2">{w.w}</T>
        <T v="bold">{w.tr}</T>
        <T v="small">“{w.ex}”</T>
        <Btn
          small
          kind={L.word ? 'soft' : 'primary'}
          label={L.word ? '✓ Öğrendin' : 'Öğrendim'}
          onPress={() => !L.word && grow('kelime', `🇬🇧 ${w.w}`, 'Kelime', 1, D => markLearn(D.play.growth, day, { word: true }))}
          style={{ alignSelf: 'flex-start' }}
        />
      </Card>

      <Card>
        <SecHead title="5 dakikalık mini ders" h="h3" />
        <T v="h3">{lesson.emoji} {lesson.title}</T>
        {lesson.steps.map((s, i) => (
          <T key={i} v="body" style={{ opacity: i <= step || L.lesson ? 1 : 0.25 }}>{i + 1}. {s}</T>
        ))}
        {(step >= lesson.steps.length - 1 || L.lesson) && <T v="small">👉 {lesson.try}</T>}
        {L.lesson ? (
          <T v="bold">✓ Bugünkü dersi tamamladın</T>
        ) : step < lesson.steps.length - 1 ? (
          <Btn small label="Sonraki adım" onPress={() => setStep(step + 1)} style={{ alignSelf: 'flex-start' }} />
        ) : (
          <Btn small kind="primary" label="Tamamladım" onPress={() => grow('ders', `${lesson.emoji} ${lesson.title}`, 'Mini ders', 2, D => markLearn(D.play.growth, day, { lesson: lesson.id }))} style={{ alignSelf: 'flex-start' }} />
        )}
      </Card>

      <BreathCard done={L.breath ?? 0} />
    </>
  );
}

/** Nefes egzersizi: 4 sn al, 6 sn ver. Süre bitince günde bir kez puan. Ses ve yeni paket yok. */
function BreathCard({ done }: { done: number }) {
  const c = useColors();
  const now0 = useNow();
  const day = gKey(now0);
  const grow = useGrow();
  const reduce = useReduceMotion();
  const [min, setMin] = useState(1);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [scale] = useState(() => new Animated.Value(0.6));
  const fin = useRef(false);

  useEffect(() => {
    if (!endsAt) return;
    fin.current = false;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= endsAt && !fin.current) {
        fin.current = true;
        setEndsAt(null);
        grow('nefes', '🧘 Nefes egzersizi', 'Nefes', 1, D => markLearn(D.play.growth, day, { breath: min }), 'saglik');
      }
    }, 250);
    return () => clearInterval(t);
  }, [endsAt]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!endsAt || reduce) { scale.setValue(0.6); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.6, duration: 6000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [endsAt, reduce, scale]);

  const left = endsAt ? Math.max(0, endsAt - now) : min * 60000;
  const phase = endsAt ? ((now - (endsAt - min * 60000)) % 10000) < 4000 ? 'Nefes al' : 'Yavaşça ver' : 'Hazır mısın?';
  const mm = Math.floor(left / 60000);
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
  return (
    <Card>
      <SecHead title="Nefes ve sakinlik" h="h3" right={done ? '✓ bugün yaptın' : undefined} />
      <View style={{ alignItems: 'center', gap: 10, minHeight: 170, justifyContent: 'center' }}>
        <Animated.View style={[st.orb, { backgroundColor: c.sageSoft, transform: [{ scale }] }]} />
        <T v="h3">{phase}</T>
        <T v="bold">{mm}:{ss}</T>
      </View>
      {!endsAt ? (
        <>
          <View style={st.wrap}>{[1, 3, 5].map(m => <Chip key={m} label={`${m} dk`} on={min === m} onPress={() => setMin(m)} />)}</View>
          <Btn kind="primary" label="Başla" block onPress={() => { const n = Date.now(); setNow(n); setEndsAt(n + min * 60000); }} />
        </>
      ) : (
        <Btn label="Bitir" block onPress={() => setEndsAt(null)} />
      )}
    </Card>
  );
}

/* ---------- Özet ---------- */

function SummaryTab() {
  const c = useColors();
  const now = useNow();
  const { state: S } = useStore();
  const { premium } = usePurchases();
  const G = S.play.growth;
  const rows = monthRows(G, now, 6);
  const cur = rows[rows.length - 1];
  const bars = rows.map((r, i) => ({ key: r.key, label: r.label, n: r.readMin, today: i === rows.length - 1 }));
  const earned = BADGES.filter(b => G.badges[b.id]).length;
  return (
    <>
      <Card>
        <SecHead title="Bu ay" h="h3" right={cur.label} />
        <View style={st.stats}>
          <Stat n={cur.readMin} label="dk okuma" />
          <Stat n={cur.books} label="kitap" />
          <Stat n={cur.watched} label="izlenen" />
          <Stat n={cur.learned} label="öğrenilen" />
        </View>
        <T v="small">{monthLine(cur)}</T>
        <T v="tiny">🎯 Hedefi tuttuğun gün: {cur.goalDays} · 🧘 Nefes günü: {cur.breath}</T>
      </Card>

      {premium.active ? (
        <Card>
          <SecHead title="Aylık okuma (dakika)" h="h3" right="6 ay" />
          <WeekBars bars={bars} />
          <T v="tiny">{rows.reduce((a, r) => a + r.pages, 0)} sayfa · {rows.reduce((a, r) => a + r.books, 0)} kitap son 6 ayda</T>
        </Card>
      ) : (
        <PremiumLock title="6 aylık gelişim grafiği" text="Her ay ne kadar okuduğunu, kaç kitap bitirdiğini ve neler öğrendiğini grafikte gör." emoji="📊" />
      )}

      <Card>
        <SecHead title="Moka rozetleri" h="h3" right={`${earned}/${BADGES.length}`} />
        <View style={st.wrap}>
          {BADGES.map(b => {
            const on = !!G.badges[b.id];
            return (
              <Squish key={b.id} accessibilityLabel={`${b.name}: ${b.hint}`} style={[st.badge, { backgroundColor: on ? c.sageSoft : c.surface2, opacity: on ? 1 : 0.55 }]}>
                <T style={{ fontSize: 28 }}>{on ? b.emoji : '🔒'}</T>
                <T v="tiny" style={{ textAlign: 'center' }} numberOfLines={2}>{on ? b.name : b.hint}</T>
              </Squish>
            );
          })}
        </View>
      </Card>
    </>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <T v="h2">{n}</T>
      <T v="tiny">{label}</T>
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stats: { flexDirection: 'row', gap: 4 },
  orb: { width: 120, height: 120, borderRadius: 60 },
  badge: { width: 88, borderRadius: radius.tile, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', gap: 4 },
});
