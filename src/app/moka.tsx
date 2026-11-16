import { useRouter } from '@/lib/nav';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, Easing, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { MokaFace } from '@/components/MokaFace';
import { odaMap, RoomBackdrop, type RoomTouch } from '@/components/RoomBackdrop';
import { AddSheet } from '@/components/TabBar';
import { Appear, Squish, useReduceMotion } from '@/components/motion';
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
import { MOKA_ASSETS, type MokaPose } from '@/constants/moka';
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

/** Cevap yazılma süresi (ms): kısa cevap hızlı, uzun cevap en çok 3,5 sn. Moka'nın ağzı bu sürece göre oynar. */
const typeMs = (len: number) => Math.min(3500, 500 + len * 22);
/** Bu oturumda yeni gelen, henüz harf harf yazılmamış cevaplar. */
const fresh = new Set<number>();

const HELLO: Item = {
  id: 0,
  role: 'assistant',
  content: 'Merhaba, ben Moka ☕ Bana iş ekletebilir, alışveriş listene ürün yazdırabilir, yaptıklarını (su, spor, ilaç, hayvan bakımı) işaretletebilir, günlük ve takvim notu yazdırabilir ya da sadece sohbet edebilirsin!',
};
const IDEAS = ['Alışveriş listesine süt ve ekmek ekle', 'Bugün 2 bardak su içtim', 'Salona cam silmeyi ekle', 'Yarın için not al: kombi bakımı', 'Bugün ne yapmalıyım?', '25 dk ders çalışalım', 'Bugün günlük yazmak istiyorum', 'Biraz hareket edelim mi?', 'Dışarı çıkmaya ne dersin?', 'Evi toparlamak için küçük bir adım öner'];

