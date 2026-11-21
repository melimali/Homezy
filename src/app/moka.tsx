import { useRouter } from '@/lib/nav';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Animated, BackHandler, Easing, I18nManager, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth, type AuthStatus } from '@/auth/AuthProvider';
import { CoffeeSheet, PotIcon } from '@/components/CoffeeSheet';
import { RoomMoka } from '@/components/RoomMoka';
import { Fade } from '@/components/SceneImage';
import { MOKA_ASSETS } from '@/constants/moka';
import { ISIK } from '@/constants/oda';
import { longestStreak } from '@/domain/achievements';
import { giveCoffee } from '@/domain/bond';
import { ITEM } from '@/domain/items';
import { potState, potSteam } from '@/domain/coffee';
import { dayKey, freezesUsed, progressOf } from '@/domain/play';
import { useNow } from '@/hooks/useNow';
import { prefs } from '@/lib/supabase';
import { useTilt } from '@/hooks/useTilt';
import { odaMap, odaPhaseOf, RoomBackdrop, seatOf, type RoomTouch } from '@/components/RoomBackdrop';
import { Appear, Burst, Float, Squish, useReduceMotion } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { Btn, Chevron, T } from '@/components/ui';
import type { Href } from 'expo-router';
import { mimikFor, mimikOf } from '@/constants/mimik';
import { CHAT_ACCOUNT_NEEDED, CHAT_PREMIUM_INTRO, CHAT_PREMIUM_NUDGE } from '@/domain/chatGate';
import { applyChatAction, chatCtx, describeAction, needsConfirm, noteDayLabel, type ChatAction, type ChatMsg } from '@/domain/chat';
import type { AppState } from '@/domain/types';
import { limits } from '@/domain/premium';
import { SUPPORT_EMAIL, openLink } from '@/lib/links';
import { cannedReply } from '@/domain/chatCanned';
import { askMoka, chatResetAt } from '@/lib/mokaChat';
import { dateLocale, getUiLang, tx } from '@/i18n/runtime';
import { haptic, sfx } from '@/lib/sfx';
import { allTasks } from '@/domain/logic';
import { line, openingLine, windowLine } from '@/domain/mokaLines';
import { nightMix, roomState } from '@/lib/roomState';
import { useSky } from '@/lib/weather';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { ForceScheme, fonts, radius, useColors } from '@/theme';
import { appAlert } from '@/components/AppAlert';
import { activeMokaQuota, boundMokaMessages, createMokaSessionStore } from '@/lib/mokaSession';

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
  /** Hata cevabında: "Tekrar dene" ile yeniden gönderilecek mesaj. */
  retry?: string;
  /** Günlük hak bitince Moka'nın vedası (modele gönderilmez). */
  bye?: boolean;
};

/** Kullanıcı ve model metni çeviri yamasından geçmesin (i18n/patch.tsx): yazılan söz olduğu gibi kalır. */
const NOTX = { noTx: true } as object;
/** Arapça: kendi balonları solda; köşe ve kuyruk ona göre (swapLeftAndRightInRTL kapalı, fiziksel yönler dönmez). */
const RTL = I18nManager.isRTL;

/** Moka'nın oturduğu yer: yastığın üst yüzeyinin ortası (852×1846 oda resmi). */

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

/** Sohbet yalnızca geçerli hesap sahibinin açık uygulama oturumunda tutulur. */
const sessionForOwner = createMokaSessionStore<Item[]>(() => [HELLO]);
let nextId = 1;
/** Günlük hak dolunca Moka'nın vedası; {} yerine "yarın 00:00" gibi yenilenme zamanı gelir. */
const BYE = [
  'Bugünlük çok konuştuk, ben de biraz yoruldum 😴 {} yine buradayım, konuşuruz 💛',
  'Kahvem bitti, gözlerim kapanıyor ☕😴 Bugünlük bu kadar; {} seni bekliyorum 💛',
  'Bugün ne güzel sohbet ettik 💛 Şimdi biraz kestireyim; {} yine konuşuruz ☕',
];
/** Yenilenme anı, telefonun saatiyle: "yarın 00:00" (Türkiye), başka saat diliminde "bugün 22:00" gibi. */
function resetLabel() {
  const r = chatResetAt();
  const t = r.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });
  return tx(r.toDateString() === new Date().toDateString() ? 'bugün {}' : 'yarın {}').replace('{}', t);
}
const byeLine = () => tx(BYE[Math.floor(Math.random() * BYE.length)]).replace('{}', resetLabel());
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
  const { status, user } = useAuth();
  const owner = user?.id ? `${status}:${user.id}` : status;
  return <MokaChatSession key={owner} owner={owner} status={status} />;
}

