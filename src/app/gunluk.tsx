import { dateLocale } from '@/i18n/runtime';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { PremiumLock } from '@/components/PremiumLock';
import { useToast } from '@/components/Toast';
import { BackLink, Btn, Card, EmptyMsg, Field, Screen, SecHead, T } from '@/components/ui';
import { checkinOf, journalMood } from '@/domain/mood';
import { addDays, awardedToday, dayKey, dayTs, POINTS } from '@/domain/play';
import type { JournalEntry } from '@/domain/types';
import { useNow } from '@/hooks/useNow';
import { deletePhoto, persistPhoto, photoExists, pickPhoto } from '@/lib/photos';
import { usePlay } from '@/play/usePlay';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import { photoUrl, removePhoto, uploadPhoto } from '@/sync/photos';
import { fonts, radius, useColors } from '@/theme';
import { Squish, useReduceMotion } from '@/components/motion';

const MOODS = ['😄', '🙂', '😐', '😔', '😴'];
/** Ruh hali grafiği için puan: 5 çok iyi … 1 kötü. */
const MOOD_SCORE: Record<string, number> = { '😄': 5, '🙂': 4, '😐': 3, '😴': 2, '😔': 1 };
const fmtDay = (k: string) => new Date(dayTs(k)).toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
const fmtYear = (k: string) => new Date(dayTs(k)).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long', year: 'numeric' });
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
  const reduce = useReduceMotion();
  const [day, setDay] = useState(today);
  const isToday = day === today;
  const saved = P.journal[day];
  const [text, setText] = useState(saved?.text ?? '');
  const [mood, setMood] = useState<string | null>(saved?.mood ?? (isToday ? journalMood(checkinOf(S.play)) : null));
  const [photo, setPhoto] = useState<string | null>(saved?.photo ?? null);
  const done = isToday && awardedToday(P, 'gunluk', 'gunluk', now);
  const dirty = text.trim() !== (saved?.text ?? '') || mood !== (saved?.mood ?? null) || photo !== (saved?.photo ?? null);
  const backup = premium.active && status === 'account' && user ? user.id : null;

  // Defter: kapak açılışı ve sayfa çevirme.
  const [open, setOpen] = useState(false);
  const cover = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const flip = useRef(new Animated.Value(0)).current; // -1..1: sayfa dönüşü
  const busy = useRef(false);
  useEffect(() => {
    if (reduce) {
      cover.setValue(1);
      setOpen(true);
      return;
    }
    Animated.timing(cover, { toValue: 1, duration: 900, delay: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const t = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(t);
  }, [cover, reduce]);

  const load = (d: string) => {
    const e = P.journal[d];
    setDay(d);
    setText(e?.text ?? '');
    setMood(e?.mood ?? (d === today ? journalMood(checkinOf(S.play)) : null));
    setPhoto(e?.photo ?? null);
  };
  const go = (dir: -1 | 1) => {
    const next = addDays(day, dir);
    if (busy.current || next > today) return;
    // Kaydedilmemiş fotoğraf seçimi sayfa değişince bırakılır.
    if (photo && photo !== saved?.photo) deletePhoto(photo);
    if (reduce) return load(next);
    busy.current = true;
    Animated.timing(flip, { toValue: dir, duration: 170, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
      load(next);
      flip.setValue(-dir);
      Animated.timing(flip, { toValue: 0, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
        busy.current = false;
      });
    });
  };
  const goRef = useRef(go);
  goRef.current = go;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderRelease: (_, g) => {
          if (g.dx < -50) goRef.current(1); // sola kaydır → ileri sayfa
          else if (g.dx > 50) goRef.current(-1); // sağa kaydır → önceki sayfa
        },
      }),
    [],
  );

  const save = () => {
    const t = text.trim();
    if (!t) return;
    const prev = saved?.photo ?? null;
    const keepKey = photo && photo === prev ? saved?.photoKey ?? null : null;
    const k = day;
    const write = (D: typeof S) =>
      void (D.play.journal[k] = { text: t, mood, at: Date.now(), photo, photoKey: keepKey });
    if (done || !isToday) update(write);
    else award('gunluk', 'gunluk', '📔 Günlüğe yazdım', 'Günlük', write);
    if (prev && prev !== photo) {
      deletePhoto(prev);
      if (saved?.photoKey) removePhoto(saved.photoKey);
    }
    // Premium: fotoğrafı buluta da yedekle.
    if (backup && photo && !keepKey)
      uploadPhoto(backup, photo, `gunluk/${k}`).then(key => {
        if (key) update(D => void (D.play.journal[k] && (D.play.journal[k].photoKey = key)));
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

  const dayLog = P.log[day] ?? [];
  const yearAgo = lastYear(today);
  const empty = !saved && !dayLog.length;
  const pageStyle = {
    transform: [
      { perspective: 900 },
      { rotateY: flip.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-80deg', '0deg', '80deg'] }) },
    ],
    opacity: flip.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.2, 1, 0.2] }),
  };

  return (
    <Screen header={false}>
      <BackLink />
      <View>
        <T v="eyebrow">{fmtDay(today)}</T>
        <T v="h1">Günlüğüm 📔</T>
        <T v="lead">Bugün neler yaptın? Birkaç satır yeter. Günün ilk yazısı +{POINTS.gunluk} puan ⭐</T>
      </View>

      <View style={styles.book}>
        <View style={[styles.paper, { backgroundColor: c.surface, borderColor: c.line }]} {...pan.panHandlers}>
          <View style={styles.nav}>
            <Squish onPress={() => go(-1)} accessibilityRole="button" accessibilityLabel="Önceki sayfa" style={[styles.arrow, { backgroundColor: c.surface2 }]}>
              <Text style={[styles.arrowTx, { color: c.ink }]}>‹</Text>
            </Squish>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[styles.date, { color: c.ink }]}>{isToday ? fmtDay(day) : fmtYear(day)}</Text>
              <Text style={[styles.sub, { color: c.muted }]}>{isToday ? 'Bugün' : new Date(dayTs(day)).toLocaleDateString(dateLocale(), { weekday: 'long' })}</Text>
            </View>
            <Squish
              onPress={() => go(1)}
              disabled={isToday}
              accessibilityRole="button"
              accessibilityLabel="Sonraki sayfa"
              style={[styles.arrow, { backgroundColor: c.surface2, opacity: isToday ? 0.35 : 1 }]}
            >
              <Text style={[styles.arrowTx, { color: c.ink }]}>›</Text>
            </Squish>
          </View>

          <Animated.View style={[{ gap: 12 }, pageStyle]}>
            <T v="h3">{isToday ? 'Bugün nasılsın?' : 'O gün nasıldın?'}</T>
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
              placeholder={isToday ? 'Bugün mutfağı topladım, akşam yürüyüşe çıktım…' : 'Bu sayfa boş. İstersen o günü şimdi yaz…'}
              multiline
              textAlignVertical="top"
              maxLength={2000}
              style={[styles.text, { borderRadius: radius.card - 6 }]}
            />
            {photo && photoExists(photo) && (
              <View>
                <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" accessibilityLabel="Günün fotoğrafı" />
                <Squish onPress={() => setPhoto(null)} accessibilityRole="button" accessibilityLabel="Fotoğrafı kaldır" style={[styles.photoX, { backgroundColor: c.surface }]}>
                  <Text style={{ fontFamily: fonts.bodyBlack, color: c.ink }}>✕</Text>
                </Squish>
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
              label={isToday && !done ? `Kaydet · +${POINTS.gunluk} ⭐` : dirty ? 'Kaydet' : 'Kaydedildi ✓'}
              disabled={!text.trim() || (!dirty && (done || !isToday))}
              onPress={save}
            />
            <DoneList items={dayLog} title={isToday ? 'Bugün yaptıkların' : 'O gün yaptıkların'} empty={isToday ? 'Bugün tamamladığın işler burada görünecek.' : undefined} />
            {empty && !isToday && <EmptyMsg>Bu günde kayıt yok. Sayfayı çevirebilir ya da şimdi yazabilirsin 📖</EmptyMsg>}
          </Animated.View>
          <T v="small" style={{ textAlign: 'center' }}>← sayfaları kaydırarak çevir →</T>
        </View>

        {/* Kapak: açılışta sola doğru açılır, sonra kaybolur. */}
        {!open || !reduce ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.cover,
              { backgroundColor: c.ink, display: open ? 'none' : 'flex' },
              {
                transform: [
                  { perspective: 1100 },
                  { translateX: cover.interpolate({ inputRange: [0, 1], outputRange: [0, -140] }) },
                  { rotateY: cover.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-100deg'] }) },
                  { translateX: cover.interpolate({ inputRange: [0, 1], outputRange: [0, 140] }) },
                ],
                opacity: cover.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
              },
            ]}
          >
            <Text style={{ fontSize: 56 }}>📔</Text>
            <Text style={[styles.coverTx, { color: c.bg }]}>Günlüğüm</Text>
          </Animated.View>
        ) : null}
      </View>

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
  book: { position: 'relative' },
  paper: { borderRadius: 26, borderWidth: 1, padding: 14, paddingLeft: 22, gap: 12, borderLeftWidth: 8, overflow: 'hidden' },
  cover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 26, alignItems: 'center', justifyContent: 'center', gap: 8 },
  coverTx: { fontFamily: fonts.bodyBlack, fontSize: 22 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  arrow: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  arrowTx: { fontFamily: fonts.bodyBlack, fontSize: 26, lineHeight: 30 },
  date: { fontFamily: fonts.bodyBlack, fontSize: 16, textAlign: 'center' },
  sub: { fontFamily: fonts.body, fontSize: 12 },
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
