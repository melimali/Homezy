import { useRouter } from '@/lib/nav';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Animated, Easing, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { CoffeeSheet, PotIcon } from '@/components/CoffeeSheet';
import { RoomMoka } from '@/components/RoomMoka';
import { Fade } from '@/components/SceneImage';
import { ISIK } from '@/constants/oda';
import { longestStreak } from '@/domain/achievements';
import { potState, potSteam } from '@/domain/coffee';
import { dayKey, freezesUsed, progressOf } from '@/domain/play';
import { useNow } from '@/hooks/useNow';
import { prefs } from '@/lib/supabase';
import { useTilt } from '@/hooks/useTilt';
import { odaMap, RoomBackdrop, type RoomTouch } from '@/components/RoomBackdrop';
import { AddSheet } from '@/components/TabBar';
import { Appear, Burst, Squish, useReduceMotion } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { Btn, Chevron, T } from '@/components/ui';
import type { Href } from 'expo-router';
import { mimikOf } from '@/constants/mimik';
import { CHAT_ACCOUNT_NEEDED, CHAT_PREMIUM_INTRO, CHAT_PREMIUM_NUDGE } from '@/domain/chatGate';
import { applyChatAction, chatCtx, describeAction, needsConfirm, noteDayLabel, type ChatAction, type ChatMsg } from '@/domain/chat';
import type { AppState } from '@/domain/types';
import { limits } from '@/domain/premium';
import { SUPPORT_EMAIL, openLink } from '@/lib/links';
import { cannedReply } from '@/domain/chatCanned';
import { askMoka } from '@/lib/mokaChat';
import { getUiLang, tx } from '@/i18n/runtime';
import { haptic, sfx } from '@/lib/sfx';
import { allTasks } from '@/domain/logic';
import { line, openingLine, windowLine } from '@/domain/mokaLines';
import { nightMix, roomState } from '@/lib/roomState';
import { useSky } from '@/lib/weather';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { fonts, radius, useColors } from '@/theme';
import { appAlert } from '@/components/AppAlert';

type Item = ChatMsg & {
  id: number;
  done?: string[];
  error?: boolean;
  cta?: 'premium' | 'login';
  /** Yapılanları geri alan işlevler (taslak state üzerinde) ve geri alındı mı. */
  undo?: ((D: AppState) => void)[];
  undone?: boolean;
  /** Onay bekleyen silme eylemleri ve sonucu. */
  confirm?: ChatAction[];
  confirmed?: 'yes' | 'no';
};

/** Moka'nın oturduğu yer: yastığın üst yüzeyinin ortası (852×1846 oda resmi). */
const SEAT = { x: 400, y: 1330 };

/** Cevap yazılma süresi (ms): kısa cevap hızlı, uzun cevap en çok 3,5 sn. Moka'nın ağzı bu sürece göre oynar. */
const typeMs = (len: number) => Math.min(3500, 500 + len * 22);
/** Bu oturumda yeni gelen, henüz harf harf yazılmamış cevaplar. */
const fresh = new Set<number>();

const HELLO: Item = {
  id: 0,
  role: 'assistant',
  content: 'Merhaba, ben Moka ☕ Bana iş ekletebilir, not aldırabilir ya da sadece sohbet edebilirsin.',
};
/** Yazma çubuğuna dokununca çıkan 3 fikir: duruma göre (geciken iş, sabah, alışveriş listesi). */
function pickIdeas(late: number, shopEmpty: boolean, hour: number): string[] {
  const out: string[] = [];
  if (late > 0) out.push('Geciken işlere bir bakalım');
  out.push(hour < 14 ? 'Bugün ne yapmalıyım?' : 'Evi toparlamak için küçük bir adım öner');
  if (shopEmpty) out.push('Alışveriş listesine süt ve ekmek ekle');
  for (const x of IDEAS) if (out.length < 3 && !out.includes(x)) out.push(x);
  return out.slice(0, 3);
}
const IDEAS = ['Alışveriş listesine süt ve ekmek ekle', 'Bugün 2 bardak su içtim', 'Salona cam silmeyi ekle', 'Yarın için not al: kombi bakımı', 'Bugün ne yapmalıyım?', '25 dk ders çalışalım', 'Bugün günlük yazmak istiyorum', 'Biraz hareket edelim mi?', 'Dışarı çıkmaya ne dersin?', 'Evi toparlamak için küçük bir adım öner'];

/** Oturum boyunca konuşma kalır; kapatınca silinir (mesajlar telefonda saklanmaz). */
let memory: Item[] = [HELLO];
let nextId = 1;
const resetMemory = () => (memory = [HELLO]);
/** Premium olmayan kullanıcı bu oturumda kaç mesaj yazdı (ilk mesaja uzun tanıtım, sonrakilere kısa yönlendirme). */
let freeAsked = 0;
let cannedN = 0;
/** Bugün "hepsi bitti" kutlaması gösterildi mi (oturumda bir kez). */
let celebrated = '';
const INTRO_LINE = { tap: 'introTap', hello: 'introHello', pot: 'introPot' } as const;
/** Sürahinin bugün fokurdadığı gün (günde bir kez). */
const BREW_KEY = 'mokaPotBrew';
/** "Serin artık benim kahvem" bir kez söylendi mi. */
const EXPLAIN_KEY = 'mokaPotExplained';
const dayStamp = () => new Date().toDateString();
/** 0..n-1 arası rastgele sayı (çizim dışında, olay ve zamanlayıcılarda kullanılır). */
const rnd = (n: number) => Math.floor(Math.random() * n);