function MokaChatSession({ owner, status }: { owner: string; status: AuthStatus }) {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { state: S, update, get } = useStore();
  const { premium } = usePurchases();
  const [session] = useState(() => sessionForOwner(owner));
  const [items, setItems] = useState<Item[]>(() => session.messages());
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [left, setLeft0] = useState(() => activeMokaQuota(session.quota()));
  const setLeft = useCallback((v: { day: number; month: number } | null) => {
    const quota = v ? { ...v, until: chatResetAt().getTime() } : null;
    session.saveQuota(quota);
    setLeft0(quota);
  }, [session]);
  const [notes, setNotes] = useState(false);
  const { width: winW } = useWindowDimensions();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const logRef = useRef<ComponentRef<typeof ScrollView>>(null);
  // Ekrandan çıkınca bekleyen gecikmeli işlemler (yönlendirme, balon ekleme) iptal edilir.
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      fn();
    }, ms);
    timers.current.add(timer);
  };
  const [kb, setKb] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [kbH, setKbH] = useState(0);
  const [lift] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const sh = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', e => { setKb(true); setKbH(e.endCoordinates?.height ?? 0); });
    const hd = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(false));
    return () => { sh.remove(); hd.remove(); };
  }, []);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    if (!menu) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setMenu(false); return true; });
    return () => sub.remove();
  }, [menu]);
  /** Az önce gönderilen mesaj: yazı çubuğunun üstünde kendi balonunda durur, Moka cevap verince bir süre sonra geçmişe karışır. */
  const [sent, setSent] = useState<{ id: number; text: string } | null>(null);
  const settle = (id: number, ms = 6000) => later(() => setSent(s => (s?.id === id ? null : s)), ms);
  const { height: winH } = useWindowDimensions();
  // Son cevabın tonu mimiği belirler; cevap gelince ve yazılırken ağzı oynar.
  const last = [...items].reverse().find(i => i.role === 'assistant' && !i.error);
  // Balonda gösterilen son Moka mesajı: hata cevapları da görünür (eskiden gizleniyordu, Moka "cevap vermiyor" gibi duruyordu).
  const lastSaid = [...items].reverse().find(i => i.role === 'assistant');
  const reduce = useReduceMotion();
  const [roomReady, setRoomReady] = useState(false);
  const [roomReveal] = useState(() => new Animated.Value(1));
  const [roomOpeningAt] = useState(() => Date.now());
  const [coverRoom, setCoverRoom] = useState(true);
  const onRoomReady = useCallback(() => setRoomReady(true), []);
  useEffect(() => {
    if (!roomReady) return;
    const reveal = Animated.timing(roomReveal, {
      toValue: 0, delay: reduce ? 0 : Math.max(0, 420 - (Date.now() - roomOpeningAt)),
      duration: reduce ? 0 : 260, easing: Easing.out(Easing.quad), useNativeDriver: true,
    });
    reveal.start(({ finished }) => { if (finished) setCoverRoom(false); });
    return () => reveal.stop();
  }, [reduce, roomOpeningAt, roomReady, roomReveal]);
  const lastMood = last && last.id !== 0 ? mimikOf(last.content) : 'happy';
  // Cevap beklerken kullanıcının son mesajı üzgünse Moka da üzgün dinler.
  const mine = [...items].reverse().find(i => i.role === 'user');
  const mood = busy && mine && mimikOf(mine.content) === 'sad' ? 'sad' : lastMood;
  const [speaking, setSpeaking] = useState(false);
  const lastId = last?.id;
  useEffect(() => {
    if (!lastId) {
      // Sohbet temizlenince eski yazma zamanlayıcısı iptal olur; Moka'nın ağzı açık kalmasın.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    const t = setTimeout(() => {
      fresh.delete(lastId);
      setSpeaking(false);
    }, reduce || !fresh.has(lastId) ? 600 : typeMs(last?.content.length ?? 0));
    return () => {
      clearTimeout(t);
      fresh.delete(lastId);
    };
  }, [lastId]); // eslint-disable-line react-hooks/exhaustive-deps

  const push = useCallback((fn: (prev: Item[]) => Item[]) => {
    setItems(prev => {
      const next = boundMokaMessages(fn(prev), 100);
      session.saveMessages(next);
      return next;
    });
  }, [session]);

  useEffect(() => {
    if (items.length <= 1 && !busy) return;
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [items, busy]);

  const send = async (raw?: string, force = false) => {
    const msg = (raw ?? text).trim().slice(0, 400);
    if (!msg || busy) return;
    // Günlük hak bitti: mesaj gitmez, Moka yarını hatırlatır.
    if (left && left.day <= 0 && status === 'account' && premium.active) {
      setComposing(false);
      Keyboard.dismiss();
      return chatPress();
    }
    setText('');
    setQuip('');
    setLockMsg(null);
    setBump(b => b + 1);
    const mine: Item = { id: nextId++, role: 'user', content: msg };
    setSent({ id: mine.id, text: msg });
    // Hata alan mesajlar (ve cevapsız kalan soruları) modele gitmez.
    const history = [...items.filter((i, k) => !i.error && !i.bye && !(i.role === 'user' && items[k + 1]?.error)), mine].slice(-6).map(({ role, content, done }) => ({
      role,
      content: done?.length ? `${content}\n[Uygulama bu işlemleri zaten yaptı: ${done.join(' | ')}]` : content,
    }));
    push(p => [...p, mine]);
    // Hesapsız kullanıcı: üyelik iste. Hesaplı ama Premium değil: hazır metin, yapay zekâ çağrılmaz.
    if (status !== 'account' || !premium.active) {
      const gate = status !== 'account'
        ? { content: tx(CHAT_ACCOUNT_NEEDED), cta: 'login' as const }
        : { content: tx(session.nextFreeAsked() ? CHAT_PREMIUM_INTRO : CHAT_PREMIUM_NUDGE), cta: 'premium' as const };
      sfx('tap');
      const gid = nextId++;
      fresh.add(gid);
      later(() => push(p => [...p, { id: gid, role: 'assistant', ...gate }]), 500);
      settle(mine.id);
      return;
    }
    const ctx = chatCtx(get());
    // Aynı mesaj art arda: model çağrılmaz.
    const prevUser = [...items].reverse().find(i => i.role === 'user');
    if (!force && prevUser && prevUser.content.trim().toLowerCase() === msg.toLowerCase()) {
      sfx('tap');
      const rid2 = nextId++;
      fresh.add(rid2);
      later(() => push(p => [...p, { id: rid2, role: 'assistant', content: tx('Bunu az önce konuştuk ☕ Başka bir şey eklemek ister misin?') }]), 450);
      settle(mine.id);
      return;
    }
    // Selam / teşekkür / hoşça kal: hazır cevap, sunucu çağrılmaz, hak düşmez.
    const canned = cannedReply(msg, getUiLang(), ctx, session.nextCanned());
    if (canned) {
      sfx('tap');
      const cid = nextId++;
      fresh.add(cid);
      later(() => push(p => [...p, { id: cid, role: 'assistant', content: canned }]), 450);
      settle(mine.id);
      return;
    }
    setBusy(true);
    sfx('tap');
    let r: Awaited<ReturnType<typeof askMoka>>;
    try {
      r = await askMoka(history, ctx);
    } catch {
      // Beklenmeyen hata (ör. bozuk cevap): balon boş kalmasın.
      r = { ok: false, message: tx('Şu an cevap veremedim. Biraz sonra tekrar dene; hakkından düşmedi.') };
    }
    if (!session.isActive()) return;
    setBusy(false);
    settle(mine.id);
    if (!r.ok && r.daily) {
      // Günlük hak doldu: hata değil, Moka tatlı bir vedayla uykuya geçer.
      setLeft({ day: 0, month: left?.month ?? 0 });
      sayBye(0);
      return;
    }
    if (!r.ok) {
      const cta = r.account ? 'login' as const : r.premium ? 'premium' as const : undefined;
      const eid = nextId++;
      fresh.add(eid);
      push(p => [...p, { id: eid, role: 'assistant', content: r.message, error: true, cta, ...(!cta && !r.limit ? { retry: msg } : {}) }]);
      return;
    }
    if (!r.reply.trim() && !r.actions.length) r.reply = tx('Tamam! ☕');
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
    // Bu, günün son mesajıydı: cevabı yazıldıktan sonra Moka vedalaşır.
    if (r.limit != null && r.limit - r.used <= 0) sayBye(typeMs(r.reply.length) + 1800);
    const go = got.go;
    if (go) later(() => router.push(go as never), 700);
    const f = got.focus;
    if (f) {
      later(() => router.push({ pathname: '/odak', params: { min: String(f.minutes), topic: f.topic, auto: '1' } }), 900);
    }
  };

  /** Günün son mesajından sonra: veda balonu, uykulu Moka, klavye kapanır. */
  const sayBye = (ms: number) => {
    later(() => {
      const bid = nextId++;
      fresh.add(bid);
      push(p => [...p, { id: bid, role: 'assistant', content: byeLine(), bye: true }]);
      setQuip('');
      setMoodOv(null);
      setText('');
      setComposing(false);
      Keyboard.dismiss();
      haptic('light');
    }, ms);
  };

  const undoItem = (id: number) => {
    const it = items.find(i => i.id === id);
    if (!it?.undo || it.undone) return;
    update(D => void it.undo!.forEach(fn => fn(D)));
    push(p => p.map(i => (i.id === id ? { ...i, undone: true } : i)));
    toast(tx('Geri aldım ↩️'));
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
    if (!text) return toast(tx('Bildirilecek bir cevap yok.'));
    appAlert(tx('Cevabı bildir'), tx('Moka’nın son cevabı uygunsuz, yanlış ya da zararlı mıydı? Bize e-posta ile bildir; cevap metni mesaja eklenir.'), [
      { text: tx('Vazgeç'), style: 'cancel' },
      { text: tx('Bildir'), onPress: () => openLink(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(tx('Moka cevabı bildirimi'))}&body=${encodeURIComponent(tx('Bildirdiğim cevap') + ':\n\n' + text + '\n\n' + tx('Neden:'))}`) },
    ]);
  };

  /** Hata cevabındaki "Tekrar dene": başarısız mesaj ve hata balonu silinir, mesaj yeniden gider. */
  const retry = (id: number) => {
    const it = items.find(i => i.id === id);
    if (!it?.retry || busy) return;
    const msg = it.retry;
    push(p => {
      const k = p.findIndex(i => i.id === id);
      const u = k > 0 && p[k - 1].role === 'user' ? k - 1 : k;
      return p.filter((_, j) => j !== k && j !== u);
    });
    void send(msg, true);
  };

  const clear = () => {
    setSent(null);
    session.saveMessages([HELLO]);
    setItems(session.messages());
    toast(tx('Sohbet temizlendi 🧹'));
  };

  useEffect(() => {
    if (!left) return;
    const expire = () => setLeft(null);
    const delay = left.until - Date.now();
    if (delay <= 0) {
      expire();
      return;
    }
    const timer = setTimeout(expire, delay);
    return () => clearTimeout(timer);
  }, [left, setLeft]);

  // Oda: Moka yastığın üstünde. Yazarken küçülüp yukarı çıkar.
  const D = c.den;
  // Odanın saati (sabah/akşam/gece resmi); Moka o resimdeki yastığın ortasına oturur.
  const [phase, setPhase] = useState(() => odaPhaseOf());
  const SEAT = seatOf(phase);
  const map = odaMap(winW, winH);
  const mokaSize = Math.round(Math.min(winW * 0.62, 300));
  // Resmin altında %4 boşluk var: ayaklar yastığa bassın diye o kadar aşağı.
  const mokaBottom = map.oy + SEAT.y * map.s + mokaSize * 0.04;
  const mokaLeft = map.ox + SEAT.x * map.s - mokaSize / 2;
  const mokaTop = mokaBottom - mokaSize;
  const mokaCx = mokaLeft + mokaSize / 2;
  // Klavye açılınca oda ve Moka birlikte yukarı kayar (Moka yastıkta oturmaya devam eder); balon ve yazı çubuğu üstte/altta durur.
  const logH = Math.round(winH * 0.3);
  const covered = (kb ? kbH : Math.max(insets.bottom, 12)) + (logOpen ? logH + 10 : 0);
  const liftTo = kb || logOpen ? Math.max(0, Math.min(covered + 150 - mokaBottom, mokaTop - (insets.top + 170))) : 0;
  useEffect(() => {
    const a = Animated.timing(lift, { toValue: -liftTo, duration: reduce ? 0 : 220, easing: Easing.out(Easing.quad), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [liftTo, reduce, lift]);
  // Oda açılırken Moka yastık üzerinde hafifçe doğrulur.
  const [enter] = useState(() => new Animated.Value(reduce ? 1 : 0));
  useEffect(() => {
    if (reduce) { enter.setValue(1); return; }
    const a = Animated.timing(enter, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false });
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
    const id = setInterval(() => { setMix(nightMix()); setPhase(odaPhaseOf()); }, 60000);
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
  const [gift, setGift] = useState<{ id: string; room: string | null } | null>(null);
  /** Kahveyi Moka'ya ver: sevinç (zıplama, kalpler, yıldız, cümle); hak dolduysa hediye penceresi. */
  const giveToMoka = () => {
    let res: ReturnType<typeof giveCoffee> = { ok: false };
    update(D => void (res = giveCoffee(D, Date.now())));
    if (!res.ok) return;
    setCoffeeOpen(false);
    interact(); sfx('tap'); haptic('success');
    later(() => {
      jump(); setBurst(b => b + 1);
      const joy = ['Kahve! Çok mutlu oldum, teşekkürler! ☕💛', 'Mmm, tam kıvamında! Sen harikasın 🥹', 'Her sabahın kahvesi sensin ✨'];
      say(res.gift ? tx('Sana bir hediyem var! 🎁') : tx(joy[rnd(joy.length)]!), 'cheer', 4200);
      if (res.gift) later(() => setGift(res.gift!), 1800);
    }, 350);
  };

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
  // Hak bitip Moka dinlenirken kendi kendine konuşmaz (sürahi ve boşta repliği susar).
  const restingRef = useRef(false);
  useEffect(() => {
    quietRef.current = busy || composing || restingRef.current;
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
      if (restingRef.current) return;
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
    const t = setTimeout(() => { if (!restingRef.current) say(line(night ? 'idleNight' : 'idleDay', rnd(9)), night ? 'sleepy' : 'happy', 4200); }, 20000 + rnd(10000));
    return () => clearTimeout(t);
  }, [bump, idleOff, night, lastId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fresh0 = !lastSaid || lastSaid.id === 0;
  const shownIt = lastSaid ?? HELLO;
  // Balonda ne var: öncelik sırasıyla.
  const bubbleKey = notes ? 'notes' : busy ? 'busy' : lockMsg ? `lock:${lockMsg}` : quip && !gone.includes(`q:${quip}`) ? `q:${quip}` : !fresh0 ? `m:${shownIt.id}` : intro ? `i:${intro}` : 'open';
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
    if (k !== 'bitki') haptic('light');
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
  // Hak bitince Moka gün boyu uykulu (dokununca kısa tepkiler yine olur).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lockBye = useMemo(() => byeLine(), [lockMsg]);
  // Veda balonu çıkana kadar (ya da odaya hak bitmiş hâlde girilince) uyanık kalmaz.
  const resting = status === 'account' && premium.active && !!left && left.day <= 0 && (items.some(i => i.bye) || !items.some(i => i.role === 'user'));
  useEffect(() => {
    restingRef.current = resting;
    quietRef.current = busy || composing || resting;
  }, [resting, busy, composing]);
  const baseMood = resting ? 'sleepy' : !fresh0 ? mood : !woke ? 'sleepy' : opening.mood;
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
  const tailX = Math.min(Math.max(26, mokaCx - 24 - bl.x), Math.max(26, bl.w - 26));
  const headClearance = S.play.mokaWorn?.bas ? mokaSize * 0.2 : 0;
  const bubbleBottom = winH - (mokaTop + mokaSize * 0.08) + headClearance;
  const bubbleMax = Math.max(110, kb ? winH * 0.24 : mokaTop - headClearance - (insets.top + 70));
  const paper = night ? D.paperNight : D.paper;
  const say0 = (t: string) => <Text maxFontSizeMultiplier={1.3} style={[st.say, { color: D.ink }]}>{tx(t)}</Text>;
  const bubbleBody = notes ? (
    <View style={{ gap: 10 }}>
      <View style={st.notesHead}>
        <View style={[st.menuIc, { backgroundColor: D.cream }]}><Icon name="note" color={D.ink} size={18} /></View>
        <Text style={[st.notesTitle, { color: D.ink, flex: 1 }]}>{tx('Notlarım')}</Text>
        <Squish onPress={() => setNotes(false)} hitSlop={10} accessibilityLabel={tx('Kapat')} style={[st.iconBtn, { backgroundColor: D.cream }]}>
          <Icon name="close" color={D.soft} size={16} />
        </Squish>
      </View>
      <NotesList />
    </View>
  ) : busy ? (
    <View style={st.typing} accessibilityLabel={tx('Moka düşünüyor…')}>
      <TypingDots color={D.soft} />
    </View>
  ) : lockMsg ? (
    <Appear key={lockMsg}>
      {say0(lockMsg === 'login' ? line('lockLogin') : lockMsg === 'premium' ? line('lockPremium') : lockBye)}
      {lockMsg !== 'tomorrow' && (
        <Squish onPress={() => router.push(lockMsg === 'login' ? '/giris' : '/premium')} accessibilityLabel={tx(lockMsg === 'login' ? 'Hesap aç' : "Premium'a bak")} style={[st.cta, { backgroundColor: c.accent }]}>
          <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.bodyBlack, fontSize: 14, color: c.onAccent }}>{tx(lockMsg === 'login' ? 'Hesap aç' : "Premium'a bak")}</Text>
        </Squish>
      )}
    </Appear>
  ) : bubbleKey.startsWith('q:') ? (
    <Appear key={quip}>{say0(quip)}</Appear>
  ) : !fresh0 ? (
    <Appear key={shownIt.id}>
      <Bubble item={shownIt} room typed={!reduce && fresh.has(shownIt.id)} onUndo={undoItem} onConfirm={confirmItem} onRetry={retry} />
    </Appear>
  ) : intro ? (
    <Appear key={intro}>{say0(line(INTRO_LINE[intro]))}</Appear>
  ) : (
    <Appear key={woke ? 'awake' : 'asleep'}>{say0(woke && opening.sleeping ? line('back') : opening.text)}</Appear>
  );
  const shift = (x: number, y: number) => [
    { translateX: tilt.x.interpolate({ inputRange: [-1, 1], outputRange: [x, -x] }) },
    { translateY: tilt.y.interpolate({ inputRange: [-1, 1], outputRange: [y, -y] }) },
  ];
  const talk = items.filter(i => i.id !== 0);
  const face = mimikFor(fur);
  // Menü ve geçmiş paneli yaylanarak açılır, kısa bir solmayla kapanır (kapanırken de ekranda kalır).
  const [menuOn, menuA] = usePresence(menu, reduce);
  const [logOn, logA] = usePresence(logOpen, reduce);
  const hasText = !!text.trim();
  const [sendA] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) { sendA.setValue(hasText ? 1 : 0); return; }
    const a = Animated.spring(sendA, { toValue: hasText ? 1 : 0, friction: 6, tension: 160, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [hasText, reduce, sendA]);
  const toggleLog = () => { interact(); haptic('light'); setMenu(false); setLogOpen(o => !o); };
  const logNode = logOn && (
    <Animated.View
      style={[st.log, { backgroundColor: paper, shadowColor: D.shade, maxHeight: logH }, {
        opacity: logA,
        transform: [{ translateY: logA.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }, { scale: logA.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
      }]}
    >
      <View style={st.logHead}>
        <View style={{ flex: 1 }}>
          <Text maxFontSizeMultiplier={1.3} style={[st.logTitle, { color: D.ink }]}>{tx('Sohbet geçmişi')}</Text>
          <Text maxFontSizeMultiplier={1.3} style={[st.logSub, { color: D.soft }]}>{tx('Sadece bu oturumda kalır, telefona kaydedilmez')}</Text>
        </View>
        {talk.length > 0 && (
          <Squish onPress={clear} accessibilityLabel={tx('Sohbeti temizle')} hitSlop={8} style={[st.iconBtn, { backgroundColor: D.cream }]}><Icon name="trash" color={D.soft} size={16} /></Squish>
        )}
        <Squish onPress={() => setLogOpen(false)} accessibilityLabel={tx('Kapat')} hitSlop={8} style={[st.iconBtn, { backgroundColor: D.cream }]}><Icon name="close" color={D.soft} size={16} /></Squish>
      </View>
      <View style={[st.logRule, { backgroundColor: D.line }]} />
      <ScrollView ref={logRef} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 4, paddingTop: 4, paddingBottom: 2 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} onContentSizeChange={() => logRef.current?.scrollToEnd({ animated: true })}>
        {talk.length === 0 ? (
          <View style={st.logEmpty}>
            <Image source={face.happy} style={{ width: 44, height: 44 }} />
            <Text maxFontSizeMultiplier={1.3} style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 20, color: D.soft }}>{tx('Henüz mesaj yok. Moka seni bekliyor ☕')}</Text>
          </View>
        ) : talk.map((i, k) => {
          const me = i.role === 'user';
          const next = talk[k + 1];
          const tail = !next || next.role !== i.role; // grubun son balonu: kuyruk ve avatar
          const prev = talk[k - 1];
          const gap = prev && prev.role !== i.role ? 8 : 0;
          return (
            <View key={i.id} style={[st.logRow, { justifyContent: me ? 'flex-end' : 'flex-start', marginTop: gap }]}>
              {!me && (tail
                ? <View style={[st.ava, { backgroundColor: D.cream, borderColor: D.line }]}><Image source={i.error ? face.sad : mimikOf(i.content) === 'sad' ? face.sad : face.happy} style={{ width: 30, height: 30, marginTop: 4 }} /></View>
                : <View style={{ width: 28 }} />)}
              <View style={[st.msg, me
                ? [{ backgroundColor: c.accent }, tail && (RTL ? st.msgMoka : st.msgMe)]
                : [{ backgroundColor: i.error ? D.paperNight : D.cream, borderColor: D.line, borderWidth: StyleSheet.hairlineWidth }, tail && (RTL ? st.msgMe : st.msgMoka)]]}
              >
                <Text {...(i.error ? {} : NOTX)} maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, lineHeight: 20, color: me ? c.onAccent : D.ink }}>{i.content}</Text>
                {!!i.done?.length && <Text maxFontSizeMultiplier={1.3} style={{ marginTop: 4, fontFamily: fonts.bodyBlack, fontSize: 12, color: D.soft }}>{`✓ ${i.done.join(' · ')}`}</Text>}
              </View>
            </View>
          );
        })}
        {busy && (
          <View style={[st.logRow, { marginTop: 8 }]}>
            <View style={[st.ava, { backgroundColor: D.cream, borderColor: D.line }]}><Image source={face.talk} style={{ width: 30, height: 30, marginTop: 4 }} /></View>
            <View style={[st.msg, RTL ? st.msgMe : st.msgMoka, { backgroundColor: D.cream, borderColor: D.line, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 12 }]}>
              <View style={{ flexDirection: 'row', gap: 5 }}><TypingDots color={D.soft} /></View>
            </View>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
  const potCold = pot === 'cold' || pot === 'first';
  const menuRows: [IconName, string, () => void, string?][] = [
    ['note', 'Notlarım', () => setNotes(n => !n), S.play.notes.length ? String(S.play.notes.length) : undefined],
    ['history', 'Sohbet geçmişi', () => setLogOpen(true), talk.length ? String(talk.length) : undefined],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#1C1712' }}>
      {/* Oda: taban sabit, katmanlar eğimle farklı miktarda kayar (hafif 3B). */}
      <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { transform: [{ translateY: lift }] }]}>
      <RoomBackdrop
        cheer={burst} phase={phase} sky={sky.kind} warm={room.warm} dust={opening.sleeping ? (woke ? 0 : room.dust) : room.dust} lampOff={lampOff}
        steam={potSteam(pot)} potGlow={pot === 'fresh'} brew={brew} chain={Math.min(7, shownStreak)} tilt={tilt}
        onTouch={touchObj} onReady={onRoomReady} style={StyleSheet.absoluteFill}
      />
      {/* Moka katmanı odadan biraz fazla kayar. */}
      <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { transform: shift(3, 2) }]}>
        <Pressable onPress={mokaTap} onLongPress={() => { haptic('light'); router.push('/moka-tasarim' as Href); }} delayLongPress={450} accessibilityHint={tx('Moka\'nı tasarla için basılı tut')} accessibilityLabel={tx('Moka')} style={{ position: 'absolute', left: mokaLeft, top: mokaTop, width: mokaSize, height: mokaSize }}>
          <Animated.View
            style={{
              width: mokaSize,
              height: mokaSize,
              opacity: enter,
              transform: [
                { translateY: Animated.add(enter.interpolate({ inputRange: [0, 1], outputRange: [mokaSize * 0.035, 0] }), hop.interpolate({ inputRange: [-0.35, 0, 1], outputRange: [mokaSize * 0.03, 0, -mokaSize * 0.1] })) },
                { scale: Animated.multiply(enter.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }), hop.interpolate({ inputRange: [-0.35, 0, 1], outputRange: [1, 1, 1.02] })) },
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
      </Animated.View>
      <Fade edge="top" color={D.shade} size={insets.top + 24} from={0} to={0.24} />

      {/* Konuşma balonu: metne sarılır, Moka'nın başının hemen üstünde; sessizken söner. */}
      {bubbleOn && (
        <Animated.View
          pointerEvents="box-none"
          style={[st.bubbleWrap, kb || logOpen ? { top: insets.top + 64 } : { bottom: bubbleBottom }, {
            opacity: enter.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 0, 1], extrapolate: 'clamp' }),
          }]}
        >
          <Appear key={bubbleKey.startsWith('q:') || bubbleKey.startsWith('m:') ? 'b' : bubbleKey}>
            <View
              onLayout={e => setBl({ x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width })}
              style={[st.bubble2, { backgroundColor: paper, shadowColor: D.shade }, notes && { width: winW - 48 }]}
              accessibilityLiveRegion="polite"
            >
              {bubbleKey.startsWith('m:') && !busy && (
                <Text maxFontSizeMultiplier={1.2} style={[st.who, { color: c.clay }]}>MOKA</Text>
              )}
              <ScrollView ref={scroll} style={{ flexGrow: 0, maxHeight: bubbleMax }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Balon her zaman krem kâğıt: koyu temada bile içindeki yazı ve düğmeler açık tema renginde (koyu mürekkep) kalır. */}
                <ForceScheme scheme="light">{bubbleBody}</ForceScheme>
              </ScrollView>
              {!kb && !logOpen && (
                <Svg width={26} height={13} style={[st.tail2, { left: tailX - 13 }]} pointerEvents="none">
                  <Path d="M0 0H26C19.5 1.5 15.5 5.5 13 13 10.5 5.5 6.5 1.5 0 0Z" fill={paper} />
                </Svg>
              )}
            </View>
          </Appear>
        </Animated.View>
      )}

      <KeyboardAvoidingView style={StyleSheet.absoluteFill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} pointerEvents="box-none">
        {/* Üst şerit: dolap ayrı, sohbet araçları kendi yükseltilmiş menüsünde. */}
        <View style={[st.head2, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
          <Squish onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityLabel={tx('Geri')} hitSlop={6} style={[st.topBtn, { backgroundColor: paper, shadowColor: D.shade, borderColor: D.cream }]}>
            <Chevron color={D.ink} size={20} />
          </Squish>
          <View style={{ flex: 1 }} pointerEvents="none" />
          <View style={[st.toolbar, { backgroundColor: paper, borderColor: D.line, shadowColor: D.shade }]}>
            <Squish onPress={() => { interact(); setMenu(false); setCoffeeOpen(true); }} accessibilityLabel={tx('Kahve: {} gün taze').replace('{}', String(hp.streak))} hitSlop={4} style={[st.toolSeg, { opacity: pot === 'wait' ? 0.8 : 1 }]}>
              <PotIcon size={22} color={D.ink} cold={potCold} />
              {shownStreak > 0 && <Appear key={shownStreak}><Text maxFontSizeMultiplier={1.2} style={[st.pillN, { color: D.ink }]}>{shownStreak}</Text></Appear>}
              {pot === 'warm' && <Icon name="snow" color={D.soft} size={13} />}
            </Squish>
            <Squish onPress={() => { interact(); haptic('light'); setMenu(false); router.push('/moka-tasarim' as Href); }} accessibilityLabel={tx("Moka'nı tasarla")} hitSlop={4} style={[st.toolCustomize, { backgroundColor: '#DFE9DA' }]}>
              <Icon name="hanger" color="#385342" size={19} />
              <Text maxFontSizeMultiplier={1.1} style={{ fontFamily: fonts.bodyBold, fontSize: 13.5, color: '#314C3B' }}>{tx('Dolap')}</Text>
            </Squish>
            <Squish onPress={() => { interact(); haptic('light'); setMenu(m => !m); }} accessibilityLabel={tx('Sohbet araçları')} accessibilityState={{ expanded: menu }} hitSlop={4} style={[st.toolMore, { backgroundColor: D.ink }]}>
              <View style={st.menuGlyph}>
                <Animated.View style={[st.glyphLayer, { opacity: menuA.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ rotate: menuA.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '35deg'] }) }] }]}>
                  <Icon name="grid" color={D.paper} size={17} />
                </Animated.View>
                <Animated.View style={[st.glyphLayer, { opacity: menuA, transform: [{ rotate: menuA.interpolate({ inputRange: [0, 1], outputRange: ['-35deg', '0deg'] }) }] }]}>
                  <Icon name="close" color={D.paper} size={18} />
                </Animated.View>
              </View>
            </Squish>
          </View>
        </View>

        <View style={{ flex: 1 }} pointerEvents="none" />

        {logNode}
        {/* Gönderilen mesaj: kendi balonunda, yazı çubuğunun hemen üstünde. Okundu işareti Moka cevaplayınca dolar. */}
        {!!sent && !logOpen && (
          <SentBubble key={sent.id} text={sent.text} read={!busy} color={c.accent} ink={c.onAccent} reduce={reduce} />
        )}
        {composing ? (
          <View style={{ paddingHorizontal: 16, paddingBottom: kb ? 10 : Math.max(insets.bottom, 10) + 6, gap: 10 }}>
            {!hasText && !busy && !sent && !logOpen && (
              <Appear>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }} style={{ flexGrow: 0, marginHorizontal: -16 }}>
                  {ideas.map(x => (
                    <Squish key={x} onPress={() => send(tx(x))} accessibilityLabel={tx(x)} scaleTo={0.96} style={[st.idea, { backgroundColor: paper, borderColor: D.line, shadowColor: D.shade }]}>
                      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 13.5, color: D.ink }}>{tx(x)}</Text>
                    </Squish>
                  ))}
                </ScrollView>
              </Appear>
            )}
            <View style={[st.compose, { backgroundColor: paper, shadowColor: D.shade, borderColor: D.cream }]}>
              <Squish onPress={toggleLog} accessibilityLabel={tx('Sohbet geçmişi')} accessibilityState={{ expanded: logOpen }} hitSlop={6} style={[st.logBtn, { backgroundColor: logOpen ? D.line : D.cream }]}>
                <Icon name="history" color={D.ink} size={19} />
              </Squish>
              <TextInput
                value={text}
                onChangeText={t => { setText(t); interact(); }}
                autoFocus
                placeholder={tx("Moka'ya yaz…")}
                placeholderTextColor={D.soft}
                selectionColor={c.accent}
                cursorColor={D.ink}
                maxLength={400}
                multiline
                submitBehavior="submit"
                returnKeyType="send"
                onSubmitEditing={() => send()}
                editable={!busy}
                maxFontSizeMultiplier={1.3}
                style={[st.input, { color: D.ink }]}
              />
              {left && left.day <= 5 && !hasText && <Text style={[st.count, { color: D.soft }]}>{`☕ ${left.day}`}</Text>}
              <Squish onPress={() => send()} disabled={busy || !hasText} accessibilityLabel={tx('Gönder')} style={st.sendWrap}>
                <Animated.View style={[st.send, { backgroundColor: hasText ? c.accent : D.line, transform: [{ scale: sendA.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }, { rotate: sendA.interpolate({ inputRange: [0, 1], outputRange: ['-20deg', '0deg'] }) }] }]}>
                  <Icon name="send" color={hasText ? c.onAccent : D.soft} size={19} />
                </Animated.View>
              </Squish>
            </View>
          </View>
        ) : (
          <View style={[st.row, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
            <Squish onPress={chatPress} accessibilityLabel={tx("Moka'ya yaz")} scaleTo={0.97} style={[st.pillWrite, { backgroundColor: paper, shadowColor: D.shade, borderColor: D.line }]}>
              <View style={[st.writeIc, { backgroundColor: D.ink }]}><Icon name="chat" color={D.paper} size={20} /></View>
              {lock === 'tomorrow' ? (
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[st.pillWriteT, { color: D.ink, fontSize: 15, lineHeight: 19 }]}>{tx('Moka dinleniyor 😴')}</Text>
                  <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, lineHeight: 16, color: D.soft }}>{resetLabel()}</Text>
                </View>
              ) : (
                <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[st.pillWriteT, { color: D.soft }]}>{tx("Moka'ya yaz…")}</Text>
              )}
              {lock && (
                <View style={[st.lockTag, { backgroundColor: lock === 'premium' ? D.glow : D.cream }]}>
                  <Icon name={lock === 'login' ? 'lock' : lock === 'premium' ? 'star' : 'moon'} color={D.ink} size={13} />
                </View>
              )}
            </Squish>
            {talk.length > 0 && (
              <Squish onPress={toggleLog} accessibilityLabel={tx('Sohbet geçmişi')} accessibilityState={{ expanded: logOpen }} style={[st.circle, { backgroundColor: logOpen ? D.line : paper, shadowColor: D.shade, borderColor: D.cream }]}>
                <Icon name="history" color={D.ink} size={22} />
              </Squish>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {menuOn && (
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenu(false)} accessibilityLabel={tx('Kapat')}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: D.shade, opacity: menuA.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] }) }]} />
        </Pressable>
      )}
      {menuOn && (
        <Animated.View
          style={[st.menu, RTL ? { left: 14 } : { right: 14 }, { top: insets.top + 6 + 50 + 6 }, {
            opacity: menuA,
            transformOrigin: RTL ? 'top left' : 'top right',
            transform: [{ translateY: menuA.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }, { scale: menuA.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }],
          }]}
        >
          <Svg width={20} height={10} style={[st.menuCaret, RTL ? { left: 14 } : { right: 14 }]} pointerEvents="none"><Path d="M0 10C5 10 7 0 10 0S15 10 20 10Z" fill={paper} /></Svg>
          <View style={[st.menuFrame, { backgroundColor: D.line, shadowColor: D.shade }]}>
            <View style={[st.menuCard, { backgroundColor: paper, borderColor: D.cream }]}>
              <View style={st.menuHeading}>
                <View style={[st.menuIc, { backgroundColor: D.glow }]}><Icon name="chat" color={D.ink} size={17} /></View>
                <View style={{ flex: 1 }}>
                  <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: fonts.displayBold, fontSize: 16, lineHeight: 20, color: D.ink }}>{tx('Sohbet araçları')}</Text>
                </View>
              </View>
              <View style={[st.menuRule, { backgroundColor: D.line }]} />
              {menuRows.map(([ic, label, fn, badge]) => (
                <Squish key={label} onPress={() => { setMenu(false); interact(); fn(); }} scaleTo={0.98} accessibilityLabel={tx(label)} style={[st.menuRow, { backgroundColor: paper }]}>
                  <View style={[st.menuIc, { backgroundColor: D.cream }]}><Icon name={ic} color={D.ink} size={18} /></View>
                  <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ flex: 1, fontFamily: fonts.bodyBlack, fontSize: 15, color: D.ink }}>{tx(label)}</Text>
                  {!!badge && <View style={[st.menuBadge, { backgroundColor: D.line }]}><Text style={{ fontFamily: fonts.bodyBlack, fontSize: 12, color: D.soft }}>{badge}</Text></View>}
                  <Chevron color={D.soft} size={14} dir="right" />
                </Squish>
              ))}
              <View style={[st.menuRule, { backgroundColor: D.line }]} />
              <View style={st.menuMini}>
                {([
                  ['flag', 'Bildir', report],
                  ['trash', 'Temizle', clear],
                ] as const).map(([ic, label, fn]) => (
                  <Squish key={label} onPress={() => { setMenu(false); interact(); fn(); }} accessibilityLabel={tx(label === 'Bildir' ? 'Moka\'nın son cevabını bildir' : 'Sohbeti temizle')} scaleTo={0.96} style={[st.menuChip, { backgroundColor: D.cream, borderColor: D.line, shadowColor: D.shade }]}>
                    <Icon name={ic} color={D.soft} size={15} />
                    <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: D.soft }}>{tx(label)}</Text>
                  </Squish>
                ))}
              </View>
              <View style={[st.menuNote, { backgroundColor: D.cream, borderColor: D.line }]}>
                <Icon name="info" color={D.soft} size={14} />
                <Text maxFontSizeMultiplier={1.3} style={{ flex: 1, fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16, color: D.soft }}>
                  {tx('Moka bir yapay zekâdır; cevapları hatalı olabilir, tıbbi ya da psikolojik tavsiye değildir. Acil durumda 112’yi ara.')}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      )}
      {coverRoom && (
        <Animated.View
          pointerEvents="auto"
          style={[StyleSheet.absoluteFill, { backgroundColor: '#2F211F', zIndex: 100, opacity: roomReveal }]}
        >
          <RoomOpening reduce={reduce} />
        </Animated.View>
      )}
      <CoffeeSheet open={coffeeOpen} onClose={() => setCoffeeOpen(false)} P={S.play} now={now} streak={hp.streak} best={best} pot={pot} freezeLeft={freezeLeft} onGive={giveToMoka} />
      <GiftModal gift={gift} onClose={() => setGift(null)} onHome={() => { setGift(null); router.push('/dekor' as Href); }} />
    </View>
  );
}

/** Açılınca yaylanır, kapanınca kısa bir solmayla kaybolur; kapanma bitene dek ekranda kalır. */
function usePresence(open: boolean, reduce: boolean): [boolean, Animated.Value] {
  const [mounted, setMounted] = useState(open);
  const [a] = useState(() => new Animated.Value(open ? 1 : 0));
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
      const s = reduce ? Animated.timing(a, { toValue: 1, duration: 0, useNativeDriver: true }) : Animated.spring(a, { toValue: 1, friction: 8, tension: 110, useNativeDriver: true });
      s.start();
      return () => s.stop();
    }
    const t = Animated.timing(a, { toValue: 0, duration: reduce ? 0 : 150, easing: Easing.in(Easing.quad), useNativeDriver: true });
    t.start(({ finished }) => finished && setMounted(false));
    return () => t.stop();
  }, [open, reduce, a]);
  return [mounted, a];
}

/** Kullanıcının az önce yazdığı mesaj: sağda, kuyruklu balon; yazı çubuğundan yukarı süzülür. */
function SentBubble({ text, read, color, ink, reduce }: { text: string; read: boolean; color: string; ink: string; reduce: boolean }) {
  const [a] = useState(() => new Animated.Value(reduce ? 1 : 0));
  useEffect(() => {
    if (reduce) return;
    const s = Animated.spring(a, { toValue: 1, friction: 7, tension: 120, useNativeDriver: true });
    s.start();
    return () => s.stop();
  }, [a, reduce]);
  return (
    <Animated.View
      style={[st.sentWrap, {
        opacity: a.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
        transformOrigin: RTL ? 'bottom left' : 'bottom right',
        transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }, { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
      }]}
      accessibilityLiveRegion="polite"
    >
      <View style={[st.sent, RTL && st.sentRtl, { backgroundColor: color }]}>
        <Text {...NOTX} maxFontSizeMultiplier={1.3} numberOfLines={4} style={{ fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 21, color: ink }}>{text}</Text>
        <View style={st.sentMeta}>
          <Icon name="check" color={ink} size={12} />
          {read && <View style={{ marginLeft: -7 }}><Icon name="check" color={ink} size={12} /></View>}
        </View>
      </View>
      <Svg width={14} height={12} style={[st.sentTail, RTL && st.sentTailRtl]} pointerEvents="none"><Path d="M0 0C2 6 6 10 14 12 7 6 6 3 6 0Z" fill={color} /></Svg>
    </Animated.View>
  );
}

/** Oda düğmelerindeki çizim ikonlar (emoji yerine; her yerde aynı kalınlık). */
type IconName = 'broom' | 'plus' | 'send' | 'lock' | 'star' | 'moon' | 'more' | 'hanger' | 'grid' | 'note' | 'flag' | 'trash' | 'close' | 'check' | 'chat' | 'snow' | 'palette' | 'history' | 'info' | 'retry';
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
      {name === 'hanger' && <Path d="M9.7 7a2.4 2.4 0 1 1 3.6 2.1c-.9.5-1.3 1-1.3 2l8.1 5.1a1.2 1.2 0 0 1-.6 2.2h-15a1.2 1.2 0 0 1-.6-2.2L12 11" {...p} />}
      {name === 'grid' && (<><Rect x={5} y={5} width={5.5} height={5.5} rx={1.8} fill={color} /><Rect x={13.5} y={5} width={5.5} height={5.5} rx={1.8} fill={color} /><Rect x={5} y={13.5} width={5.5} height={5.5} rx={1.8} fill={color} /><Rect x={13.5} y={13.5} width={5.5} height={5.5} rx={1.8} fill={color} /></>)}
      {name === 'note' && (<><Path d="M6 3.5h8.5l3.5 3.5v13.5H6z" {...p} /><Path d="M9 11h6M9 15h6" {...p} /></>)}
      {name === 'flag' && (<><Path d="M5.5 21V4" {...p} /><Path d="M5.5 4.5h11l-2.2 4 2.2 4h-11" {...p} /></>)}
      {name === 'trash' && (<><Path d="M4.5 7h15" {...p} /><Path d="M9.5 7V4.5h5V7" {...p} /><Path d="M6.5 7l1 13h9l1-13" {...p} /></>)}
      {name === 'close' && <Path d="M6 6l12 12M18 6L6 18" {...p} />}
      {name === 'check' && <Path d="M5 12.5l4.5 4.5L19 7.5" {...p} strokeWidth={3} />}
      {name === 'chat' && (<><Path d="M4.5 11.5c0-4 3.4-7 7.5-7s7.5 3 7.5 7-3.4 7-7.5 7c-1 0-2-.2-2.9-.5L5 19.5l1.1-3.6c-1-1.2-1.6-2.7-1.6-4.4z" {...p} /><Circle cx={8.8} cy={11.6} r={1.1} fill={color} /><Circle cx={12} cy={11.6} r={1.1} fill={color} /><Circle cx={15.2} cy={11.6} r={1.1} fill={color} /></>)}
      {name === 'history' && (<><Path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" {...p} /><Path d="M4 4.5v3.6h3.6" {...p} /><Path d="M12 8v4.3l2.8 1.8" {...p} /></>)}
      {name === 'info' && (<><Circle cx={12} cy={12} r={8.5} {...p} /><Path d="M12 11v5.2" {...p} /><Circle cx={12} cy={7.9} r={1.2} fill={color} /></>)}
      {name === 'retry' && (<><Path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" {...p} /><Path d="M20 4.5v3.6h-3.6" {...p} /></>)}
      {name === 'snow' && <Path d="M12 3.5v17M4.6 7.75l14.8 8.5M19.4 7.75L4.6 16.25" {...p} />}
      {name === 'palette' && (<><Path d="M12 3.8c-4.8 0-8.5 3.6-8.5 8.1 0 4.3 3.4 8.3 7.5 8.3 1.4 0 2-.9 1.6-2-.5-1.3.3-2.4 1.7-2.4h2.2c2.4 0 4-1.7 4-4.1 0-4.4-3.8-7.9-8.5-7.9z" {...p} /><Circle cx={8} cy={11} r={1.2} fill={color} /><Circle cx={11} cy={7.6} r={1.2} fill={color} /><Circle cx={15.4} cy={8.6} r={1.2} fill={color} /></>)}
    </Svg>
  );
}

/** Kameraya yakın katman: iki büyük, bulanık ışık lekesi (en çok kayar) ve köşelerde hafif çerçeve. */
const BOKEH = [{ x: 0.06, y: 0.22, r: 0.18 }, { x: 0.96, y: 0.7, r: 0.16 }];
function RoomOpening({ reduce }: { reduce: boolean }) {
  const [steam] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(Animated.timing(steam, {
      toValue: 1, duration: 1450, easing: Easing.linear, useNativeDriver: true, isInteraction: false,
    }));
    loop.start();
    return () => loop.stop();
  }, [reduce, steam]);
  return (
    <View style={StyleSheet.absoluteFill} accessible accessibilityRole="progressbar" accessibilityLabel={tx('Yükleniyor…')}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="room-opening" x1="0%" y1="0%" x2="65%" y2="100%">
            <Stop offset="0" stopColor="#593A2F" />
            <Stop offset="0.54" stopColor="#352322" />
            <Stop offset="1" stopColor="#211A20" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#room-opening)" />
      </Svg>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <View style={{ width: 238, height: 268, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={ISIK} tintColor="#F5BA75" style={{ position: 'absolute', width: 290, height: 290, opacity: 0.32 }} />
          <View style={{ position: 'absolute', width: 207, height: 238, borderWidth: 1, borderColor: '#B57E52', borderTopLeftRadius: 108, borderTopRightRadius: 108, borderBottomLeftRadius: 31, borderBottomRightRadius: 31, backgroundColor: '#51382F' }} />
          <View style={{ position: 'absolute', width: 187, height: 218, borderWidth: 1, borderColor: '#7A5640', borderTopLeftRadius: 98, borderTopRightRadius: 98, borderBottomLeftRadius: 23, borderBottomRightRadius: 23 }} />
          <View style={{ position: 'absolute', bottom: 39, width: 156, height: 22, borderRadius: 90, backgroundColor: '#352222' }} />
          <Animated.View style={{ transform: [{ translateY: reduce ? 0 : steam.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -5, 0] }) }] }}>
            <Image source={MOKA_ASSETS.sipping} fadeDuration={0} style={{ width: 156, height: 156 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          </Animated.View>
          {!reduce && [0, 1, 2].map(i => {
            const offset = i / 3;
            const phase = steam.interpolate(i === 0 ? {
              inputRange: [0, 1], outputRange: [0, 1],
            } : {
              inputRange: [0, offset - 0.001, offset, 1], outputRange: [1 - offset, 1, 0, 1 - offset],
            });
            return <Animated.View key={i} style={{
              position: 'absolute', left: 148 + i * 8, top: 102 - i * 7,
              width: 6 + i * 3, height: 6 + i * 3, borderRadius: 10, backgroundColor: '#FFE2B4',
              opacity: phase.interpolate({ inputRange: [0, 0.24, 1], outputRange: [0, 0.66, 0] }),
              transform: [
                { translateX: phase.interpolate({ inputRange: [0, 1], outputRange: [0, 13 + i * 4] }) },
                { translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [0, -32 - i * 7] }) },
                { scale: phase.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.35] }) },
              ],
            }} />;
          })}
          {[{ left: 37, top: 67, size: 5 }, { left: 190, top: 65, size: 7 }, { left: 197, top: 187, size: 4 }].map(p => (
            <View key={p.left} style={{ position: 'absolute', left: p.left, top: p.top, width: p.size, height: p.size, backgroundColor: '#DCAE78', transform: [{ rotate: '45deg' }] }} />
          ))}
        </View>
      </View>
    </View>
  );
}

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

function Bubble({ item, typed, room, onUndo, onConfirm, onRetry }: { item: Item; typed: boolean; room?: boolean; onUndo: (id: number) => void; onConfirm: (id: number, yes: boolean) => void; onRetry?: (id: number) => void }) {
  const c = useColors();
  const { state: S } = useStore();
  const router = useRouter();
  const me = item.role === 'user';
  const shown = useTyped(item.content, typed, () => fresh.delete(item.id));
  return (
    <View style={{ gap: 6, alignItems: me ? 'flex-end' : 'flex-start' }}>
      <View style={[st.bubble, me ? st.me : st.moka, room ? st.roomBubble : { backgroundColor: me ? c.accent : item.error ? c.surface2 : c.surface }]}>
        <Text {...(me || !item.error ? NOTX : {})} style={{ fontFamily: fonts.bodyBold, fontSize: room ? 16 : 15, lineHeight: room ? 24 : 22, color: me ? c.onAccent : c.ink }}>{shown}</Text>
      </View>
      {item.retry && onRetry && (
        <Squish onPress={() => onRetry(item.id)} accessibilityLabel={tx('Tekrar dene')} style={[st.done, st.retry, { backgroundColor: c.accent }]}>
          <Icon name="retry" color={c.onAccent} size={15} />
          <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 13, color: c.onAccent }}>{tx('Tekrar dene')}</Text>
        </Squish>
      )}
      {item.cta && (
        <Btn small kind="primary" label={tx(item.cta === 'login' ? 'Giriş yap / üye ol' : "Premium'a bak ⭐")} onPress={() => router.push(item.cta === 'login' ? '/giris' : '/premium')} />
      )}
      {item.done?.map((d, i) => (
        <View key={i} style={[st.done, { backgroundColor: c.sageSoft }]}>
          <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 12, color: c.ink }}>{d}</Text>
        </View>
      ))}
      {item.undo?.length && !item.undone ? (
        <Squish onPress={() => onUndo(item.id)} accessibilityLabel={tx('↩️ Geri al')} style={[st.done, { backgroundColor: c.surface, borderColor: c.line, borderWidth: 1 }]}>
          <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 12, color: c.ink }}>{tx('↩️ Geri al')}</Text>
        </Squish>
      ) : null}
      {item.confirm?.length && !item.confirmed ? (
        <View style={{ gap: 6, alignItems: 'flex-start' }}>
          {item.confirm.map((a, i) => (
            <Text key={i} style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: c.ink }}>{describeAction(S, a)}</Text>
          ))}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn small kind="primary" label={tx('Evet, sil')} onPress={() => onConfirm(item.id, true)} />
            <Btn small kind="ghost" label={tx('Vazgeç')} onPress={() => onConfirm(item.id, false)} />
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
  if (!notes.length) return <T v="small">{tx('Henüz not yok. Moka\'ya "yarın için not al: …" de.')}</T>;
  return (
    <>
      {notes.map(n => (
        <View key={n.id} style={[st.note, { backgroundColor: c.surface }]}>
          <View style={{ flex: 1 }}>
            <T v="tiny">{noteDayLabel(n.day)}</T>
            <T>{n.text}</T>
          </View>
          <Pressable onPress={() => update(D => void (D.play.notes = D.play.notes.filter(x => x.id !== n.id)))} accessibilityLabel={tx('Notu sil')} hitSlop={8}>
            <Text style={{ color: c.muted, lineHeight: 26, fontSize: 20 }}>×</Text>
          </Pressable>
        </View>
      ))}
    </>
  );
}


const raised = { shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 } as const;
const st = StyleSheet.create({
  roomBubble: { maxWidth: '100%', backgroundColor: 'transparent', paddingHorizontal: 0, paddingVertical: 0, alignSelf: 'stretch' },
  // Üst şerit
  head2: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 2 },
  topBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, ...raised },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 2, padding: 3, borderRadius: 25, borderWidth: 1, ...raised },
  toolSeg: { minWidth: 40, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 7 },
  toolCustomize: { minHeight: 42, borderRadius: 21, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 10 },
  toolMore: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  menuGlyph: { width: 22, height: 22 },
  glyphLayer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  pillN: { fontFamily: fonts.displayBold, fontSize: 16, lineHeight: 20 },
  // Menü
  menu: { position: 'absolute', zIndex: 10, width: 292 },
  menuCaret: { position: 'absolute', top: -9, zIndex: 2 },
  menuFrame: { borderRadius: 24, padding: 2, borderWidth: 1, borderColor: 'rgba(255,249,235,0.7)', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 16 },
  menuCard: { borderRadius: 21, padding: 9, borderWidth: 1 },
  menuHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 5, paddingTop: 4, paddingBottom: 2 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 8, borderRadius: 14 },
  menuIc: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  menuBadge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  menuRule: { height: StyleSheet.hairlineWidth, marginHorizontal: 10, marginVertical: 6 },
  menuMini: { flexDirection: 'row', gap: 8, paddingHorizontal: 4 },
  menuChip: { flex: 1, height: 40, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10, borderWidth: 1, shadowOpacity: 0.08, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  menuNote: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderRadius: 16, borderWidth: 1, padding: 10, margin: 4, marginTop: 8 },
  // Moka balonu
  say: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 25 },
  who: { fontFamily: fonts.bodyBlack, fontSize: 10.5, letterSpacing: 1.2, marginBottom: 2 },
  bubbleWrap: { position: 'absolute', left: 22, right: 22, alignItems: 'center' },
  bubble2: { minWidth: 120, maxWidth: '100%', borderRadius: 24, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 13, shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 9 },
  tail2: { position: 'absolute', bottom: -12 },
  typing: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 9, paddingHorizontal: 6 },
  notesHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notesTitle: { fontFamily: fonts.displayBold, fontSize: 18 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cta: { alignSelf: 'flex-start', marginTop: 10, minHeight: 40, justifyContent: 'center', borderRadius: radius.pill, paddingHorizontal: 18 },
  // Gönderilen mesaj
  sentWrap: { alignSelf: 'flex-end', maxWidth: '78%', marginHorizontal: 18, marginBottom: 12 },
  sent: { borderRadius: 22, borderBottomRightRadius: 8, paddingLeft: 15, paddingRight: 12, paddingTop: 9, paddingBottom: 7, ...raised },
  sentMeta: { flexDirection: 'row', alignSelf: 'flex-end', marginTop: 2, opacity: 0.75 },
  sentTail: { position: 'absolute', right: -6, bottom: 0 },
  sentRtl: { borderBottomRightRadius: 22, borderBottomLeftRadius: 8 },
  sentTailRtl: { right: undefined, left: -6, transform: [{ scaleX: -1 }] },
  // Alt sıra
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  circle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1, ...raised },
  pillWrite: { flex: 1, height: 56, borderRadius: radius.pill, flexDirection: 'row', gap: 10, alignItems: 'center', paddingLeft: 8, paddingRight: 14, borderWidth: 1, ...raised },
  writeIc: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pillWriteT: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 16 },
  lockTag: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  compose: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, minHeight: 56, borderRadius: 28, paddingLeft: 6, paddingRight: 4, paddingVertical: 4, borderWidth: 1, ...raised },
  input: { flex: 1, minHeight: 46, maxHeight: 110, paddingTop: 12, paddingBottom: 12, paddingHorizontal: 6, fontFamily: fonts.bodyBold, fontSize: 16, textAlignVertical: 'center' },
  count: { alignSelf: 'center', fontFamily: fonts.bodyBold, fontSize: 12.5, marginRight: 2 },
  logBtn: { width: 40, height: 40, borderRadius: 20, marginBottom: 3, alignItems: 'center', justifyContent: 'center' },
  sendWrap: { width: 48, height: 48 },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  idea: { height: 40, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 16, shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  // Geçmiş
  log: { marginHorizontal: 12, marginBottom: 10, borderRadius: 26, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10, shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 9 },
  logHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4 },
  logTitle: { fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 22 },
  logSub: { fontFamily: fonts.body, fontSize: 11.5, lineHeight: 15 },
  logRule: { height: StyleSheet.hairlineWidth, marginTop: 10, marginBottom: 4 },
  logEmpty: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  logRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  ava: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, overflow: 'hidden', alignItems: 'center' },
  msg: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8 },
  msgMe: { borderBottomRightRadius: 6 },
  msgMoka: { borderBottomLeftRadius: 6 },
  // Balon içi (sohbet cevabı)
  bubble: { maxWidth: '86%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  moka: { borderBottomLeftRadius: 6, alignSelf: 'flex-start' },
  me: { borderBottomRightRadius: 6 },
  done: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.tile, padding: 14 },
});

/** Moka'nın hediyesi: eşya, evine yerleştiğini ya da depoda beklediğini söyler. */
function GiftModal({ gift, onClose, onHome }: { gift: { id: string; room: string | null } | null; onClose: () => void; onHome: () => void }) {
  const c = useColors();
  const D = c.den;
  const item = gift ? ITEM[gift.id] : null;
  return (
    <Modal visible={!!item} transparent statusBarTranslucent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(42,28,18,0.45)' }]} onPress={onClose} accessibilityRole="button" accessibilityLabel={tx('Kapat')} />
      <View pointerEvents="box-none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        {item && gift && (
          <Appear>
            <View style={{ backgroundColor: D.paper, borderRadius: 28, padding: 24, alignItems: 'center', gap: 8, width: 290, shadowColor: D.shade, shadowOpacity: 0.25, shadowRadius: 18, elevation: 10 }}>
              <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: D.soft }}>{tx('Moka\'dan hediye 🎁')}</Text>
              <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: D.glow, opacity: 0.35 }} />
                <Float amp={4} dur={1900}><Text style={{ fontSize: 64, lineHeight: 78 }}>{item.emoji}</Text></Float>
                <Float amp={5} dur={2300} delay={400} style={{ position: 'absolute', top: 2, right: 6 }}><Text style={{ fontSize: 20 }}>✨</Text></Float>
                <Float amp={4} dur={2000} delay={900} style={{ position: 'absolute', bottom: 6, left: 4 }}><Text style={{ fontSize: 16 }}>💛</Text></Float>
              </View>
              <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.displayBold, fontSize: 22, color: D.ink, textAlign: 'center' }}>{tx(item.name)}</Text>
              <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: D.soft, textAlign: 'center' }}>
                {tx(gift.room ? '{} evine yerleşti' : '{} depoda seni bekliyor').replace('{}', tx(item.name))}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <Btn label={tx('Teşekkürler Moka!')} onPress={onClose} />
                <Btn label={tx('Eve bak')} onPress={onHome} />
              </View>
            </View>
          </Appear>
        )}
      </View>
    </Modal>
  );
}
