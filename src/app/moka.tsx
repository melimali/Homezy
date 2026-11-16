import { useRouter } from '@/lib/nav';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Animated, Easing, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { MokaFace } from '@/components/MokaFace';
import { odaMap, RoomBackdrop, type RoomTouch } from '@/components/RoomBackdrop';
import { AddSheet } from '@/components/TabBar';
import { Appear, Burst, Squish, useReduceMotion } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { BackLink, Btn, Field, T } from '@/components/ui';
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
import Svg, { Path } from 'react-native-svg';
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
  const mokaSize = Math.round(Math.min(winW * 0.6, 300) * (kb ? 0.75 : 1));
  const mokaBottom = kb ? winH * 0.5 : map.oy + SEAT.y * map.s;
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
  const [woke, setWoke] = useState(!opening.sleeping);
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
  const idleOff = busy || !!text.trim() || notes || reduce || !woke || !!quip;
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

  return (
    <View style={{ flex: 1, backgroundColor: '#1C2230' }}>
      <View style={{ flex: 1 }}>
        <RoomBackdrop mix={mix} sky={sky.kind} warm={room.warm} dust={opening.sleeping ? (woke ? 0 : room.dust) : room.dust} lampOff={lampOff} onTouch={touchObj} style={StyleSheet.absoluteFill} />
        {!kb && <View pointerEvents="none" style={{ position: 'absolute', left: mokaLeft + mokaSize * 0.14, top: mokaBottom - mokaSize * 0.07, width: mokaSize * 0.72, height: mokaSize * 0.12, borderRadius: mokaSize, backgroundColor: '#3A2614', opacity: 0.22 }} />}
        <Pressable onPress={mokaTap} accessibilityLabel="Moka" style={{ position: 'absolute', left: mokaLeft, top: mokaBottom - mokaSize, width: mokaSize, height: mokaSize }}>
          <Animated.View
            style={{
              width: mokaSize,
              height: mokaSize,
              transform: [
                { translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [winW / 2 - (mokaLeft + mokaSize / 2), 0] }) },
                { translateY: Animated.add(enter.interpolate({ inputRange: [0, 1], outputRange: [winH - 40 - (mokaBottom - mokaSize / 2), 0] }), hop.interpolate({ inputRange: [0, 1], outputRange: [0, -mokaSize * 0.1] })) },
                { scale: Animated.multiply(enter.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }), hop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] })) },
              ],
            }}
          >
            <Animated.View style={{ width: mokaSize, height: mokaSize }}>
              <MokaFace size={mokaSize} mood={moodOv ?? baseMood} talking={!busy && speaking} thinking={busy} pop={lastId ?? 0} />
            </Animated.View>
          </Animated.View>
        </Pressable>
        <View pointerEvents="none" style={{ position: 'absolute', left: mokaLeft + mokaSize / 2, top: mokaBottom - mokaSize * 0.55 }}>
          <Burst fire={burst} />
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} pointerEvents="box-none">
          <View style={[st.head, { paddingTop: insets.top + 8, paddingHorizontal: 16 }]}>
            <View style={{ flex: 1 }}>
            <BackLink
              label=""
              right={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {notes ? (
                    <Squish onPress={() => setNotes(false)} accessibilityLabel={tx('Notlarım')} accessibilityState={{ selected: true }} style={[st.icon, { backgroundColor: c.accent }]}>
                      <Text style={{ fontSize: 16 }}>📝</Text>
                    </Squish>
                  ) : null}
                  <Squish onPress={() => setMenu(m => !m)} accessibilityLabel={tx('Diğer')} accessibilityState={{ expanded: menu }} style={[st.icon, { backgroundColor: alpha(c.surface, 0.9) }]}>
                    <Text style={{ fontSize: 18, lineHeight: 22, color: c.ink, fontFamily: fonts.bodyBlack }}>⋯</Text>
                  </Squish>
                </View>
              }
            />
            </View>
          </View>

          <Animated.View style={[st.card, { backgroundColor: alpha(c.surface, 0.96), maxHeight: winH * (kb ? 0.24 : 0.32), opacity: enter.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 0, 1], extrapolate: 'clamp' }) }]}>
            <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {notes ? (
                <NotesList />
              ) : busy ? (
                <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', paddingVertical: 10 }} accessibilityLabel="Moka yazıyor">
                  <TypingDots color={c.muted} />
                </View>
              ) : quip ? (
                <Appear key={quip}>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 24, color: c.ink }}>{tx(quip)}</Text>
                </Appear>
              ) : fresh0 ? (
                <Appear key={woke ? 'awake' : 'asleep'}>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 24, color: c.ink }}>{tx(woke && opening.sleeping ? line('back') : opening.text)}</Text>
                </Appear>
              ) : (
                <Appear key={shownIt.id}>
                  <Bubble item={shownIt} room typed={!reduce && fresh.has(shownIt.id)} onUndo={undoItem} onConfirm={confirmItem} />
                </Appear>
              )}
              {!notes && !quip && !busy && fresh0 && !lock && (
                <T v="tiny" style={{ opacity: 0.65 }}>
                  Moka bir yapay zekâdır; cevapları hatalı olabilir, tıbbi ya da psikolojik tavsiye değildir. Acil durumda 112’yi ara.
                </T>
              )}
            </ScrollView>
            <View style={[st.tail, { backgroundColor: alpha(c.surface, 0.96) }]} />
          </Animated.View>
          {!!echo && (
            <View style={[st.echo, { backgroundColor: c.accent }]}>
              <Text numberOfLines={2} style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: c.onAccent }}>{echo}</Text>
            </View>
          )}
          {!!hint && !echo && <Text style={[st.status, { color: '#fff' }]}>{hint}</Text>}
          {left && !kb && left.day <= 5 ? (
            <Text style={[st.status, { color: '#fff', opacity: 0.85 }]}>
              ☕ {tx('Bugün kalan: {n}').replace('{n}', String(left.day))}
            </Text>
          ) : null}

          <View style={{ flex: 1 }} pointerEvents="none" />

          {focused && !text.trim() && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={st.chips} style={{ flexGrow: 0 }}>
              {ideas.map(x => (
                <Squish key={x} onPress={() => send(x)} accessibilityLabel={x} style={[st.idea, { backgroundColor: alpha(c.surface, 0.93), borderColor: c.line }]}>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13.5, color: c.ink }}>{x}</Text>
                </Squish>
              ))}
            </ScrollView>
          )}
          {!kb && (
            <View style={st.actions}>
              <Squish onPress={() => router.push('/temizlik' as Href)} accessibilityLabel="Temizlik başlat" style={[st.act, { backgroundColor: c.accent }]}>
                <Text style={{ fontSize: 18 }}>🧹</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ flexShrink: 1, fontFamily: fonts.bodyBlack, fontSize: 15, color: c.onAccent }}>Temizlik başlat</Text>
              </Squish>
              <Squish onPress={() => setAddOpen(true)} accessibilityLabel="İş ekle" style={[st.act, { backgroundColor: alpha(c.surface, 0.95) }]}>
                <Text style={{ fontSize: 18 }}>➕</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ flexShrink: 1, fontFamily: fonts.bodyBlack, fontSize: 15, color: c.ink }}>İş ekle</Text>
              </Squish>
            </View>
          )}
          <View style={[st.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            {lock ? (
              <Squish onPress={() => router.push(lock === 'login' ? '/giris' : '/premium')} accessibilityLabel={lockLabel} style={[st.lock, { backgroundColor: alpha(c.surface, 0.95), borderColor: c.line }]}>
                <Text style={{ fontSize: 16 }}>{lock === 'login' ? '🔑' : lock === 'premium' ? '⭐' : '🌙'}</Text>
                <Text numberOfLines={2} style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 14.5, color: c.ink }}>{lockLabel}</Text>
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
                  style={{ flex: 1 }}
                />
                <Squish onPress={() => send()} disabled={busy || !text.trim()} accessibilityLabel="Gönder" style={[st.send, { backgroundColor: c.accent, opacity: busy || !text.trim() ? 0.5 : 1 }]}>
                  <Svg width={20} height={20} viewBox="0 0 24 24">
                    <Path d="M4 12l15-7-5 15-3-6z" fill={c.onAccent} stroke={c.onAccent} strokeWidth={1.5} strokeLinejoin="round" />
                  </Svg>
                </Squish>
              </>
            )}
          </View>
          {menu && <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenu(false)} accessibilityLabel={tx('Kapat')} />}
          {menu && (
            <View style={[st.menu, { top: insets.top + 56 }]}>
            <Appear>
              <View style={[st.menuCard, { backgroundColor: c.surface, shadowColor: c.shadow }]}>
                {([
                  ['📝', 'Notlarım', () => setNotes(n => !n)],
                  ['🚩', 'Moka\'nın son cevabını bildir', report],
                  ['🧹', 'Sohbeti temizle', clear],
                ] as const).map(([e, label, fn]) => (
                  <Pressable key={label} onPress={() => { setMenu(false); interact(); fn(); }} accessibilityRole="button" accessibilityLabel={label} style={st.menuRow}>
                    <Text style={{ fontSize: 16 }}>{e}</Text>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: c.ink }}>{label}</Text>
                  </Pressable>
                ))}
                <T v="tiny" style={{ opacity: 0.7, paddingHorizontal: 4, paddingTop: 4 }}>
                  Moka bir yapay zekâdır; cevapları hatalı olabilir, tıbbi ya da psikolojik tavsiye değildir. Acil durumda 112’yi ara.
                </T>
              </View>
            </Appear>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
      <AddSheet open={addOpen} onClose={() => setAddOpen(false)} />
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

const alpha = (hex: string, a: number) => (/^#[0-9a-f]{6}$/i.test(hex) ? hex + Math.round(a * 255).toString(16).padStart(2, '0') : hex);

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
  menuCard: { borderRadius: 20, padding: 8, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 8, borderRadius: 14 },
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
