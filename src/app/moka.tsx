import { useRouter } from '@/lib/nav';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Animated, Easing, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { Glass } from '@/components/Glass';
import { RoomMoka } from '@/components/RoomMoka';
import { Fade } from '@/components/SceneImage';
import { ISIK } from '@/constants/oda';
import { mokaLevel } from '@/domain/mokaLevel';
import { useTilt } from '@/hooks/useTilt';
import { odaMap, RoomBackdrop, type RoomTouch } from '@/components/RoomBackdrop';
import { AddSheet } from '@/components/TabBar';
import { Appear, Burst, Squish, useReduceMotion } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { Btn, Chevron, Field, T } from '@/components/ui';
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
import { FURS, type FurId } from '@/constants/moka-look';
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
/** Premium olmayan kullanıcı bu oturumda kaç mesaj yazdı (ilk mesaja uzun tanıtım, sonrakilere kısa yönlendirme). */
let freeAsked = 0;
let cannedN = 0;
/** Bugün "hepsi bitti" kutlaması gösterildi mi (oturumda bir kez). */
let celebrated = '';
const INTRO_LINE = { tap: 'introTap', hello: 'introHello', objects: 'introObjects', color: 'introColor' } as const;
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
  const [focused, setFocused] = useState(false);
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
    memory = [HELLO];
    setItems(memory);
    toast('Sohbet temizlendi 🧹');
  };

  // Oda: Moka yastığın üstünde. Klavye açılınca küçülüp yukarı çıkar.
  const map = odaMap(winW, winH);
  // Yastığın ortası (oda resmi koordinatı): Moka'nın ayakları yastığın üst yüzeyine basar.
  const mokaSize = Math.round(Math.min(winW * 0.66, 320) * (kb ? 0.7 : 1));
  // Resmin altında %4 boşluk var: ayaklar yastığa bassın diye o kadar aşağı.
  const mokaBottom = (kb ? winH * 0.52 : map.oy + SEAT.y * map.s) + mokaSize * 0.04;
  const mokaLeft = kb ? (winW - mokaSize) / 2 : map.ox + SEAT.x * map.s - mokaSize / 2;
  // Giriş: Moka alttaki tuştan yastığa uçar (oda yığının yumuşak geçişiyle açılır), balon biraz sonra belirir.
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
  const day = useMemo(() => {
    const x = chatCtx(S);
    const refs = allTasks(S);
    const plantDue = refs.find(r => r.list === 'plants' && r.s.k !== 'ok')?.t.name ?? null;
    return { late: x.late, due: x.due, total: refs.length, shopEmpty: x.shop.length === 0, plantDue };
  }, [S]);
  const chatCtxLite = day;
  const sky = useSky(true);
  const [mix, setMix] = useState(() => nightMix());
  useEffect(() => {
    const id = setInterval(() => setMix(nightMix()), 60000);
    return () => clearInterval(id);
  }, []);
  // İlk cümle girişte bir kez seçilir (gün içinde değişse de ekran açıkken sabit kalır).
  const [opening] = useState(() => openingLine({ hour: new Date().getHours(), done: room.done, due: day.due, late: day.late, total: day.total, away: room.away }, Math.floor(Math.random() * 97)));
  // İlk ziyaret: Moka uyur, dokununca uyanır, odayı tanıtır ve kürk rengi ister (bir kez).
  const [intro, setIntro] = useState<'tap' | 'hello' | 'objects' | 'color' | null>(() => (S.play.roomIntro ? null : 'tap'));
  const [woke, setWoke] = useState(() => !opening.sleeping && !!S.play.roomIntro);
  const fur = S.play.mokaFur ?? null;
  const finishIntro = () => {
    setIntro(null);
    update(D => void (D.play.roomIntro = true));
  };
  const pickFur = (id: FurId) => {
    sfx('tap');
    haptic('light');
    update(D => void (D.play.mokaFur = id === 'orman' ? null : id));
    jump();
    say(line('introNice'), 'cheer', 3000);
    finishIntro();
  };
  const [lampOff, setLampOff] = useState(false);
  const [quip, setQuip] = useState('');
  const [bump, setBump] = useState(0); // etkileşim sayacı: boşta sayacı sıfırlar
  const [moodOv, setMoodOv] = useState<'cheer' | 'wow' | 'happy' | 'sleepy' | null>(null);
  const [hop] = useState(() => new Animated.Value(0));
  const [burst, setBurst] = useState(0);
  const tapN = useRef(0);
  const interact = () => setBump(b => b + 1);
  /** Kısa süreli Moka repliği (balonda), sonra açılış cümlesine ya da son cevaba döner. */
  const say = (s: string, mood: typeof moodOv = 'happy', ms = 3800) => {
    setQuip(s);
    setMoodOv(mood);
    later(() => { setQuip(q => (q === s ? '' : q)); setMoodOv(null); }, ms);
  };
  const jump = () => {
    if (reduce) return;
    hop.setValue(0);
    Animated.sequence([
      Animated.timing(hop, { toValue: 1, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(hop, { toValue: 0, friction: 3, tension: 160, useNativeDriver: true }),
    ]).start();
  };
  // Bugünün bütün işleri bitti: oturumda bir kez yıldız saçılması.
  useEffect(() => {
    if (opening.key !== 'allDone' || celebrated === dayStamp()) return;
    celebrated = dayStamp();
    const t = setTimeout(() => { setBurst(1); sfx('done'); }, 700);
    return () => clearTimeout(t);
  }, [opening.key]);
  // Boşta: 15-25 sn dokunulmazsa Moka kendi kendine bir şey söyler (gece uykulu).
  const idleOff = busy || !!text.trim() || notes || reduce || !woke || !!quip || !!intro;
  useEffect(() => {
    if (idleOff) return;
    const t = setTimeout(() => {
      const night = mix > 0.5;
      say(line(night ? 'idleNight' : 'idleDay', rnd(9)), night ? 'sleepy' : 'happy', 4200);
    }, 15000 + rnd(10000));
    return () => clearTimeout(t);
  }, [bump, idleOff, mix, lastId]); // eslint-disable-line react-hooks/exhaustive-deps
  const mokaTap = () => {
    interact();
    sfx('tap');
    haptic('light');
    jump();
    if (!woke && intro === 'tap') {
      setWoke(true);
      setIntro('hello');
      later(() => setIntro(i => (i === 'hello' ? 'objects' : i)), 3800);
      later(() => setIntro(i => (i === 'objects' ? 'color' : i)), 8000);
      return;
    }
    if (!woke) {
      // Uzun aradan sonra: Moka uyanır, toz kalkar.
      setWoke(true);
      say(line('back', rnd(5)), 'cheer', 4500);
      return;
    }
    say(line('tap', tapN.current++), tapN.current % 4 === 1 ? 'wow' : 'cheer', 2400);
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
    } else if (k === 'kupa') say(line('mug'), 'happy');
    else if (k === 'bitki') say(day.plantDue ? line('plantDue', 0, day.plantDue) : line('plant'), 'happy');
    else say(windowLine(sky.kind, mix > 0.5), 'wow');
  };
  const fresh0 = !last || last.id === 0;
  const baseMood = !fresh0 ? mood : !woke ? 'sleepy' : opening.mood;
  const hint = busy ? tx('Moka düşünüyor…') : text.trim() ? tx('Moka seni dinliyor…') : '';
  const shownIt = last ?? HELLO;
  // Misafir ve ücretsiz üyede yazı çubuğu yerine kilit hapı: önce yazdırıp sonra reddetmek yok. Premium'da hak bitince yarına kadar kapalı.
  const lock: 'login' | 'premium' | 'tomorrow' | null = status !== 'account' ? 'login' : !premium.active ? 'premium' : left && left.day <= 0 ? 'tomorrow' : null;
  const lockLabel = lock === 'login' ? tx('Moka ile konuşmak için hesap aç') : lock === 'premium' ? tx('Moka ile sohbet Premium\'da ⭐') : lock === 'tomorrow' ? tx('Bugünlük çok konuştuk, yarın devam ☕') : '';
  const ideas = useMemo(() => pickIdeas(chatCtxLite.late, chatCtxLite.shopEmpty, new Date().getHours()), [chatCtxLite.late, chatCtxLite.shopEmpty]);

  const lv = mokaLevel(S.play.moka).level;
  const sub = hint || (left && left.day <= 5 ? tx('Bugün kalan: {n}').replace('{n}', String(left.day)) : tx('Seviye {}').replace('{}', String(lv)));
  const mokaTop = mokaBottom - mokaSize;
  const bubbleW = Math.min(winW - 40, 380);
  // Balon Moka'nın başının üstünde durur, kuyruğu Moka'ya bakar. Klavye açıkken başlığın altına çıkar.
  const bubbleBottom = winH - (mokaTop + mokaSize * 0.1);
  const bubbleMax = Math.max(120, (kb ? winH * 0.26 : mokaTop + mokaSize * 0.1 - (insets.top + 72)));
  const tailX = Math.min(bubbleW - 36, Math.max(36, mokaLeft + mokaSize / 2 - (winW - bubbleW) / 2));
  const deg = (v: Animated.Value, k: number) => v.interpolate({ inputRange: [-1, 1], outputRange: [`${-k}deg`, `${k}deg`] });
  const px = (v: Animated.Value, k: number) => v.interpolate({ inputRange: [-1, 1], outputRange: [-k, k] });
  const bubbleBody = notes ? (
    <NotesList />
  ) : busy ? (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', paddingVertical: 8 }} accessibilityLabel="Moka yazıyor">
      <TypingDots color={c.muted} />
    </View>
  ) : quip ? (
    <Appear key={quip}><Text style={[st.say, { color: c.ink }]}>{tx(quip)}</Text></Appear>
  ) : intro ? (
    <Appear key={intro}><Text style={[st.say, { color: c.ink }]}>{tx(line(INTRO_LINE[intro]))}</Text></Appear>
  ) : fresh0 ? (
    <Appear key={woke ? 'awake' : 'asleep'}><Text style={[st.say, { color: c.ink }]}>{tx(woke && opening.sleeping ? line('back') : opening.text)}</Text></Appear>
  ) : (
    <Appear key={shownIt.id}>
      <Bubble item={shownIt} room typed={!reduce && fresh.has(shownIt.id)} onUndo={undoItem} onConfirm={confirmItem} />
    </Appear>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#1C1712' }}>
      {/* Sahne: oda + Moka birlikte çok hafif eğilir (3B derinlik). Kenar boşluğu görünmesin diye biraz büyük çizilir. */}
      <Animated.View
        style={[StyleSheet.absoluteFill, {
          transform: [
            { perspective: 1100 },
            { translateX: px(tilt.x, -7) },
            { translateY: px(tilt.y, -5) },
            { rotateY: deg(tilt.x, 2.4) },
            { rotateX: deg(tilt.y, -1.8) },
            { scale: 1.06 },
          ],
        }]}
      >
        <RoomBackdrop mix={mix} sky={sky.kind} warm={room.warm} dust={opening.sleeping ? (woke ? 0 : room.dust) : room.dust} lampOff={lampOff} onTouch={touchObj} style={StyleSheet.absoluteFill} />
        {!kb && <View pointerEvents="none" style={{ position: 'absolute', left: mokaLeft + mokaSize * 0.18, top: mokaBottom - mokaSize * 0.06, width: mokaSize * 0.64, height: mokaSize * 0.1, borderRadius: mokaSize, backgroundColor: '#3A2614', opacity: 0.28 }} />}
        <Pressable onPress={mokaTap} onLongPress={() => { haptic('light'); router.push('/moka-tasarim' as Href); }} delayLongPress={450} accessibilityHint={tx('Moka\'nı tasarla için basılı tut')} accessibilityLabel="Moka" style={{ position: 'absolute', left: mokaLeft, top: mokaTop, width: mokaSize, height: mokaSize }}>
          <Animated.View
            style={{
              width: mokaSize,
              height: mokaSize,
              transform: [
                { translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [winW / 2 - (mokaLeft + mokaSize / 2), 0] }) },
                { translateY: Animated.add(enter.interpolate({ inputRange: [0, 1], outputRange: [winH - 40 - (mokaBottom - mokaSize / 2), 0] }), hop.interpolate({ inputRange: [0, 1], outputRange: [0, -mokaSize * 0.1] })) },
                { scale: Animated.multiply(enter.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }), hop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] })) },
              ],
            }}
          >
            <RoomMoka fur={fur} size={mokaSize} mood={moodOv ?? baseMood} talking={!busy && speaking} thinking={busy} />
          </Animated.View>
        </Pressable>
        <View pointerEvents="none" style={{ position: 'absolute', left: mokaLeft + mokaSize / 2, top: mokaTop + mokaSize * 0.4 }}>
          <Burst fire={burst} />
        </View>
      </Animated.View>

      {/* Ön katman: kameraya yakın, bulanık ışık zerreleri sahneden fazla kayar; kenarlarda yumuşak çerçeve gölgesi. */}
      <FrontLayer tilt={tilt} w={winW} h={winH} night={mix} />
      <Fade edge="top" color="#1A130D" size={insets.top + 110} from={0} to={0.42} />
      <Fade edge="bottom" color="#1A130D" size={kb ? 120 : 300} from={0} to={0.5} />

      {/* Konuşma balonu: Moka'nın üstünde, kuyruğu ona bakar. */}
      <Animated.View
        style={[st.bubble2, {
          width: bubbleW, left: (winW - bubbleW) / 2,
          ...(kb ? { top: insets.top + 66 } : { bottom: bubbleBottom }),
          backgroundColor: c.surface, shadowColor: '#1A130D',
          opacity: enter.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 0, 1], extrapolate: 'clamp' }),
          transform: [{ translateX: px(tilt.x, 3) }, { scale: enter.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.92, 0.92, 1], extrapolate: 'clamp' }) }],
        }]}
        accessibilityLiveRegion="polite"
      >
        <View style={st.bubbleHead}>
          <Text style={[st.bubbleName, { color: c.warm }]}>{notes ? tx('Notlarım') : 'Moka'}</Text>
          {notes && (
            <Pressable onPress={() => setNotes(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel={tx('Kapat')}>
              <Icon name="close" color={c.muted} size={18} />
            </Pressable>
          )}
        </View>
        <ScrollView ref={scroll} style={{ maxHeight: bubbleMax - 44 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {bubbleBody}
        </ScrollView>
        {!kb && <View style={[st.tail2, { left: tailX - 9, backgroundColor: c.surface }]} />}
      </Animated.View>

      <KeyboardAvoidingView style={StyleSheet.absoluteFill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} pointerEvents="box-none">
        <Animated.View style={{ flex: 1, transform: [{ translateX: px(tilt.x, 2) }] }} pointerEvents="box-none">
          {/* Başlık: geri, Moka'nın adı ve durumu, menü. */}
          <View style={[st.head2, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
            <RoundBtn onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} label={tx('Geri')}>
              <Chevron color="#FFF8EE" size={20} />
            </RoundBtn>
            <View style={{ flex: 1, alignItems: 'center' }} pointerEvents="none">
              <Text style={st.title}>Moka</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[st.dot, { backgroundColor: !woke ? '#B9A7D8' : busy ? '#F2C46D' : '#9FD3A8' }]} />
                <Text style={st.subtitle} numberOfLines={1}>{sub}</Text>
              </View>
            </View>
            <RoundBtn onPress={() => setMenu(m => !m)} label={tx('Diğer')} active={menu}>
              <Icon name="more" color="#FFF8EE" size={20} />
            </RoundBtn>
          </View>

          <View style={{ flex: 1 }} pointerEvents="none" />

          {!!echo && (
            <View style={[st.echo, { backgroundColor: c.accent }]}>
              <Text numberOfLines={2} style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: c.onAccent }}>{echo}</Text>
            </View>
          )}

          {/* Alt panel: eylemler + yazı çubuğu, tek buzlu yüzey. */}
          <Glass intensity={50} style={[st.dock, { marginBottom: Math.max(insets.bottom, 10) }]}>
            {focused && !text.trim() && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0, marginBottom: 10 }}>
                {ideas.map(x => (
                  <Squish key={x} onPress={() => send(x)} accessibilityLabel={x} style={[st.idea, { backgroundColor: c.surface, borderColor: c.line }]}>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13.5, color: c.ink }}>{x}</Text>
                  </Squish>
                ))}
              </ScrollView>
            )}
            {intro === 'color' && !kb ? (
              <Appear>
                <Text style={[st.dockLabel, { color: c.ink }]}>Kürk rengi</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  {FURS.map(f => {
                    const on = (fur ?? 'orman') === f.id;
                    return (
                      <Pressable key={f.id} onPress={() => pickFur(f.id)} accessibilityRole="button" accessibilityLabel={f.label} accessibilityState={{ selected: on }} hitSlop={4}
                        style={[st.furDot, { backgroundColor: f.swatch, borderColor: on ? c.surface : 'transparent', shadowColor: f.swatch }]}>
                        {on && <Icon name="check" color="#FFFFFF" size={16} />}
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable onPress={finishIntro} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'center', paddingVertical: 6 }}>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: c.muted }}>Şimdilik geç</Text>
                </Pressable>
              </Appear>
            ) : !kb ? (
              <View style={st.actions2}>
                <Squish onPress={() => router.push('/temizlik' as Href)} accessibilityLabel="Temizlik başlat" style={[st.act2, { backgroundColor: c.accent }]}>
                  <Icon name="broom" color={c.onAccent} size={20} />
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[st.actText, { color: c.onAccent }]}>Temizlik başlat</Text>
                </Squish>
                <Squish onPress={() => setAddOpen(true)} accessibilityLabel="İş ekle" style={[st.act2, { backgroundColor: c.surface, borderColor: c.line, borderWidth: 1 }]}>
                  <Icon name="plus" color={c.ink} size={20} />
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[st.actText, { color: c.ink }]}>İş ekle</Text>
                </Squish>
              </View>
            ) : null}
            <View style={st.bar2}>
              {lock ? (
                <Squish onPress={() => router.push(lock === 'login' ? '/giris' : '/premium')} accessibilityLabel={lockLabel} style={[st.lock2, { backgroundColor: c.surface2 }]}>
                  <View style={[st.lockIcon, { backgroundColor: lock === 'premium' ? c.peachSoft : c.surface }]}>
                    <Icon name={lock === 'login' ? 'lock' : lock === 'premium' ? 'star' : 'moon'} color={c.ink} size={16} />
                  </View>
                  <Text numberOfLines={2} style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 14, color: c.ink }}>{lockLabel}</Text>
                  {lock !== 'tomorrow' && <Chevron color={c.muted} size={16} dir="right" />}
                </Squish>
              ) : (
                <>
                  <Field
                    value={text}
                    onChangeText={t => { setText(t); interact(); }}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder="Moka'ya yaz…"
                    maxLength={400}
                    returnKeyType="send"
                    onSubmitEditing={() => send()}
                    editable={!busy}
                    style={{ flex: 1, minHeight: 48, borderRadius: radius.pill, paddingHorizontal: 18 }}
                  />
                  <Squish onPress={() => send()} disabled={busy || !text.trim()} accessibilityLabel="Gönder" style={[st.send, { backgroundColor: c.accent, opacity: busy || !text.trim() ? 0.45 : 1 }]}>
                    <Icon name="send" color={c.onAccent} size={20} />
                  </Squish>
                </>
              )}
            </View>
          </Glass>
        </Animated.View>
      </KeyboardAvoidingView>

      {menu && <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenu(false)} accessibilityLabel={tx('Kapat')} />}
      {menu && (
        <View style={[st.menu, { top: insets.top + 60 }]}>
          <Appear>
            <View style={[st.menuCard, { backgroundColor: c.surface, shadowColor: '#1A130D' }]}>
              {([
                ['note', 'Notlarım', () => setNotes(n => !n)],
                ['flag', 'Moka\'nın son cevabını bildir', report],
                ['trash', 'Sohbeti temizle', clear],
              ] as const).map(([ic, label, fn], i) => (
                <Pressable key={label} onPress={() => { setMenu(false); interact(); fn(); }} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [st.menuRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }, pressed && { backgroundColor: c.surface2 }]}>
                  <Icon name={ic} color={c.ink} size={18} />
                  <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: c.ink }}>{label}</Text>
                </Pressable>
              ))}
              <Text style={{ fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16, color: c.muted, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 }}>
                Moka bir yapay zekâdır; cevapları hatalı olabilir, tıbbi ya da psikolojik tavsiye değildir. Acil durumda 112’yi ara.
              </Text>
            </View>
          </Appear>
        </View>
      )}
      <AddSheet open={addOpen} onClose={() => setAddOpen(false)} />
    </View>
  );
}