/** Moka ile sohbet: tatlı bir muhabbet ve uygulamayı kontrol eden bir yapay zekâ (Haiku). Sunucuda çalışır, alan dışına çıkmaz. */
export default function MokaChat() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { state: S, update, get } = useStore();
  const { premium } = usePurchases();
  const { status } = useAuth();
  const [items, setItems] = useState<Item[]>(memory);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState<{ day: number; month: number } | null>(null);
  const [notes, setNotes] = useState(false);
  const { width: winW } = useWindowDimensions();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  // Ekrandan çıkınca bekleyen gecikmeli işlemler (yönlendirme, balon ekleme) iptal edilir.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => void timers.current.push(setTimeout(fn, ms));
  const [kb, setKb] = useState(false);
  useEffect(() => {
    const sh = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKb(true));
    const hd = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(false));
    return () => { sh.remove(); hd.remove(); };
  }, []);
  const [addOpen, setAddOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [echo, setEcho] = useState('');
  const { height: winH } = useWindowDimensions();
  // Son cevabın tonu mimiği belirler; cevap gelince ve yazılırken ağzı oynar.
  const last = [...items].reverse().find(i => i.role === 'assistant' && !i.error);
  const reduce = useReduceMotion();
  const lastMood = last && last.id !== 0 ? mimikOf(last.content) : 'happy';
  // Cevap beklerken kullanıcının son mesajı üzgünse Moka da üzgün dinler.
  const mine = [...items].reverse().find(i => i.role === 'user');
  const mood = busy && mine && mimikOf(mine.content) === 'sad' ? 'sad' : lastMood;
  const [speaking, setSpeaking] = useState(false);
  const lastId = last?.id;
  useEffect(() => {
    if (!lastId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSpeaking(true);
    const t = setTimeout(() => setSpeaking(false), reduce || !fresh.has(lastId) ? 600 : typeMs(last?.content.length ?? 0));
    return () => clearTimeout(t);
  }, [lastId]); // eslint-disable-line react-hooks/exhaustive-deps

  const push = useCallback((fn: (prev: Item[]) => Item[]) => {
    setItems(prev => (memory = fn(prev)));
  }, []);

  useEffect(() => {
    if (items.length <= 1 && !busy) return;
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [items, busy]);

  const send = async (raw?: string) => {
    const msg = (raw ?? text).trim().slice(0, 600);
    if (!msg || busy) return;
    setText('');
    setQuip('');
    setLockMsg(null);
    setEcho(msg);
    setBump(b => b + 1);
    later(() => setEcho(''), 3000);
    const mine: Item = { id: nextId++, role: 'user', content: msg };
    const history = [...items.filter(i => !i.error), mine].slice(-6).map(({ role, content, done }) => ({
      role,
      content: done?.length ? `${content}\n[Uygulama bu işlemleri zaten yaptı: ${done.join(' | ')}]` : content,
    }));
    push(p => [...p, mine]);
    // Hesapsız kullanıcı: üyelik iste. Hesaplı ama Premium değil: hazır metin, yapay zekâ çağrılmaz.
    if (status !== 'account' || !premium.active) {
      const gate = status !== 'account'
        ? { content: tx(CHAT_ACCOUNT_NEEDED), cta: 'login' as const }
        : { content: tx(freeAsked++ === 0 ? CHAT_PREMIUM_INTRO : CHAT_PREMIUM_NUDGE), cta: 'premium' as const };
      sfx('tap');
      const gid = nextId++;
      fresh.add(gid);
      later(() => push(p => [...p, { id: gid, role: 'assistant', ...gate }]), 500);
      return;
    }
    const ctx = chatCtx(get());
    // Aynı mesaj art arda: model çağrılmaz.
    const prevUser = [...items].reverse().find(i => i.role === 'user');
    if (prevUser && prevUser.content.trim().toLowerCase() === msg.toLowerCase()) {
      sfx('tap');
      const rid2 = nextId++;
      fresh.add(rid2);
      later(() => push(p => [...p, { id: rid2, role: 'assistant', content: tx('Bunu az önce konuştuk ☕ Başka bir şey eklemek ister misin?') }]), 450);
      return;
    }
    // Selam / teşekkür / hoşça kal: hazır cevap, sunucu çağrılmaz, hak düşmez.
    const canned = cannedReply(msg, getUiLang(), ctx, cannedN++);
    if (canned) {
      sfx('tap');
      const cid = nextId++;
      fresh.add(cid);
      later(() => push(p => [...p, { id: cid, role: 'assistant', content: canned }]), 450);
      return;
    }
    setBusy(true);
    sfx('tap');
    const r = await askMoka(history, ctx);
    setBusy(false);
    if (!r.ok) {
      push(p => [...p, { id: nextId++, role: 'assistant', content: r.message, error: true, cta: r.account ? 'login' : r.premium ? 'premium' : undefined }]);
      return;
    }
    if (r.limit != null && r.mlimit != null) setLeft({ day: Math.max(0, r.limit - r.used), month: Math.max(0, r.mlimit - (r.mused ?? 0)) });
    // Sunucu doğruladı; telefon yine kendi verisine göre doğrulayıp uygular. Silme eylemleri onay bekler.
    const done: string[] = [];
    const undo: ((D: AppState) => void)[] = [];
    const confirm: ChatAction[] = [];
    const got: { focus?: { minutes: number; topic: string }; go?: string } = {};
    const mult = limits(premium.active).mult;
    update(D => {
      for (const a of r.actions.slice(0, 4) as ChatAction[]) {
        if (needsConfirm(a)) {
          confirm.push(a);
          continue;
        }
        const out = applyChatAction(D, a, Date.now(), mult);
        if (out.ok) {
          if (out.line) done.push(out.line);
          if (out.undo) undo.push(out.undo);
          if (out.focus) got.focus = out.focus;
          if (out.go) got.go = out.go;
        }
      }
    });
    if (done.length) sfx('done');
    const rid = nextId++;
    fresh.add(rid);
    push(p => [...p, { id: rid, role: 'assistant', content: r.reply, done, ...(undo.length ? { undo } : {}), ...(confirm.length ? { confirm } : {}) }]);
    const go = got.go;
    if (go) later(() => router.push(go as never), 700);
    const f = got.focus;
    if (f) {
      later(() => router.push({ pathname: '/odak', params: { min: String(f.minutes), topic: f.topic, auto: '1' } }), 900);
    }
  };

  const undoItem = (id: number) => {
    const it = items.find(i => i.id === id);
    if (!it?.undo || it.undone) return;
    update(D => void it.undo!.forEach(fn => fn(D)));
    push(p => p.map(i => (i.id === id ? { ...i, undone: true } : i)));
    toast('Geri aldım ↩️');
  };

  const confirmItem = (id: number, yes: boolean) => {
    const it = items.find(i => i.id === id);
    if (!it?.confirm || it.confirmed) return;
    const lines: string[] = [];
    if (yes) {
      update(D => {
        for (const a of it.confirm!) {
          const out = applyChatAction(D, a, Date.now(), 1);
          if (out.ok && out.line) lines.push(out.line);
        }
      });
      if (lines.length) sfx('done');
    }
    push(p => p.map(i => (i.id === id ? { ...i, confirmed: yes ? 'yes' : 'no', done: [...(i.done ?? []), ...lines] } : i)));
  };

  /** Google Play yapay zekâ içeriği kuralı: uygunsuz cevap uygulama içinden bildirilebilir. */
  const report = () => {
    const text = last && last.id !== 0 ? last.content : '';
    if (!text) return toast('Bildirilecek bir cevap yok.');
    appAlert('Cevabı bildir', 'Moka’nın son cevabı uygunsuz, yanlış ya da zararlı mıydı? Bize e-posta ile bildir; cevap metni mesaja eklenir.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Bildir', onPress: () => openLink(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Moka cevabı bildirimi')}&body=${encodeURIComponent(`Bildirdiğim cevap:\n\n${text}\n\nNeden:`)}`) },
    ]);
  };

  const clear = () => {
    setItems(resetMemory());
    toast('Sohbet temizlendi 🧹');
  };

  // Oda: Moka yastığın üstünde. Yazarken küçülüp yukarı çıkar.
  const D = c.den;
  const map = odaMap(winW, winH);
  const mokaSize = Math.round(Math.min(winW * 0.62, 300) * (kb ? 0.7 : 1));
  // Resmin altında %4 boşluk var: ayaklar yastığa bassın diye o kadar aşağı.
  const mokaBottom = (kb ? winH * 0.52 : map.oy + SEAT.y * map.s) + mokaSize * 0.04;
  const mokaLeft = kb ? (winW - mokaSize) / 2 : map.ox + SEAT.x * map.s - mokaSize / 2;
  const mokaTop = mokaBottom - mokaSize;
  const mokaCx = mokaLeft + mokaSize / 2;
  // Giriş: Moka alttaki tuştan yastığa uçar, balon biraz sonra belirir.
  const [enter] = useState(() => new Animated.Value(reduce ? 1 : 0));
  useEffect(() => {
    if (reduce) return;
    const a = Animated.spring(enter, { toValue: 1, friction: 7, tension: 55, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [reduce, enter]);
  // Oda gününü yansıtır, Moka boşta kendi hâlinde takılır.
  const room = roomState(S.play);
  const tilt = useTilt();
  const now = useNow();
  const day = useMemo(() => {
    const x = chatCtx(S);
    const refs = allTasks(S);
    const plantDue = refs.find(r => r.list === 'plants' && r.s.k !== 'ok')?.t.name ?? null;
    return { late: x.late, due: x.due, total: refs.length, shopEmpty: x.shop.length === 0, plantDue };
  }, [S]);
  const sky = useSky(true);
  const [mix, setMix] = useState(() => nightMix());
  useEffect(() => {
    const id = setInterval(() => setMix(nightMix()), 60000);
    return () => clearInterval(id);
  }, []);
  const night = mix > 0.5;
  // Kahve sürahisi = seri. Sayı tek kaynaktan (progressOf); sürahi hep dolu, fark buhar ve hale.
  const hp = progressOf(S.play, now);
  const pot = potState(S.play, now, hp);
  const best = Math.max(longestStreak(S.play.days), hp.streak);
  const freezeLeft = Math.max(0, limits(premium.active).freezes - freezesUsed(S.play, now));
  // Bugünün ilk işinden sonra odaya ilk girişte sürahi bir kez fokurdar ve sayı bir artar (günde bir).
  const [brewing] = useState(() => hp.today && hp.streak > 0 && prefs.get(BREW_KEY) !== dayKey(now));
  const [brew, setBrew] = useState(0);
  const [brewed, setBrewed] = useState(false);
  // Hap, fokurdama anına kadar dünkü sayıyı gösterir; sonra yukarı kayarak bir artar.
  const shownStreak = brewing && !brewed ? Math.max(0, hp.streak - 1) : hp.streak;
  const [coffeeOpen, setCoffeeOpen] = useState(false);

  // İlk cümle girişte bir kez seçilir (gün içinde değişse de ekran açıkken sabit kalır).
  const [opening] = useState(() => openingLine({ hour: new Date().getHours(), done: room.done, due: day.due, late: day.late, total: day.total, away: room.away }, Math.floor(Math.random() * 97)));
  // İlk ziyaret (3 adım): Moka uyur, dokununca uyanır, sonra sürahisini tanıtır.
  const [intro, setIntro] = useState<'tap' | 'hello' | 'pot' | null>(() => (S.play.roomIntro ? null : 'tap'));
  const [woke, setWoke] = useState(() => !opening.sleeping && !!S.play.roomIntro);
  const fur = S.play.mokaFur ?? null;
  const [lampOff, setLampOff] = useState(false);
  const [quip, setQuip] = useState('');
  const [bump, setBump] = useState(0); // etkileşim sayacı: boşta sayacı sıfırlar
  const [moodOv, setMoodOv] = useState<'cheer' | 'wow' | 'happy' | 'sleepy' | null>(null);
  const [hop] = useState(() => new Animated.Value(0));
  const [burst, setBurst] = useState(0);
  const [composing, setComposing] = useState(false);
  // Zamanlayıcılar için: Moka şu an konuşmamalı mı (cevap bekleniyor ya da kullanıcı yazıyor).
  const quietRef = useRef(false);
  useEffect(() => {
    quietRef.current = busy || composing;
  }, [busy, composing]);
  const [lockMsg, setLockMsg] = useState<'login' | 'premium' | 'tomorrow' | null>(null);
  // Balon ömrü: süresi dolan içerik buraya yazılır ve bir daha kendiliğinden çıkmaz.
  const [gone, setGone] = useState<string[]>([]);
  const hide = (k: string) => setGone(g => (g.includes(k) ? g : [...g, k]));
  const unhide = (k: string) => setGone(g => g.filter(x => x !== k));
  const tapN = useRef(0);
  const interact = () => setBump(b => b + 1);
  /** Kısa süreli Moka repliği (balonda), süre bitince balon söner. */
  const say = (s: string, mood: typeof moodOv = 'happy', ms = 3800) => {
    setLockMsg(null);
    setQuip(s);
    unhide(`q:${s}`);
    setMoodOv(mood);
    later(() => { hide(`q:${s}`); setMoodOv(m => (m === mood ? null : m)); }, ms);
  };
  const jump = () => {
    if (reduce) return;
    // Ezilme (hazırlık) → uzayarak zıplama → yaylanarak iniş.
    hop.setValue(0);
    Animated.sequence([
      Animated.timing(hop, { toValue: -0.35, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(hop, { toValue: 1, duration: 140, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(hop, { toValue: 0, friction: 4, tension: 150, useNativeDriver: true }),
    ]).start();
  };
  /** Sürahinin durumuna göre "taze" cümlesi. */
  const potLine = (seed = rnd(2)) =>
    pot === 'fresh' ? (hp.streak >= 2 && seed % 2 ? line('potFreshN', 0, hp.streak) : line('potFresh'))
      : pot === 'wait' ? line('potWait') : pot === 'warm' ? line('potWarm') : pot === 'cold' ? line('potCold') : line('potFirst');
  // Bugünün bütün işleri bitti: oturumda bir kez yıldız saçılması.
  useEffect(() => {
    if (opening.key !== 'allDone' || celebrated === dayStamp()) return;
    celebrated = dayStamp();
    const t = setTimeout(() => { setBurst(1); sfx('done'); }, 700);
    return () => clearTimeout(t);
  }, [opening.key]);
  // Fokurdama ve "taze" cümlesi: açılış cümlesi söndükten sonra bir kez; sonra en erken 4 dakikada bir.
  useEffect(() => {
    if (!woke || intro) return;
    const t = setTimeout(() => {
      if (brewing && !prefs.get(BREW_KEY)?.startsWith(dayKey(now))) {
        prefs.set(BREW_KEY, dayKey(now));
        setBrew(b => b + 1);
        setBrewed(true);
        jump();
        sfx('done');
        say(line('potBrewed', 0, hp.streak), 'cheer', 4200);
      } else if (hp.streak > 0 && !prefs.get(EXPLAIN_KEY)) {
        // Eski kullanıcıya bir kez: seri artık kahve.
        prefs.set(EXPLAIN_KEY, '1');
        say(line('potExplain', 0, hp.streak), 'cheer', 5200);
      } else say(potLine(), 'happy', 4200);
    }, 9000);
    const iv = setInterval(() => { if (!quietRef.current) say(potLine(), 'happy', 4200); }, 4 * 60_000 + rnd(60_000));
    return () => { clearTimeout(t); clearInterval(iv); };
  }, [woke, intro]); // eslint-disable-line react-hooks/exhaustive-deps
  // Boşta: 20-30 sn dokunulmazsa Moka kendi kendine bir şey söyler (gece uykulu).
  const idleOff = busy || composing || notes || reduce || !woke || !!intro;
  useEffect(() => {
    if (idleOff) return;
    const t = setTimeout(() => say(line(night ? 'idleNight' : 'idleDay', rnd(9)), night ? 'sleepy' : 'happy', 4200), 20000 + rnd(10000));
    return () => clearTimeout(t);
  }, [bump, idleOff, night, lastId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fresh0 = !last || last.id === 0;
  const shownIt = last ?? HELLO;
  // Balonda ne var: öncelik sırasıyla.
  const bubbleKey = notes ? 'notes' : busy ? 'busy' : lockMsg ? `lock:${lockMsg}` : quip && !gone.includes(`q:${quip}`) ? `q:${quip}` : intro ? `i:${intro}` : !fresh0 ? `m:${shownIt.id}` : 'open';
  const bubbleOn = !gone.includes(bubbleKey);
  useEffect(() => {
    if (composing && bubbleKey.startsWith('m:')) return;
    const ms = bubbleKey === 'open' ? 8000 : bubbleKey.startsWith('lock:') ? 8000 : bubbleKey.startsWith('m:') ? 25000 + typeMs(shownIt.content.length) : 0;
    if (!ms) return;
    const t = setTimeout(() => {
      hide(bubbleKey);
      if (bubbleKey.startsWith('lock:')) setLockMsg(null);
    }, ms);
    return () => clearTimeout(t);
  }, [bubbleKey, composing]); // eslint-disable-line react-hooks/exhaustive-deps

  const mokaTap = () => {
    interact();
    sfx('tap');
    haptic('light');
    jump();
    if (!woke && intro === 'tap') {
      setWoke(true);
      setIntro('hello');
      later(() => { setIntro(i => (i === 'hello' ? 'pot' : i)); setBrew(b => b + 1); }, 3800);
      later(() => setIntro(i => { if (i === 'pot') update(D0 => void (D0.play.roomIntro = true)); return i === 'pot' ? null : i; }), 9500);
      return;
    }
    if (intro) return;
    if (!woke) {
      // Uzun aradan sonra: Moka uyanır, toz kalkar.
      setWoke(true);
      say(line('back', rnd(5)), 'cheer', 4500);
      return;
    }
    // Moka'ya dokununca son cevabı geri gelir; yoksa tatlı bir tepki.
    if (!fresh0 && gone.includes(`m:${shownIt.id}`) && !quip) return unhide(`m:${shownIt.id}`);
    say(line('tap', tapN.current++), tapN.current % 4 === 1 ? 'wow' : 'cheer', 2600);
  };
  const touchObj = (k: RoomTouch) => {
    interact();
    sfx('tap');
    haptic('light');
    if (!woke) setWoke(true);
    if (k === 'lamba') {
      const off = !lampOff;
      setLampOff(off);
      say(line(off ? 'lampOff' : 'lampOn'), off ? 'sleepy' : 'happy');
    } else if (k === 'surahi') say(potLine(1), 'happy', 4200);
    else if (k === 'kupa') say(line('mug'), 'happy');
    else if (k === 'bitki') say(day.plantDue ? line('plantDue', 0, day.plantDue) : line('plant'), 'happy');
    else say(windowLine(sky.kind, night), 'wow');
  };
  const baseMood = !fresh0 ? mood : !woke ? 'sleepy' : opening.mood;
  // Misafir ve ücretsiz üyede sohbet düğmesi kilitli: basınca Moka tek cümleyle anlatır. Premium'da hak bitince yarına kadar.
  const lock: 'login' | 'premium' | 'tomorrow' | null = status !== 'account' ? 'login' : !premium.active ? 'premium' : left && left.day <= 0 ? 'tomorrow' : null;
  const chatPress = () => {
    interact();
    sfx('tap');
    haptic('light');
    if (lock) {
      setQuip('');
      setLockMsg(lock);
      unhide(`lock:${lock}`);
      setMoodOv(lock === 'tomorrow' ? 'sleepy' : 'happy');
      later(() => setMoodOv(null), 3000);
      return;
    }
    setComposing(true);
  };
  useEffect(() => {
    // Klavye kapanınca ve kutu boşsa alt sıra geri gelir.
    if (!kb && composing && !text.trim()) {
      const t = setTimeout(() => setComposing(false), 250);
      return () => clearTimeout(t);
    }
  }, [kb]); // eslint-disable-line react-hooks/exhaustive-deps
  const ideas = useMemo(() => pickIdeas(day.late, day.shopEmpty, new Date().getHours()), [day.late, day.shopEmpty]);

  // Balon: metne sarılır, kuyruğu Moka'nın gagasına bakar. Yazarken üst şeridin altına çıkar.
  const [bl, setBl] = useState({ x: 0, w: 0 });
  const tailX = Math.min(Math.max(22, mokaCx - 24 - bl.x), Math.max(22, bl.w - 22));
  const bubbleBottom = winH - (mokaTop + mokaSize * 0.08);
  const bubbleMax = Math.max(110, kb ? winH * 0.24 : mokaTop - (insets.top + 70));
  const say0 = (t: string) => <Text maxFontSizeMultiplier={1.3} style={[st.say, { color: D.ink }]}>{tx(t)}</Text>;
  const bubbleBody = notes ? (
    <View style={{ gap: 8 }}>
      <View style={st.notesHead}>
        <Text style={[st.notesTitle, { color: D.ink }]}>{tx('Notlarım')}</Text>
        <Pressable onPress={() => setNotes(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel={tx('Kapat')}>
          <Icon name="close" color={D.soft} size={18} />
        </Pressable>
      </View>
      <NotesList />
    </View>
  ) : busy ? (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4 }} accessibilityLabel={tx('Moka düşünüyor…')}>
      <TypingDots color={D.soft} />
    </View>
  ) : lockMsg ? (
    <Appear key={lockMsg}>
      {say0(lockMsg === 'login' ? line('lockLogin') : lockMsg === 'premium' ? line('lockPremium') : 'Bugünlük çok konuştuk, yarın devam ☕')}
      {lockMsg !== 'tomorrow' && (
        <Squish onPress={() => router.push(lockMsg === 'login' ? '/giris' : '/premium')} accessibilityLabel={tx(lockMsg === 'login' ? 'Hesap aç' : "Premium'a bak")} style={[st.cta, { backgroundColor: c.accent }]}>
          <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.bodyBlack, fontSize: 14, color: c.onAccent }}>{tx(lockMsg === 'login' ? 'Hesap aç' : "Premium'a bak")}</Text>
        </Squish>
      )}
    </Appear>
  ) : bubbleKey.startsWith('q:') ? (
    <Appear key={quip}>{say0(quip)}</Appear>
  ) : intro ? (
    <Appear key={intro}>{say0(line(INTRO_LINE[intro]))}</Appear>
  ) : fresh0 ? (
    <Appear key={woke ? 'awake' : 'asleep'}>{say0(woke && opening.sleeping ? line('back') : opening.text)}</Appear>
  ) : (
    <Appear key={shownIt.id}>
      <Bubble item={shownIt} room typed={!reduce && fresh.has(shownIt.id)} onUndo={undoItem} onConfirm={confirmItem} />
    </Appear>
  );
  const shift = (x: number, y: number) => [
    { translateX: tilt.x.interpolate({ inputRange: [-1, 1], outputRange: [x, -x] }) },
    { translateY: tilt.y.interpolate({ inputRange: [-1, 1], outputRange: [y, -y] }) },
  ];
  const potCold = pot === 'cold' || pot === 'first';

  return (
    <View style={{ flex: 1, backgroundColor: '#1C1712' }}>
      {/* Oda: taban sabit, katmanlar eğimle farklı miktarda kayar (hafif 3B). */}
      <RoomBackdrop
        cheer={burst} mix={mix} sky={sky.kind} warm={room.warm} dust={opening.sleeping ? (woke ? 0 : room.dust) : room.dust} lampOff={lampOff}
        steam={potSteam(pot)} potGlow={pot === 'fresh'} brew={brew} chain={Math.min(7, shownStreak)} tilt={tilt}
        onTouch={touchObj} style={StyleSheet.absoluteFill}
      />
      {/* Moka ve gölgesi: odadan biraz fazla kayar. */}
      <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { transform: shift(3, 2) }]}>
        {!kb && (
          <>
            <Image source={ISIK} pointerEvents="none" style={{ position: 'absolute', left: mokaCx - mokaSize * 0.5, top: mokaBottom - mokaSize * 0.16, width: mokaSize, height: mokaSize * 0.26, tintColor: D.shade, opacity: 0.22 }} />
            <View pointerEvents="none" style={{ position: 'absolute', left: mokaCx - mokaSize * 0.26, top: mokaBottom - mokaSize * 0.065, width: mokaSize * 0.52, height: mokaSize * 0.07, borderRadius: mokaSize, backgroundColor: D.shade, opacity: 0.3 }} />
          </>
        )}
        <Pressable onPress={mokaTap} onLongPress={() => { haptic('light'); router.push('/moka-tasarim' as Href); }} delayLongPress={450} accessibilityHint={tx('Moka\'nı tasarla için basılı tut')} accessibilityLabel="Moka" style={{ position: 'absolute', left: mokaLeft, top: mokaTop, width: mokaSize, height: mokaSize }}>
          <Animated.View
            style={{
              width: mokaSize,
              height: mokaSize,
              transform: [
                { translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [winW / 2 - mokaCx, 0] }) },
                { translateY: Animated.add(enter.interpolate({ inputRange: [0, 1], outputRange: [winH - 40 - (mokaBottom - mokaSize / 2), 0] }), hop.interpolate({ inputRange: [-0.35, 0, 1], outputRange: [mokaSize * 0.03, 0, -mokaSize * 0.1] })) },
                { scale: Animated.multiply(enter.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }), hop.interpolate({ inputRange: [-0.35, 0, 1], outputRange: [1, 1, 1.02] })) },
                { scaleX: hop.interpolate({ inputRange: [-0.35, 0, 1], outputRange: [1.06, 1, 0.97] }) },
                { scaleY: hop.interpolate({ inputRange: [-0.35, 0, 1], outputRange: [0.92, 1, 1.06] }) },
              ],
            }}
          >
            <RoomMoka fur={fur} size={mokaSize} mood={moodOv ?? baseMood} talking={!busy && speaking} thinking={busy} celebrate={burst} />
          </Animated.View>
        </Pressable>
        <View pointerEvents="none" style={{ position: 'absolute', left: mokaCx, top: mokaTop + mokaSize * 0.4 }}>
          <Burst fire={burst} />
        </View>
      </Animated.View>

      {/* Ön katman: iki yumuşak ışık lekesi en çok kayar; köşelerde hafif çerçeve. */}
      <FrontLayer tilt={tilt} w={winW} h={winH} night={mix} />
      <Fade edge="top" color={D.shade} size={insets.top + 24} from={0} to={0.24} />

      {/* Konuşma balonu: metne sarılır, Moka'nın başının hemen üstünde; sessizken söner. */}
      {bubbleOn && (
        <Animated.View
          pointerEvents="box-none"
          style={[st.bubbleWrap, kb ? { top: insets.top + 62 } : { bottom: bubbleBottom }, {
            opacity: enter.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 0, 1], extrapolate: 'clamp' }),
          }]}
        >
          <Appear key={bubbleKey.startsWith('q:') || bubbleKey.startsWith('m:') ? 'b' : bubbleKey}>
            <View
              onLayout={e => setBl({ x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width })}
              style={[st.bubble2, { backgroundColor: night ? D.paperNight : D.paper, shadowColor: D.shade }, notes && { width: winW - 48 }]}
              accessibilityLiveRegion="polite"
            >
              <ScrollView ref={scroll} style={{ flexGrow: 0, maxHeight: bubbleMax }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {bubbleBody}
              </ScrollView>
              {!kb && <View style={[st.tail2, { left: tailX - 9, backgroundColor: night ? D.paperNight : D.paper }]} />}
            </View>
          </Appear>
        </Animated.View>
      )}

      <KeyboardAvoidingView style={StyleSheet.absoluteFill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} pointerEvents="box-none">
        {/* Üst şerit: geri, kahve hapı, menü. Ortada yazı yok. */}
        <View style={[st.head2, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
          <RoundBtn onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} label={tx('Geri')} bg={D.shade}>
            <Chevron color={D.cream} size={20} />
          </RoundBtn>
          <View style={{ flex: 1 }} pointerEvents="none" />
          <Squish onPress={() => { interact(); sfx('tap'); setCoffeeOpen(true); }} accessibilityLabel={tx('Kahve: {} gün taze').replace('{}', String(hp.streak))} hitSlop={6} style={[st.pill, { backgroundColor: D.paper, shadowColor: D.shade, opacity: pot === 'wait' ? 0.82 : 1 }]}>
            <PotIcon size={22} color={D.ink} cold={potCold} />
            {shownStreak > 0 && <Appear key={shownStreak}><Text maxFontSizeMultiplier={1.3} style={[st.pillN, { color: D.ink }]}>{shownStreak}</Text></Appear>}
            {pot === 'warm' && <Icon name="snow" color={D.soft} size={14} />}
          </Squish>
          <RoundBtn onPress={() => setMenu(m => !m)} label={tx('Diğer')} active={menu} bg={D.shade}>
            <Icon name="more" color={D.cream} size={20} />
          </RoundBtn>
        </View>

        <View style={{ flex: 1 }} pointerEvents="none" />

        {!!echo && (
          <View style={[st.echo, { backgroundColor: c.accent }]}>
            <Text numberOfLines={2} style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: c.onAccent }}>{echo}</Text>
          </View>
        )}

        {composing ? (
          <View style={{ paddingHorizontal: 16, paddingBottom: kb ? 10 : Math.max(insets.bottom, 10) + 6, gap: 10 }}>
            {!text.trim() && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
                {ideas.map(x => (
                  <Squish key={x} onPress={() => send(x)} accessibilityLabel={x} style={[st.idea, { backgroundColor: D.paper, shadowColor: D.shade }]}>
                    <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.bodyBold, fontSize: 13.5, color: D.ink }}>{tx(x)}</Text>
                  </Squish>
                ))}
              </ScrollView>
            )}
            <View style={[st.compose, { backgroundColor: D.paper, shadowColor: D.shade }]}>
              <TextInput
                value={text}
                onChangeText={t => { setText(t); interact(); }}
                autoFocus
                placeholder={tx("Moka'ya yaz…")}
                placeholderTextColor={D.soft}
                selectionColor={c.accent}
                maxLength={400}
                returnKeyType="send"
                onSubmitEditing={() => send()}
                editable={!busy}
                maxFontSizeMultiplier={1.3}
                style={[st.input, { color: D.ink }]}
              />
              {left && left.day <= 5 && <Text style={[st.count, { color: D.soft }]}>{`☕ ${left.day}`}</Text>}
              <Squish onPress={() => send()} disabled={busy || !text.trim()} accessibilityLabel={tx('Gönder')} style={[st.send, { backgroundColor: c.accent, opacity: busy || !text.trim() ? 0.45 : 1 }]}>
                <Icon name="send" color={c.onAccent} size={20} />
              </Squish>
            </View>
          </View>
        ) : (
          <View style={[st.row, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
            <Squish onPress={() => { interact(); router.push('/temizlik' as Href); }} accessibilityLabel={tx('Temizlik başlat')} style={[st.main, { backgroundColor: c.accent, shadowColor: D.shade }]}>
              <Icon name="broom" color={c.onAccent} size={21} />
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} maxFontSizeMultiplier={1.3} style={[st.mainText, { color: c.onAccent }]}>{tx('Temizlik başlat')}</Text>
            </Squish>
            <Squish onPress={() => { interact(); setAddOpen(true); }} accessibilityLabel={tx('İş ekle')} style={[st.circle, { backgroundColor: D.paper, shadowColor: D.shade }]}>
              <Icon name="plus" color={D.ink} size={22} />
            </Squish>
            <Squish onPress={chatPress} accessibilityLabel={tx("Moka'ya yaz")} style={[st.circle, { backgroundColor: D.paper, shadowColor: D.shade }]}>
              <Icon name="chat" color={D.ink} size={22} />
              {lock && (
                <View style={[st.badge, { backgroundColor: lock === 'premium' ? D.glow : D.cream, borderColor: D.paper }]}>
                  <Icon name={lock === 'login' ? 'lock' : lock === 'premium' ? 'star' : 'moon'} color={D.ink} size={10} />
                </View>
              )}
            </Squish>
          </View>
        )}
      </KeyboardAvoidingView>

      {menu && <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenu(false)} accessibilityLabel={tx('Kapat')} />}
      {menu && (
        <View style={[st.menu, { top: insets.top + 58 }]}>
          <Appear>
            <View style={[st.menuCard, { backgroundColor: D.paper, shadowColor: D.shade }]}>
              {([
                ['palette', "Moka'nı tasarla", () => router.push('/moka-tasarim' as Href)],
                ['note', 'Notlarım', () => setNotes(n => !n)],
              ] as const).map(([ic, label, fn], i) => (
                <Pressable key={label} onPress={() => { setMenu(false); interact(); fn(); }} accessibilityRole="button" accessibilityLabel={tx(label)} style={({ pressed }) => [st.menuRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: D.line }, pressed && { backgroundColor: D.line }]}>
                  <Icon name={ic} color={D.ink} size={20} />
                  <Text maxFontSizeMultiplier={1.3} style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 15.5, color: D.ink }}>{tx(label)}</Text>
                </Pressable>
              ))}
              <View style={{ height: 6, backgroundColor: D.line, opacity: 0.5 }} />
              {([
                ['flag', 'Moka\'nın son cevabını bildir', report],
                ['trash', 'Sohbeti temizle', clear],
              ] as const).map(([ic, label, fn]) => (
                <Pressable key={label} onPress={() => { setMenu(false); interact(); fn(); }} accessibilityRole="button" accessibilityLabel={tx(label)} style={({ pressed }) => [st.menuRow2, pressed && { backgroundColor: D.line }]}>
                  <Icon name={ic} color={D.soft} size={17} />
                  <Text maxFontSizeMultiplier={1.3} style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 13.5, color: D.soft }}>{tx(label)}</Text>
                </Pressable>
              ))}
              <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16, color: D.soft, paddingHorizontal: 14, paddingTop: 6, paddingBottom: 6 }}>
                {tx('Moka bir yapay zekâdır; cevapları hatalı olabilir, tıbbi ya da psikolojik tavsiye değildir. Acil durumda 112’yi ara.')}
              </Text>
            </View>
          </Appear>
        </View>
      )}
      <AddSheet open={addOpen} onClose={() => setAddOpen(false)} />
      <CoffeeSheet open={coffeeOpen} onClose={() => setCoffeeOpen(false)} P={S.play} now={now} streak={hp.streak} best={best} pot={pot} freezeLeft={freezeLeft} />
    </View>
  );
}

