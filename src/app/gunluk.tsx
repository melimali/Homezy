import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { PremiumLock } from '@/components/PremiumLock';
import { useToast } from '@/components/Toast';
import { BackLink, Btn, Card, EmptyMsg, Field, Screen, SecHead, T } from '@/components/ui';
import { addDays, awardedToday, dayKey, dayTs, POINTS } from '@/domain/play';
import type { JournalEntry } from '@/domain/types';
import { useNow } from '@/hooks/useNow';
import { deletePhoto, persistPhoto, photoExists, pickPhoto } from '@/lib/photos';
import { usePlay } from '@/play/usePlay';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import { photoUrl, removePhoto, uploadPhoto } from '@/sync/photos';
import { fonts, radius, useColors } from '@/theme';

const MOODS = ['😄', '🙂', '😐', '😔', '😴'];
/** Ruh hali grafiği için puan: 5 çok iyi … 1 kötü. */
const MOOD_SCORE: Record<string, number> = { '😄': 5, '🙂': 4, '😐': 3, '😴': 2, '😔': 1 };
const fmtDay = (k: string) => new Date(dayTs(k)).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtYear = (k: string) => new Date(dayTs(k)).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
/** Geçen yılın aynı günü (29 şubat → 28 şubat). */
const lastYear = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return dayKey(new Date(y - 1, m - 1, m === 2 && d === 29 ? 28 : d, 12).getTime());
};

/**
 * Günlük: o gün neler yaptığını birkaç satırla yaz. Altında o gün tamamlanan işler ve sporlar
 * kendiliğinden listelenir; geriye dönüp bakınca "ne çok şey yapmışım" desin.
 * Premium: günün fotoğrafı (bulutta yedekli), ruh hali grafiği ve "geçen yıl bugün".
 */
export default function Gunluk() {
  const c = useColors();
  const now = useNow();
  const toast = useToast();
  const { state: S, update } = useStore();
  const { award } = usePlay();
  const { premium } = usePurchases();
  const { status, user } = useAuth();
  const today = dayKey(now);
  const P = S.play;
  const saved = P.journal[today];
  const [text, setText] = useState(saved?.text ?? '');
  const [mood, setMood] = useState<string | null>(saved?.mood ?? null);
  const [photo, setPhoto] = useState<string | null>(saved?.photo ?? null);
  const done = awardedToday(P, 'gunluk', 'gunluk', now);
  const dirty = text.trim() !== (saved?.text ?? '') || mood !== (saved?.mood ?? null) || photo !== (saved?.photo ?? null);
  const backup = premium.active && status === 'account' && user ? user.id : null;

  const save = () => {
    const t = text.trim();
    if (!t) return;
    const prev = saved?.photo ?? null;
    const keepKey = photo && photo === prev ? saved?.photoKey ?? null : null;
    const write = (D: typeof S) =>
      void (D.play.journal[today] = { text: t, mood, at: Date.now(), photo, photoKey: keepKey });
    if (done) update(write);
    else award('gunluk', 'gunluk', '📔 Günlüğe yazdım', 'Günlük', write);
    if (prev && prev !== photo) {
      deletePhoto(prev);
      if (saved?.photoKey) removePhoto(saved.photoKey);
    }
    // Premium: fotoğrafı buluta da yedekle.
    if (backup && photo && !keepKey)
      uploadPhoto(backup, photo, `gunluk/${today}`).then(key => {
        if (key) update(D => void (D.play.journal[today] && (D.play.journal[today].photoKey = key)));
      });
  };

  const addPhoto = async (source: 'camera' | 'library') => {
    try {
      const res = await pickPhoto(source);
      if (!res) return;
      if ('error' in res) return toast(res.error);
      // Kaydedilmemiş eski seçim varsa sil.
      if (photo && photo !== saved?.photo) deletePhoto(photo);
      setPhoto(persistPhoto(res.uri, 'gunluk'));
    } catch {
      toast('Fotoğraf eklenemedi.');
    }
  };

  // Son 30 gün: yazı ya da yapılan bir şey olan günler.
  const past: string[] = [];
  for (let i = 1; i <= 30; i++) {
    const d = addDays(today, -i);
    if (P.journal[d] || P.log[d]?.length) past.push(d);
  }
  const todayLog = P.log[today] ?? [];
  const yearAgo = lastYear(today);

  return (
    <Screen header={false}>
      <BackLink />
      <View>
        <T v="eyebrow">{fmtDay(today)}</T>
        <T v="h1">Seyir Defterim 📔</T>
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
          placeholder="Bugün erzak deposunu topladım, akşam devriyeye çıktım…"
          multiline
          textAlignVertical="top"
          maxLength={2000}
          style={[styles.text, { borderRadius: radius.card - 6 }]}
        />
        {photo && (
          <View>
            <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" accessibilityLabel="Günün fotoğrafı" />
            <Pressable onPress={() => setPhoto(null)} accessibilityRole="button" accessibilityLabel="Fotoğrafı kaldır" style={[styles.photoX, { backgroundColor: c.surface }]}>
              <Text style={{ fontFamily: fonts.bodyBlack, color: c.ink }}>✕</Text>
            </Pressable>
          </View>
        )}
        {premium.active ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {Platform.OS !== 'web' && <Btn small label="📷 Fotoğraf çek" onPress={() => addPhoto('camera')} style={{ flex: 1 }} />}
            <Btn small label="🖼️ Galeriden" onPress={() => addPhoto('library')} style={{ flex: 1 }} />
          </View>
        ) : (
          <T v="small">👑 Premium ile günün fotoğrafını da ekleyebilirsin.</T>
        )}
        <Btn
          kind="primary"
          label={!done ? `Kaydet · +${POINTS.gunluk} ⭐` : dirty ? 'Kaydet' : 'Kaydedildi ✓'}
          disabled={!text.trim() || (done && !dirty)}
          onPress={save}
        />
        <DoneList items={todayLog} title="Bugünkü operasyonlar" empty="Bugün tamamladığın görevler burada görünecek." />
      </Card>

      {premium.active ? (
        <>
          <MoodChart journal={P.journal} today={today} />
          <Card>
            <SecHead title="Geçen yıl bugün 🕰️" right={fmtYear(yearAgo)} />
            {P.journal[yearAgo] ? (
              <Entry e={P.journal[yearAgo]} />
            ) : (
              <EmptyMsg>Geçen yıl bugün bir şey yazmamışsın. Bugün yazdıkların seneye bugün karşına çıkacak 💌</EmptyMsg>
            )}
            <DoneList items={P.log[yearAgo] ?? []} />
          </Card>
        </>
      ) : (
        <PremiumLock
          emoji="📈"
          title="Ruh hali grafiği ve geçen yıl bugün"
          text="Son 30 günde nasıl hissettiğini grafikte gör, bir yıl önce bugün ne yazdığını hatırla."
        />
      )}

      {past.map(d => (
        <Card key={d}>
          <SecHead title={fmtDay(d)} right={P.journal[d]?.mood ?? undefined} />
          {P.journal[d] && <Entry e={P.journal[d]} />}
          <DoneList items={P.log[d] ?? []} />
        </Card>
      ))}
      {!past.length && <T v="small" style={{ textAlign: 'center' }}>Geçmiş günlerin burada birikecek.</T>}
    </Screen>
  );
}

