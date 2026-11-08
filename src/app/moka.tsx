import { useRouter } from '@/lib/nav';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, Linking, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { MokaFace } from '@/components/MokaFace';
import { Appear, Squish, useReduceMotion } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { BackLink, Btn, Field, T } from '@/components/ui';
import { mimikOf } from '@/constants/mimik';
import { CHAT_ACCOUNT_NEEDED, CHAT_PREMIUM_INTRO, CHAT_PREMIUM_NUDGE } from '@/domain/chatGate';
import { applyChatAction, chatCtx, describeAction, needsConfirm, noteDayLabel, type ChatAction, type ChatMsg } from '@/domain/chat';
import type { AppState } from '@/domain/types';
import { mokaLevel, mokaTitle } from '@/domain/mokaLevel';
import { limits } from '@/domain/premium';
import { SUPPORT_EMAIL } from '@/lib/links';
import { cannedReply } from '@/domain/chatCanned';
import { askMoka } from '@/lib/mokaChat';
import { getLang, tx } from '@/i18n/runtime';
import { sfx } from '@/lib/sfx';
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
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const lv = mokaLevel(S.play.moka);
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
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [items, busy]);

  const send = async (raw?: string) => {
    const msg = (raw ?? text).trim().slice(0, 600);
    if (!msg || busy) return;
    setText('');
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
      setTimeout(() => push(p => [...p, { id: gid, role: 'assistant', ...gate }]), 500);
      return;
    }
    const ctx = chatCtx(get());
    // Aynı mesaj art arda: model çağrılmaz.
    const prevUser = [...items].reverse().find(i => i.role === 'user');
    if (prevUser && prevUser.content.trim().toLowerCase() === msg.toLowerCase()) {
      sfx('tap');
      const rid2 = nextId++;
      fresh.add(rid2);
      setTimeout(() => push(p => [...p, { id: rid2, role: 'assistant', content: tx('Bunu az önce konuştuk ☕ Başka bir şey eklemek ister misin?') }]), 450);
      return;
    }
    // Selam / teşekkür / hoşça kal: hazır cevap, sunucu çağrılmaz, hak düşmez.
    const canned = cannedReply(msg, getLang(), ctx, cannedN++);
    if (canned) {
      sfx('tap');
      const cid = nextId++;
      fresh.add(cid);
      setTimeout(() => push(p => [...p, { id: cid, role: 'assistant', content: canned }]), 450);
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
    if (go) setTimeout(() => router.push(go as never), 700);
    const f = got.focus;
    if (f) {
      setTimeout(() => router.push({ pathname: '/odak', params: { min: String(f.minutes), topic: f.topic, auto: '1' } }), 900);
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
      { text: 'Bildir', onPress: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Moka cevabı bildirimi')}&body=${encodeURIComponent(`Bildirdiğim cevap:\n\n${text}\n\nNeden:`)}`) },
    ]);
  };

  const clear = () => {
    memory = [HELLO];
    setItems(memory);
    toast('Sohbet temizlendi 🧹');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[st.top, { paddingTop: insets.top + 8, borderBottomColor: c.line }]}>
        <View style={st.head}>
          <BackLink label="" />
          <View style={[st.avatar, { backgroundColor: c.peachSoft }]}>
            <MokaFace size={st.avatarImg.width} mood={mood} talking={!busy && speaking} thinking={busy} pop={lastId ?? 0} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T v="h3" numberOfLines={1}>Moka</T>
            <T v="tiny" numberOfLines={1}>{busy ? 'yazıyor…' : `${mokaTitle(lv.level)} · seviye ${lv.level}`}</T>
          </View>
          <Squish onPress={() => setNotes(n => !n)} accessibilityLabel="Notlarım" accessibilityState={{ selected: notes }} style={[st.icon, { backgroundColor: notes ? c.accent : c.surface }]}>
            <Text style={{ fontSize: 17 }}>📝</Text>
          </Squish>
          <Squish onPress={report} accessibilityLabel="Moka'nın son cevabını bildir" style={[st.icon, { backgroundColor: c.surface }]}>
            <Text style={{ fontSize: 16 }}>🚩</Text>
          </Squish>
          <Squish onPress={clear} accessibilityLabel="Sohbeti temizle" style={[st.icon, { backgroundColor: c.surface }]}>
            <Text style={{ fontSize: 16 }}>🧹</Text>
          </Squish>
        </View>
        <T v="tiny" style={{ textAlign: 'center', opacity: 0.8 }}>
          Moka bir yapay zekâdır; cevapları hatalı olabilir, tıbbi ya da psikolojik tavsiye değildir. Acil durumda 112’yi ara.
        </T>
      </View>

      {notes ? (
        <ScrollView contentContainerStyle={st.list}>
          <NotesList />
        </ScrollView>
      ) : (
        <ScrollView ref={scroll} contentContainerStyle={st.list} keyboardShouldPersistTaps="handled" onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
          {items.map(i => (
            <Appear key={i.id}>
              <Bubble item={i} typed={!reduce && fresh.has(i.id)} onUndo={undoItem} onConfirm={confirmItem} />
            </Appear>
          ))}
          {busy && (
            <Appear>
              <View style={[st.bubble, st.moka, { backgroundColor: c.surface, flexDirection: 'row', gap: 5, alignItems: 'center', paddingVertical: 14 }]} accessibilityLabel="Moka yazıyor">
                <TypingDots color={c.muted} />
              </View>
            </Appear>
          )}
          {items.length <= 1 && !busy && (
            <View style={st.ideas}>
              {IDEAS.map(x => (
                <Squish key={x} onPress={() => send(x)} accessibilityLabel={x} style={[st.idea, { backgroundColor: c.surface, borderColor: c.line }]}>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: c.ink }}>{x}</Text>
                </Squish>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {left ? (
        <Text style={{ textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 12, color: c.muted, paddingTop: 4, backgroundColor: c.bg }}>
          {tx('Bugün kalan: {n}').replace('{n}', String(left.day))} · {tx('Bu ay kalan: {n}').replace('{n}', String(left.month))}
        </Text>
      ) : null}
      <View style={[st.bar, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: c.bg }]}>
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

function Bubble({ item, typed, onUndo, onConfirm }: { item: Item; typed: boolean; onUndo: (id: number) => void; onConfirm: (id: number, yes: boolean) => void }) {
  const c = useColors();
  const { state: S } = useStore();
  const router = useRouter();
  const me = item.role === 'user';
  const shown = useTyped(item.content, typed, () => fresh.delete(item.id));
  return (
    <View style={{ gap: 6, alignItems: me ? 'flex-end' : 'flex-start' }}>
      <View style={[st.bubble, me ? st.me : st.moka, { backgroundColor: me ? c.accent : item.error ? c.surface2 : c.surface }]}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 22, color: me ? c.onAccent : c.ink }}>{shown}</Text>
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
            <Text style={{ color: c.muted, fontSize: 20 }}>×</Text>
          </Pressable>
        </View>
      ))}
    </>
  );
}

const st = StyleSheet.create({
  top: { paddingHorizontal: 16, paddingBottom: 10, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  avatarImg: { width: 54, height: 54 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
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