/** Oda düğmelerindeki çizim ikonlar (emoji yerine; her yerde aynı kalınlık). */
type IconName = 'broom' | 'plus' | 'send' | 'lock' | 'star' | 'moon' | 'more' | 'note' | 'flag' | 'trash' | 'close' | 'check' | 'chat' | 'snow' | 'palette';
function Icon({ name, color, size = 20 }: { name: IconName; color: string; size?: number }) {
  const p = { stroke: color, strokeWidth: 2.2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'broom' && (<><Path d="M19.5 3.5L12 11" {...p} /><Path d="M9.2 10.2l4.6 4.6c-.6 2.6-2.4 5-5.6 6.2-1.6.6-3.6.4-5.2-.4.9-1.1 1.6-2.4 1.9-3.6l-1.4.2c.9-2.9 3-6 5.7-7z" {...p} /><Path d="M7 18.5l2.2-2.2" {...p} /></>)}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...p} strokeWidth={2.6} />}
      {name === 'send' && <Path d="M5 12l14-7-4.5 14-3-5.5z" fill={color} stroke={color} strokeWidth={1.6} strokeLinejoin="round" />}
      {name === 'lock' && (<><Rect x={5} y={11} width={14} height={9} rx={2.5} {...p} /><Path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" {...p} /></>)}
      {name === 'star' && <Path d="M12 3.8l2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-3.9 5.6-.8z" {...p} />}
      {name === 'moon' && <Path d="M19.5 14.5A7.5 7.5 0 1 1 9.5 4.5a6 6 0 0 0 10 10z" {...p} />}
      {name === 'more' && (<><Circle cx={5.5} cy={12} r={1.9} fill={color} /><Circle cx={12} cy={12} r={1.9} fill={color} /><Circle cx={18.5} cy={12} r={1.9} fill={color} /></>)}
      {name === 'note' && (<><Path d="M6 3.5h8.5l3.5 3.5v13.5H6z" {...p} /><Path d="M9 11h6M9 15h6" {...p} /></>)}
      {name === 'flag' && (<><Path d="M5.5 21V4" {...p} /><Path d="M5.5 4.5h11l-2.2 4 2.2 4h-11" {...p} /></>)}
      {name === 'trash' && (<><Path d="M4.5 7h15" {...p} /><Path d="M9.5 7V4.5h5V7" {...p} /><Path d="M6.5 7l1 13h9l1-13" {...p} /></>)}
      {name === 'close' && <Path d="M6 6l12 12M18 6L6 18" {...p} />}
      {name === 'check' && <Path d="M5 12.5l4.5 4.5L19 7.5" {...p} strokeWidth={3} />}
      {name === 'chat' && (<><Path d="M4.5 11.5c0-4 3.4-7 7.5-7s7.5 3 7.5 7-3.4 7-7.5 7c-1 0-2-.2-2.9-.5L5 19.5l1.1-3.6c-1-1.2-1.6-2.7-1.6-4.4z" {...p} /><Circle cx={8.8} cy={11.6} r={1.1} fill={color} /><Circle cx={12} cy={11.6} r={1.1} fill={color} /><Circle cx={15.2} cy={11.6} r={1.1} fill={color} /></>)}
      {name === 'snow' && <Path d="M12 3.5v17M4.6 7.75l14.8 8.5M19.4 7.75L4.6 16.25" {...p} />}
      {name === 'palette' && (<><Path d="M12 3.8c-4.8 0-8.5 3.6-8.5 8.1 0 4.3 3.4 8.3 7.5 8.3 1.4 0 2-.9 1.6-2-.5-1.3.3-2.4 1.7-2.4h2.2c2.4 0 4-1.7 4-4.1 0-4.4-3.8-7.9-8.5-7.9z" {...p} /><Circle cx={8} cy={11} r={1.2} fill={color} /><Circle cx={11} cy={7.6} r={1.2} fill={color} /><Circle cx={15.4} cy={8.6} r={1.2} fill={color} /></>)}
    </Svg>
  );
}