/** Oda düğmelerindeki çizim ikonlar (emoji yerine; her yerde aynı kalınlık). */
type IconName = 'broom' | 'plus' | 'send' | 'lock' | 'star' | 'moon' | 'more' | 'note' | 'flag' | 'trash' | 'close' | 'check';
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
    </Svg>
  );
}

/** Başlıktaki yuvarlak, yarı saydam koyu düğme. */
function RoundBtn({ children, onPress, label, active }: { children: ReactNode; onPress: () => void; label: string; active?: boolean }) {
  return (
    <Squish onPress={onPress} accessibilityLabel={label} accessibilityState={active != null ? { expanded: active } : undefined} hitSlop={6} style={[st.round, { backgroundColor: active ? 'rgba(26,19,13,0.62)' : 'rgba(26,19,13,0.38)' }]}>
      {children}
    </Squish>
  );
}

/** Kameraya yakın katman: büyük, bulanık ışık lekeleri (bokeh) ve köşe gölgeleri. Eğimle sahneden daha çok kayar, derinlik verir. */
const BOKEH = [
  { x: 0.08, y: 0.2, r: 0.16, o: 0.16 }, { x: 0.94, y: 0.36, r: 0.12, o: 0.2 }, { x: 0.86, y: 0.08, r: 0.09, o: 0.14 },
  { x: 0.04, y: 0.66, r: 0.1, o: 0.12 }, { x: 0.97, y: 0.74, r: 0.15, o: 0.12 },
];
function FrontLayer({ tilt, w, h, night }: { tilt: Animated.ValueXY; w: number; h: number; night: number }) {
  const tone = night > 0.5 ? '#FFC98A' : '#FFF1D2';
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: tilt.x.interpolate({ inputRange: [-1, 1], outputRange: [16, -16] }) }, { translateY: tilt.y.interpolate({ inputRange: [-1, 1], outputRange: [12, -12] }) }] }]}>
        {BOKEH.map((b, i) => (
          <Image key={i} source={ISIK} style={{ position: 'absolute', left: b.x * w - b.r * w, top: b.y * h - b.r * w, width: b.r * w * 2, height: b.r * w * 2, tintColor: tone, opacity: b.o }} />
        ))}
      </Animated.View>
      {[[0, 0], [w, 0], [0, h], [w, h]].map(([x, y], i) => (
        <Image key={i} source={ISIK} style={{ position: 'absolute', left: x - w * 0.55, top: y - w * 0.55, width: w * 1.1, height: w * 1.1, tintColor: '#140E09', opacity: 0.38 }} />
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
  card: { marginHorizontal: 16, marginTop: 6, borderRadius: 24, padding: 14 },
  tail: { position: 'absolute', bottom: -7, left: '50%', marginLeft: -8, width: 16, height: 16, transform: [{ rotate: '45deg' }], borderRadius: 3 },
  roomBubble: { maxWidth: '100%', backgroundColor: 'transparent', paddingHorizontal: 0, paddingVertical: 0, alignSelf: 'stretch' },
  echo: { alignSelf: 'flex-end', maxWidth: '75%', marginRight: 20, marginTop: 14, borderRadius: 18, borderBottomRightRadius: 6, paddingHorizontal: 12, paddingVertical: 7 },
  status: { textAlign: 'center', marginTop: 14, fontFamily: fonts.bodyBold, fontSize: 12.5, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
  chips: { gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 10 },
  act: { flex: 1, minHeight: 50, borderRadius: radius.pill, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  top: { paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  avatarImg: { width: 40, height: 40 },
  menu: { position: 'absolute', right: 16, zIndex: 10, width: 260 },
  menuCard: { borderRadius: 22, paddingVertical: 6, overflow: 'hidden', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  furs: { marginHorizontal: 16, marginBottom: 10, borderRadius: 24, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 2, gap: 2 },
  furDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 3, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.5, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  say: { fontFamily: fonts.bodyBold, fontSize: 16.5, lineHeight: 24 },
  bubble2: { position: 'absolute', borderRadius: 24, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14, shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  bubbleHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  bubbleName: { fontFamily: fonts.displayBold, fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase' },
  tail2: { position: 'absolute', bottom: -8, width: 18, height: 18, borderRadius: 4, transform: [{ rotate: '45deg' }] },
  head2: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  title: { fontFamily: fonts.displayBold, fontSize: 21, lineHeight: 26, color: '#FFF8EE', textShadowColor: 'rgba(20,14,9,0.55)', textShadowRadius: 8 },
  subtitle: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: 'rgba(255,248,238,0.86)', textShadowColor: 'rgba(20,14,9,0.6)', textShadowRadius: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,248,238,0.22)' },
  dock: { marginHorizontal: 12, borderRadius: 30, padding: 12, gap: 10 },
  dockLabel: { fontFamily: fonts.displayBold, fontSize: 14, textAlign: 'center', marginBottom: 10 },
  actions2: { flexDirection: 'row', gap: 10 },
  act2: { flex: 1, minHeight: 52, borderRadius: radius.pill, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  actText: { flexShrink: 1, fontFamily: fonts.bodyBlack, fontSize: 15.5 },
  bar2: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lock2: { flex: 1, minHeight: 52, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 8, paddingRight: 16 },
  lockIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 50, paddingHorizontal: 12 },
  lock: { flex: 1, minHeight: 50, borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', justifyContent: 'flex-start', paddingBottom: 8 },
  chip: { marginTop: 6, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  bubble: { maxWidth: '86%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  moka: { borderBottomLeftRadius: 6, alignSelf: 'flex-start' },
  me: { borderBottomRightRadius: 6 },
  done: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  ideas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  idea: { minHeight: 44, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8 },
  send: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.tile, padding: 14 },
});