/** Bir günün yazısı ve (varsa) fotoğrafı. Fotoğraf bu telefonda yoksa buluttaki yedeğinden gösterilir. */
function Entry({ e }: { e: JournalEntry }) {
  const [uri, setUri] = useState<string | null>(photoExists(e.photo) ? e.photo! : null);
  useEffect(() => {
    if (uri || !e.photoKey) return;
    let alive = true;
    photoUrl(e.photoKey).then(u => alive && setUri(u));
    return () => {
      alive = false;
    };
  }, [uri, e.photoKey]);
  return (
    <>
      <T style={{ fontSize: 15 }}>{e.text}</T>
      {uri && <Image source={{ uri }} style={styles.photo} resizeMode="cover" accessibilityLabel="O günün fotoğrafı" />}
    </>
  );
}

/** Son 30 günün ruh hali: her gün bir sütun, yükseklik ne kadar iyi hissettiğin. */
function MoodChart({ journal, today }: { journal: Record<string, JournalEntry>; today: string }) {
  const c = useColors();
  const days = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29));
  const scores = days.map(d => (journal[d]?.mood ? MOOD_SCORE[journal[d].mood!] ?? null : null));
  const known = scores.filter((x): x is number => x != null);
  const avg = known.length ? known.reduce((a, b) => a + b, 0) / known.length : 0;
  const counts = MOODS.map(m => [m, days.filter(d => journal[d]?.mood === m).length] as const).sort((a, b) => b[1] - a[1]);
  const color = (n: number) => (n >= 4 ? c.ok : n === 3 ? c.hi : c.warm);
  return (
    <Card>
      <SecHead title="Ruh halim 📈" right="son 30 gün" />
      <View style={styles.chart} accessibilityLabel={`Son 30 günde ${known.length} gün ruh hali seçtin`}>
        {scores.map((n, i) => (
          <View key={days[i]} style={styles.col}>
            {n != null ? (
              <View style={[styles.bar, { height: 12 + n * 14, backgroundColor: color(n) }]} />
            ) : (
              <View style={[styles.dot, { backgroundColor: c.line }]} />
            )}
          </View>
        ))}
      </View>
      {known.length ? (
        <T v="small">
          En sık: {counts[0][0]} · Ortalama {avg >= 4 ? 'çok iyi 😄' : avg >= 3 ? 'iyi 🙂' : avg >= 2 ? 'idare eder 😐' : 'zor günler 💛'} · {known.length} gün
        </T>
      ) : (
        <EmptyMsg>Her gün bir yüz seç, grafiğin dolsun.</EmptyMsg>
      )}
    </Card>
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
  photo: { width: '100%', height: 200, borderRadius: 18 },
  photoX: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 2 },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  done: { borderRadius: 16, padding: 12, gap: 3 },
  doneTitle: { fontFamily: fonts.bodyBlack, fontSize: 13, marginBottom: 2 },
  doneItem: { fontFamily: fonts.body, fontSize: 14 },
});