/** Üst şeritteki yuvarlak, yarı saydam koyu düğme. */
function RoundBtn({ children, onPress, label, active, bg }: { children: ReactNode; onPress: () => void; label: string; active?: boolean; bg: string }) {
  return (
    <Squish onPress={onPress} accessibilityLabel={label} accessibilityState={active != null ? { expanded: active } : undefined} hitSlop={6} style={st.round}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: 22, backgroundColor: bg, opacity: active ? 0.55 : 0.34 }]} />
      {children}
    </Squish>
  );
}

/** Kameraya yakın katman: iki büyük, bulanık ışık lekesi (en çok kayar) ve köşelerde hafif çerçeve. */
const BOKEH = [{ x: 0.06, y: 0.22, r: 0.18 }, { x: 0.96, y: 0.7, r: 0.16 }];
function FrontLayer({ tilt, w, h, night }: { tilt: Animated.ValueXY; w: number; h: number; night: number }) {
  const tone = night > 0.5 ? '#FFC98A' : '#FFF1D2';
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: tilt.x.interpolate({ inputRange: [-1, 1], outputRange: [12, -12] }) }, { translateY: tilt.y.interpolate({ inputRange: [-1, 1], outputRange: [8, -8] }) }] }]}>
        {BOKEH.map((b, i) => (
          <Image key={i} source={ISIK} style={{ position: 'absolute', left: b.x * w - b.r * w, top: b.y * h - b.r * w, width: b.r * w * 2, height: b.r * w * 2, tintColor: tone, opacity: 0.1 }} />
        ))}
      </Animated.View>
      {[[0, 0], [w, 0], [0, h], [w, h]].map(([x, y], i) => (
        <Image key={i} source={ISIK} style={{ position: 'absolute', left: x - w * 0.55, top: y - w * 0.55, width: w * 1.1, height: w * 1.1, tintColor: '#140E09', opacity: 0.14 }} />
      ))}
    </View>
  );
}

