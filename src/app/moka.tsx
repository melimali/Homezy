import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MokaFace } from '@/components/MokaFace';
import { Appear, Squish } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { BackLink, Field, T } from '@/components/ui';
import { mimikOf } from '@/constants/mimik';
import { applyChatAction, chatCtx, noteDayLabel, type ChatAction, type ChatMsg } from '@/domain/chat';
import { mokaLevel, mokaTitle } from '@/domain/mokaLevel';
import { limits } from '@/domain/premium';
import { askMoka } from '@/lib/mokaChat';
import { sfx } from '@/lib/sfx';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

type Item = ChatMsg & { id: number; done?: string[]; error?: boolean };

const HELLO: Item = {
  id: 0,
  role: 'assistant',
  content: 'Merhaba, ben Moka ☕ Bana iş ekletebilir, yaptıklarını işaretletebilir, takvime not yazdırabilir ya da sadece sohbet edebilirsin!',
};
const IDEAS = ['Salona cam silmeyi ekle', 'Yarın için not al: kombi bakımı', 'Bugün ne yapmalıyım?', '25 dk ders çalışalım', 'Bugün günlük yazmak istiyorum', 'Biraz hareket edelim mi?', 'Dışarı çıkmaya ne dersin?', 'Evi toparlamak için küçük bir adım öner'];

/** Oturum boyunca konuşma kalır; kapatınca silinir (mesajlar telefonda saklanmaz). */
let memory: Item[] = [HELLO];
let nextId = 1;