/** Oturum boyunca konuşma kalır; kapatınca silinir (mesajlar telefonda saklanmaz). */
let memory: Item[] = [HELLO];
let nextId = 1;
/** Premium olmayan kullanıcı bu oturumda kaç mesaj yazdı (ilk mesaja uzun tanıtım, sonrakilere kısa yönlendirme). */
let freeAsked = 0;
let cannedN = 0;

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
  const mokaSize = Math.round(Math.min(winW * 0.78, 360) * (kb ? 0.62 : 1));
  const mokaBottom = kb ? winH * 0.5 : map.oy + 1500 * map.s;
  const [enter] = useState(() => new Animated.Value(reduce ? 1 : 0));
  useEffect(() => {
    if (reduce) return;
    const a = Animated.timing(enter, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [reduce, enter]);
  // Oda gününü yansıtır, Moka boşta kendi hâlinde takılır.
  const room = roomState(S.play);
  const sky = useSky(true);
  const mix = nightMix();
  const [quip, setQuip] = useState('');
  const [bump, setBump] = useState(0); // etkileşim sayacı: boşta sayacı sıfırlar
  const [idlePose, setIdlePose] = useState<MokaPose | null>(null);
  const [moodOv, setMoodOv] = useState<'cheer' | 'wow' | 'happy' | null>(null);
  const [idleFade] = useState(() => new Animated.Value(0));
  const [hop] = useState(() => new Animated.Value(0));
  const interact = () => setBump(b => b + 1);
  const idleOff = busy || !!text.trim() || notes || reduce;
  // Boşta davranışlar: gündüz kitap, kahve, müzik; gece çoğunlukla şekerleme.
  useEffect(() => {
    if (busy || text.trim() || notes || reduce) return;
    const day: MokaPose[] = ['reading', 'sipping', 'music', 'laptop'];
    const nite: MokaPose[] = ['nap', 'nap', 'reading', 'blanket'];
    let t2: ReturnType<typeof setTimeout> | undefined;
    const t1 = setTimeout(() => {
      const list = (mix > 0.5 ? nite : day).filter(p => MOKA_ASSETS[p]);
      setIdlePose(list[Math.floor(Math.random() * list.length)] ?? null);
      t2 = setTimeout(() => setIdlePose(null), 9000 + Math.random() * 5000);
    }, 12000 + Math.random() * 6000);
    return () => { clearTimeout(t1); if (t2) clearTimeout(t2); setIdlePose(null); };
  }, [bump, busy, text, notes, reduce, mix, lastId]);
  useEffect(() => {
    const a = Animated.timing(idleFade, { toValue: idlePose ? 1 : 0, duration: 450, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [idlePose, idleFade]);
  const mokaTap = () => {
    interact();
    sfx('tap');
    haptic('light');
    setMoodOv('cheer');
    later(() => setMoodOv(null), 1600);
    if (reduce) return;
    hop.setValue(0);
    Animated.sequence([
      Animated.timing(hop, { toValue: 1, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(hop, { toValue: 0, friction: 3, tension: 160, useNativeDriver: true }),
    ]).start();
  };
  const QUIPS: Record<RoomTouch, string> = {
    lamba: 'Işık ne güzel, değil mi? ✨',
    kupa: 'Bir yudum kahve iyi gider ☕',
    bitki: 'Bitkilerim seni çok seviyor 🌿',
    pencere: mix > 0.5 ? 'Yıldızlar çıkmış 🌙' : 'Bugün dışarısı çok güzel!',
  };
  const touchObj = (k: RoomTouch) => {
    interact();
    sfx('tap');
    haptic('light');
    setQuip(QUIPS[k]);
    setMoodOv(k === 'pencere' ? 'wow' : 'happy');
    if (k === 'kupa') setIdlePose('sipping');
    later(() => { setQuip(''); setMoodOv(null); if (k === 'kupa') setIdlePose(null); }, 3800);
  };
  const baseMood = last && last.id !== 0 ? mood : room.away >= 3 ? 'sleepy' : room.done >= 3 ? 'cheer' : 'happy';
  const hint = busy ? tx('Moka düşünüyor…') : text.trim() ? tx('Moka seni dinliyor…') : '';
  const shownIt = last ?? HELLO;

  return (
    <View style={{ flex: 1, backgroundColor: '#1C2230' }}>
      <Animated.View
        style={{
          flex: 1,
          opacity: enter.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [winH * 0.42, 0] }) },
            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.18, 1] }) },
          ],
        }}
      >
        <RoomBackdrop mix={mix} sky={sky.kind} warm={room.warm} dust={room.dust} onTouch={touchObj} style={StyleSheet.absoluteFill} />
        <Pressable onPress={mokaTap} accessibilityLabel="Moka" style={{ position: 'absolute', left: (winW - mokaSize) / 2, top: mokaBottom - mokaSize, width: mokaSize, height: mokaSize }}>
          <Animated.View style={{ width: mokaSize, height: mokaSize, transform: [{ translateY: hop.interpolate({ inputRange: [0, 1], outputRange: [0, -mokaSize * 0.1] }) }, { scale: hop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] }}>
            <Animated.View style={{ width: mokaSize, height: mokaSize, opacity: idleOff ? 1 : idleFade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
              <MokaFace size={mokaSize} mood={moodOv ?? baseMood} talking={!busy && speaking} thinking={busy} pop={lastId ?? 0} />
            </Animated.View>
            {idlePose && !idleOff && (
              <Animated.Image source={MOKA_ASSETS[idlePose]} resizeMode="contain" style={{ position: 'absolute', left: 0, top: 0, width: mokaSize, height: mokaSize, opacity: idleFade }} accessibilityIgnoresInvertColors />
            )}
          </Animated.View>
        </Pressable>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} pointerEvents="box-none">
          <View style={[st.head, { paddingTop: insets.top + 8, paddingHorizontal: 16 }]}>
            <BackLink
              label=""
              right={
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1 }} />
                  <Squish onPress={() => setNotes(n => !n)} accessibilityLabel={tx('Notlarım')} accessibilityState={{ selected: notes }} style={[st.icon, { backgroundColor: notes ? c.accent : alpha(c.surface, 0.9) }]}>
                    <Text style={{ fontSize: 16 }}>📝</Text>
                  </Squish>
                  <Squish onPress={report} accessibilityLabel={tx('Moka\'nın son cevabını bildir')} style={[st.icon, { backgroundColor: alpha(c.surface, 0.9) }]}>
                    <Text style={{ fontSize: 15 }}>🚩</Text>
                  </Squish>
                  <Squish onPress={clear} accessibilityLabel={tx('Sohbeti temizle')} style={[st.icon, { backgroundColor: alpha(c.surface, 0.9) }]}>
                    <Text style={{ fontSize: 15 }}>🧹</Text>
                  </Squish>
                </View>
              }
            />
          </View>

          <View style={[st.card, { backgroundColor: alpha(c.surface, 0.93), maxHeight: winH * (kb ? 0.24 : 0.32) }]}>
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
              ) : (
                <Appear key={shownIt.id}>
                  <Bubble item={shownIt} room typed={!reduce && fresh.has(shownIt.id)} onUndo={undoItem} onConfirm={confirmItem} />
                </Appear>
              )}
              {!notes && (
                <T v="tiny" style={{ opacity: 0.65 }}>
                  Moka bir yapay zekâdır; cevapları hatalı olabilir, tıbbi ya da psikolojik tavsiye değildir. Acil durumda 112’yi ara.
                </T>
              )}
            </ScrollView>
            <View style={[st.tail, { backgroundColor: alpha(c.surface, 0.93) }]} />
          </View>
          {!!echo && (
            <View style={[st.echo, { backgroundColor: c.accent }]}>
              <Text numberOfLines={2} style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: c.onAccent }}>{echo}</Text>
            </View>
          )}
          {!!hint && !echo && <Text style={[st.status, { color: '#fff' }]}>{hint}</Text>}
          {left && !kb ? (
            <Text style={[st.status, { color: '#fff', opacity: 0.85 }]}>
              {tx('Bugün kalan: {n}').replace('{n}', String(left.day))} · {tx('Bu ay kalan: {n}').replace('{n}', String(left.month))}
            </Text>
          ) : null}

          <View style={{ flex: 1 }} pointerEvents="none" />

          {!kb && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={st.chips} style={{ flexGrow: 0 }}>
              {IDEAS.map(x => (
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
                <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 15, color: c.onAccent }}>Temizlik başlat</Text>
              </Squish>
              <Squish onPress={() => setAddOpen(true)} accessibilityLabel="İş ekle" style={[st.act, { backgroundColor: alpha(c.surface, 0.95) }]}>
                <Text style={{ fontSize: 18 }}>➕</Text>
                <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 15, color: c.ink }}>İş ekle</Text>
              </Squish>
            </View>
          )}
          <View style={[st.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Field
              value={text}
              onChangeText={setText}
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
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
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
  const [n, setN] = useState(on ? 0 : text.length);
  useEffect(() => {
    if (!on) return;
    const total = typeMs(text.length);
    const t0 = Date.now();
    const iv = setInterval(() => {
      const k = Math.min(text.length, Math.ceil(((Date.now() - t0) / total) * text.length));
      setN(k);
      if (k >= text.length) {
        clearInterval(iv);
        done();
      }
    }, 40);
    return () => clearInterval(iv);
  }, [text, on]); // eslint-disable-line react-hooks/exhaustive-deps
  return text.slice(0, n);
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
  act: { flex: 1, minHeight: 50, borderRadius: radius.pill, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  top: { paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  avatarImg: { width: 40, height: 40 },
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