/** Üç nokta sırayla zıplar (kendi aralarında gecikmeli). */
function TypingDots({ color }: { color: string }) {
  const reduce = useReduceMotion();
  const [vals] = useState(() => [0, 1, 2].map(() => new Animated.Value(0)));
  useEffect(() => {
    if (reduce) return;
    const anims = vals.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(v, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(480 - i * 160),
        ]),
      ),
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, [reduce, vals]);
  return (
    <>
      {vals.map((v, i) => (
        <Animated.View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }), transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] }} />
      ))}
    </>
  );
}

/** Yeni cevap harf harf belirir (kısa sürede biter); bitince tam metin kalır. */
function useTyped(text: string, on: boolean, done: () => void) {
  // Karakter dizisi: emoji ve vekil çiftleri ortadan bölünmesin.
  const chars = useMemo(() => Array.from(text), [text]);
  const [n, setN] = useState(on ? 0 : chars.length);
  useEffect(() => {
    if (!on) return;
    const total = typeMs(chars.length);
    const t0 = Date.now();
    const iv = setInterval(() => {
      const k = Math.min(chars.length, Math.ceil(((Date.now() - t0) / total) * chars.length));
      setN(k);
      if (k >= chars.length) {
        clearInterval(iv);
        done();
      }
    }, 40);
    return () => clearInterval(iv);
  }, [text, on]); // eslint-disable-line react-hooks/exhaustive-deps
  return n >= chars.length ? text : chars.slice(0, n).join('');
}