/** Moka ile sohbet: tatlı bir muhabbet ve uygulamayı kontrol eden bir yapay zekâ (Haiku). Sunucuda çalışır, alan dışına çıkmaz. */
export default function MokaChat() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { state: S, update, get } = useStore();
  const { premium } = usePurchases();
  const [items, setItems] = useState<Item[]>(memory);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const lv = mokaLevel(S.play.moka);
  // Son cevabın tonu mimiği belirler; cevap gelince ve yazılırken ağzı oynar.
  const last = [...items].reverse().find(i => i.role === 'assistant' && !i.error);
  const mood = last && last.id !== 0 ? mimikOf(last.content) : 'happy';
  const [speaking, setSpeaking] = useState(false);
  const lastId = last?.id;
  useEffect(() => {
    if (!lastId) return;
    setSpeaking(true);
    const t = setTimeout(() => setSpeaking(false), Math.min(4000, 800 + (last?.content.length ?? 0) * 25));
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
    const history = [...items.filter(i => !i.error), mine].slice(-12).map(({ role, content, done }) => ({
      role,
      content: done?.length ? `${content}\n[Uygulama bu işlemleri zaten yaptı: ${done.join(' | ')}]` : content,
    }));
    push(p => [...p, mine]);
    setBusy(true);
    sfx('tap');
    const r = await askMoka(history, chatCtx(get()));
    setBusy(false);
    if (!r.ok) {
      push(p => [...p, { id: nextId++, role: 'assistant', content: r.message, error: true }]);
      return;
    }
    // Sunucu doğruladı; telefon yine kendi verisine göre doğrulayıp uygular.
    const done: string[] = [];
    const got: { focus?: { minutes: number; topic: string } } = {};
    const mult = limits(premium.active).mult;
    update(D => {
      for (const a of r.actions.slice(0, 3) as ChatAction[]) {
        const out = applyChatAction(D, a, Date.now(), mult);
        if (out.ok) {
          done.push(out.line);
          if (out.focus) got.focus = out.focus;
        }
      }
    });
    if (done.length) sfx('done');
    push(p => [...p, { id: nextId++, role: 'assistant', content: r.reply, done }]);
    const f = got.focus;
    if (f) {
      setTimeout(() => router.push({ pathname: '/odak', params: { min: String(f.minutes), topic: f.topic, auto: '1' } }), 900);
    }
  };

  const clear = () => {
    memory = [HELLO];
    setItems(memory);
    toast('Sohbet temizlendi 🧹');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[st.top, { paddingTop: insets.top + 10 }]}>
        <BackLink />
        <View style={st.head}>
          <View style={[st.avatar, { backgroundColor: c.peachSoft }]}>
            <MokaFace size={st.avatarImg.width} mood={mood} talking={busy || speaking} />
          </View>
          <View style={{ flex: 1 }}>
            <T v="h3">Moka</T>
            <T v="tiny">{mokaTitle(lv.level)} · seviye {lv.level}</T>
          </View>
          <Squish onPress={() => setNotes(n => !n)} accessibilityLabel="Notlarım" style={[st.pill, { backgroundColor: notes ? c.accent : c.surface2 }]}>
            <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 13, color: notes ? c.onAccent : c.ink }}>📝 Notlar</Text>
          </Squish>
          <Squish onPress={clear} accessibilityLabel="Sohbeti temizle" style={[st.pill, { backgroundColor: c.surface2 }]}>
            <Text style={{ fontSize: 14 }}>🧹</Text>
          </Squish>
        </View>
      </View>

      {notes ? (
        <ScrollView contentContainerStyle={st.list}>
          <NotesList />
        </ScrollView>
      ) : (
        <ScrollView ref={scroll} contentContainerStyle={st.list} keyboardShouldPersistTaps="handled">
          {items.map(i => (
            <Appear key={i.id}>
              <Bubble item={i} />
            </Appear>
          ))}
          {busy && (
            <View style={[st.bubble, st.moka, { backgroundColor: c.surface, flexDirection: 'row', gap: 8, alignItems: 'center' }]}>
              <ActivityIndicator size="small" color={c.muted} />
              <T v="small">Moka yazıyor…</T>
            </View>
          )}
          {items.length <= 1 && !busy && (
            <View style={st.ideas}>
              {IDEAS.map(x => (
                <Pressable key={x} onPress={() => send(x)} style={[st.idea, { backgroundColor: c.surface, borderColor: c.line }]}>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13.5, color: c.ink }}>{x}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <View style={[st.bar, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: c.bg }]}>
        <Field
          value={text}
          onChangeText={setText}
          placeholder="Moka'ya yaz…"
          maxLength={600}
          returnKeyType="send"
          onSubmitEditing={() => send()}
          editable={!busy}
          style={{ flex: 1 }}
        />
        <Squish onPress={() => send()} disabled={busy || !text.trim()} accessibilityLabel="Gönder" style={[st.send, { backgroundColor: c.accent, opacity: busy || !text.trim() ? 0.5 : 1 }]}>
          <Text style={{ color: c.onAccent, fontSize: 18, fontFamily: fonts.bodyBlack }}>➤</Text>
        </Squish>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ item }: { item: Item }) {
  const c = useColors();
  const me = item.role === 'user';
  return (
    <View style={{ gap: 6, alignItems: me ? 'flex-end' : 'flex-start' }}>
      <View style={[st.bubble, me ? st.me : st.moka, { backgroundColor: me ? c.accent : item.error ? c.surface2 : c.surface }]}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 22, color: me ? c.onAccent : c.ink }}>{item.content}</Text>
      </View>
      {item.done?.map((d, i) => (
        <View key={i} style={[st.done, { backgroundColor: c.sageSoft }]}>
          <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 12.5, color: c.ink }}>{d}</Text>
        </View>
      ))}
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
  top: { paddingHorizontal: 16, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', alignItems: 'center' },
  avatarImg: { width: 66, height: 66, marginTop: 4 },
  pill: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  bubble: { maxWidth: '86%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  moka: { borderBottomLeftRadius: 6, alignSelf: 'flex-start' },
  me: { borderBottomRightRadius: 6 },
  done: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  ideas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  idea: { borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8 },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.tile, padding: 14 },
});
