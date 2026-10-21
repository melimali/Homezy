import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BackLink, Btn, Card, EmptyMsg, Field, Screen, SecHead, T } from '@/components/ui';
import { addDays, awardedToday, dayKey, dayTs, POINTS } from '@/domain/play';
import { useNow } from '@/hooks/useNow';
import { usePlay } from '@/play/usePlay';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

const MOODS = ['😄', '🙂', '😐', '😔', '😴'];
const fmtDay = (k: string) => new Date(dayTs(k)).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * Günlük: o gün neler yaptığını birkaç satırla yaz. Altında o gün tamamlanan işler ve sporlar
 * kendiliğinden listelenir; geriye dönüp bakınca "ne çok şey yapmışım" desin.
 */
export default function Gunluk() {
  const c = useColors();
  const now = useNow();
  const { state: S, update } = useStore();
  const { award } = usePlay();
  const today = dayKey(now);
  const P = S.play;
  const saved = P.journal[today];
  const [text, setText] = useState(saved?.text ?? '');
  const [mood, setMood] = useState<string | null>(saved?.mood ?? null);
  const done = awardedToday(P, 'gunluk', 'gunluk', now);
  const dirty = text.trim() !== (saved?.text ?? '') || mood !== (saved?.mood ?? null);

  const save = () => {
    const t = text.trim();
    if (!t) return;
    const write = (D: typeof S) => void (D.play.journal[today] = { text: t, mood, at: Date.now() });
    if (done) update(write);
    else award('gunluk', 'gunluk', '📔 Günlüğe yazdım', 'Günlük', write);
  };

  // Son 30 gün: yazı ya da yapılan bir şey olan günler.
  const past: string[] = [];
  for (let i = 1; i <= 30; i++) {
    const d = addDays(today, -i);
    if (P.journal[d] || P.log[d]?.length) past.push(d);
  }
  const todayLog = P.log[today] ?? [];

  return (
    <Screen header={false}>
      <BackLink />
      <View>
        <T v="eyebrow">{fmtDay(today)}</T>
        <T v="h1">Günlüğüm 📔</T>
        <T v="lead">Bugün neler yaptın? Birkaç satır yeter. Günün ilk yazısı +{POINTS.gunluk} puan ⭐</T>
      </View>

      <Card>
        <T v="h3">Bugün nasılsın?</T>
        <View style={styles.moods}>
          {MOODS.map(m => (
            <Pressable
              key={m}
              onPress={() => setMood(mood === m ? null : m)}
              accessibilityRole="button"
              accessibilityState={{ selected: mood === m }}
              style={[styles.mood, { backgroundColor: mood === m ? c.accentSoft : c.surface2, borderColor: mood === m ? c.hi : 'transparent' }]}
            >
              <Text style={{ fontSize: 26 }}>{m}</Text>
            </Pressable>
          ))}
        </View>
        <Field
          value={text}
          onChangeText={setText}
          placeholder="Bugün mutfağı topladım, akşam yürüyüşe çıktım…"
          multiline
          textAlignVertical="top"
          maxLength={2000}
          style={[styles.text, { borderRadius: radius.card - 6 }]}
        />
        <Btn
          kind="primary"
          label={!done ? `Kaydet · +${POINTS.gunluk} ⭐` : dirty ? 'Kaydet' : 'Kaydedildi ✓'}
          disabled={!text.trim() || (done && !dirty)}
          onPress={save}
        />
        <DoneList items={todayLog} title="Bugün yaptıkların" empty="Bugün tamamladığın işler burada görünecek." />
      </Card>

      {past.map(d => (
        <Card key={d}>
          <SecHead title={fmtDay(d)} right={P.journal[d]?.mood ?? undefined} />
          {P.journal[d] && <T style={{ fontSize: 15 }}>{P.journal[d].text}</T>}
          <DoneList items={P.log[d] ?? []} />
        </Card>
      ))}
      {!past.length && <T v="small" style={{ textAlign: 'center' }}>Geçmiş günlerin burada birikecek.</T>}
    </Screen>
  );
}

function DoneList({ items, title, empty }: { items: string[]; title?: string; empty?: string }) {
  const c = useColors();
  if (!items.length && !empty) return null;
  return (
    <View style={[styles.done, { backgroundColor: c.okSoft }]}>
      {title && <Text style={[styles.doneTitle, { color: c.ok }]}>{title}</Text>}
      {items.map((x, i) => (
        <Text key={i} style={[styles.doneItem, { color: c.ink }]}>✓ {x}</Text>
      ))}
      {!items.length && <EmptyMsg>{empty}</EmptyMsg>}
    </View>
  );
}

const styles = StyleSheet.create({
  moods: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  mood: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 16, borderWidth: 2 },
  text: { flex: 0, minHeight: 120, paddingTop: 12 },
  done: { borderRadius: 16, padding: 12, gap: 3 },
  doneTitle: { fontFamily: fonts.bodyBlack, fontSize: 13, marginBottom: 2 },
  doneItem: { fontFamily: fonts.body, fontSize: 14 },
});