function Bubble({ item, typed, room, onUndo, onConfirm }: { item: Item; typed: boolean; room?: boolean; onUndo: (id: number) => void; onConfirm: (id: number, yes: boolean) => void }) {
  const c = useColors();
  const { state: S } = useStore();
  const router = useRouter();
  const me = item.role === 'user';
  const shown = useTyped(item.content, typed, () => fresh.delete(item.id));
  return (
    <View style={{ gap: 6, alignItems: me ? 'flex-end' : 'flex-start' }}>
      <View style={[st.bubble, me ? st.me : st.moka, room ? st.roomBubble : { backgroundColor: me ? c.accent : item.error ? c.surface2 : c.surface }]}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: room ? 16 : 15, lineHeight: room ? 24 : 22, color: me ? c.onAccent : c.ink }}>{shown}</Text>
      </View>
      {item.cta && (
        <Btn small kind="primary" label={item.cta === 'login' ? 'Giriş yap / üye ol' : "Premium'a bak ⭐"} onPress={() => router.push(item.cta === 'login' ? '/giris' : '/premium')} />
      )}
      {item.done?.map((d, i) => (
        <View key={i} style={[st.done, { backgroundColor: c.sageSoft }]}>
          <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 12, color: c.ink }}>{d}</Text>
        </View>
      ))}
      {item.undo?.length && !item.undone ? (
        <Squish onPress={() => onUndo(item.id)} accessibilityLabel="Geri al" style={[st.done, { backgroundColor: c.surface, borderColor: c.line, borderWidth: 1 }]}>
          <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 12, color: c.ink }}>↩️ Geri al</Text>
        </Squish>
      ) : null}
      {item.confirm?.length && !item.confirmed ? (
        <View style={{ gap: 6, alignItems: 'flex-start' }}>
          {item.confirm.map((a, i) => (
            <Text key={i} style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: c.ink }}>{describeAction(S, a)}</Text>
          ))}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn small kind="primary" label="Evet, sil" onPress={() => onConfirm(item.id, true)} />
            <Btn small kind="ghost" label="Vazgeç" onPress={() => onConfirm(item.id, false)} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function NotesList() {
  const c = useColors();
  const { state: S, update } = useStore();
  const notes = [...S.play.notes].sort((a, b) => a.day.localeCompare(b.day) || a.at - b.at);
  if (!notes.length) return <T v="small">Henüz not yok. Moka&apos;ya &quot;yarın için not al: …&quot; de.</T>;
  return (
    <>
      {notes.map(n => (
        <View key={n.id} style={[st.note, { backgroundColor: c.surface }]}>
          <View style={{ flex: 1 }}>
            <T v="tiny">{noteDayLabel(n.day)}</T>
            <T>{n.text}</T>
          </View>
          <Pressable onPress={() => update(D => void (D.play.notes = D.play.notes.filter(x => x.id !== n.id)))} accessibilityLabel="Notu sil" hitSlop={8}>
            <Text style={{ color: c.muted, lineHeight: 26, fontSize: 20 }}>×</Text>
          </Pressable>
        </View>
      ))}
    </>
  );
}


const st = StyleSheet.create({
  roomBubble: { maxWidth: '100%', backgroundColor: 'transparent', paddingHorizontal: 0, paddingVertical: 0, alignSelf: 'stretch' },
  echo: { alignSelf: 'flex-end', maxWidth: '75%', marginRight: 20, marginBottom: 10, borderRadius: 18, borderBottomRightRadius: 6, paddingHorizontal: 12, paddingVertical: 7 },
  menu: { position: 'absolute', right: 16, zIndex: 10, width: 264 },
  menuCard: { borderRadius: 22, paddingVertical: 4, overflow: 'hidden', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 14 },
  menuRow2: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 14 },
  say: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 25 },
  bubbleWrap: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
  bubble2: { minWidth: 120, maxWidth: '100%', borderRadius: 22, paddingHorizontal: 18, paddingVertical: 13, shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  tail2: { position: 'absolute', bottom: -7, width: 18, height: 18, borderRadius: 4, transform: [{ rotate: '45deg' }] },
  notesHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notesTitle: { fontFamily: fonts.displayBold, fontSize: 18 },
  cta: { alignSelf: 'flex-start', marginTop: 10, minHeight: 40, justifyContent: 'center', borderRadius: radius.pill, paddingHorizontal: 18 },
  head2: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, height: 50 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pill: { height: 36, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  pillN: { fontFamily: fonts.displayBold, fontSize: 16, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  main: { flex: 1, height: 56, borderRadius: radius.pill, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  mainText: { flexShrink: 1, fontFamily: fonts.bodyBlack, fontSize: 16 },
  circle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  badge: { position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  compose: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 56, borderRadius: radius.pill, paddingLeft: 20, paddingRight: 4, shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  input: { flex: 1, minHeight: 48, fontFamily: fonts.bodyBold, fontSize: 16 },
  count: { fontFamily: fonts.bodyBold, fontSize: 12.5 },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  idea: { minHeight: 44, justifyContent: 'center', borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10, shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  bubble: { maxWidth: '86%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  moka: { borderBottomLeftRadius: 6, alignSelf: 'flex-start' },
  me: { borderBottomRightRadius: 6 },
  done: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.tile, padding: 14 },
});
