import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AdBanner } from '@/ads/AdBanner';
import { ShopList } from '@/components/ShopList';
import { TaskRow } from '@/components/TaskRow';
import { useToast } from '@/components/Toast';
import { Btn, Card, Chip, EmptyMsg, Pill, Screen, SecHead, T } from '@/components/ui';
import { bayramList, billStatus, MODE_KINDS, MODES, seasonalNow, thawVacation, warrantyStatus } from '@/domain/home';
import { allTasks, fmtLong, isGuestRoom, quickPick, shopItems } from '@/domain/logic';
import type { ModeKind } from '@/domain/types';
import { awardedToday, dayKey, POINTS, progressOf } from '@/domain/play';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { fonts, useColors } from '@/theme';

export default function Bugun() {
  const { state: S } = useStore();
  const now = useNow();
  const sorted = allTasks(S, now).sort((a, b) => a.s.diff - b.s.diff);
  // Misafir modunda misafirin göreceği odaların yakın işleri ayrı bir grupta, en üstte.
  const guest = S.mode?.k === 'misafir' ? sorted.filter(x => isGuestRoom(S, x.rid) && x.s.diff <= 2) : [];
  const all = sorted.filter(x => !guest.includes(x));
  // Gecikenler ve bugünküler tek listede (gecikenlerin üstünde kırmızı rozet var); bu hafta kapalı başlar.
  const groups: [string, typeof all][] = [
    ['🫖 Misafir gelmeden', guest],
    ['Bugün yapılacaklar', all.filter(x => x.s.k !== 'ok')],
  ];
  const week = all.filter(x => x.s.k === 'ok' && x.s.diff <= 7);
  const [showWeek, setShowWeek] = useState(false);
  const later = all.filter(x => x.s.k === 'ok' && x.s.diff > 7).length;
  const shop = shopItems(S).map(s => s.x);
  // Tatilde rutinler dondu; liste boş görünsün.
  const visible = S.mode?.k === 'tatil' ? [] : groups.filter(g => g[1].length);

  return (
    <Screen>
      <View>
        <T v="eyebrow">{fmtLong(now)}</T>
        <T v="h1">Yapılacaklar</T>
      </View>
      {!S.home.asked && <ProfilePrompt />}
      <DailyGoals now={now} />
      {visible.map(([label, arr]) => (
        <Card key={label}>
          <SecHead title={label} right={String(arr.length)} />
          <View>
            {arr.map((x, i) => (
              <TaskRow key={x.t.id} t={x.t} rid={x.rid} list={x.list} showRoom first={i === 0} />
            ))}
          </View>
        </Card>
      ))}
      {!visible.length && (
        <Card>
          <EmptyMsg>{S.mode?.k === 'tatil' ? 'Tatildesin, iyi dinlen 🏖️ Ev seni bekler.' : 'Bugünlük her şey tamam 🎉'}</EmptyMsg>
        </Card>
      )}
      {S.mode?.k !== 'tatil' && week.length > 0 && (
        <Card>
          <Pressable onPress={() => setShowWeek(o => !o)} accessibilityRole="button" accessibilityState={{ expanded: showWeek }} style={styles.modeHead}>
            <T v="h2" style={{ flex: 1 }}>Bu hafta</T>
            <T v="small">{showWeek ? 'Gizle' : `${week.length} iş ›`}</T>
          </Pressable>
          {showWeek && week.map((x, i) => <TaskRow key={x.t.id} t={x.t} rid={x.rid} list={x.list} showRoom first={i === 0} />)}
        </Card>
      )}
      {later > 0 && S.mode?.k !== 'tatil' && <T v="small" style={{ textAlign: 'center' }}>Bir haftadan sonra {later} iş daha var.</T>}
      <HomeDue now={now} />
      {shop.length > 0 && (
        <Card>
          <ShopList items={shop} title="Alınacaklar" h="h2" />
        </Card>
      )}
      <ModeCard now={now} />
      <TimeBudget now={now} />
      <AdBanner />
    </Screen>
  );
}

/** Kurulum sorularını henüz cevaplamamış (eski) evler için. */
function ProfilePrompt() {
  const router = useRouter();
  const c = useColors();
  return (
    <Card style={{ backgroundColor: c.accentSoft }}>
      <T v="bold">Evini biraz tanıyalım 🏡</T>
      <T style={{ fontSize: 14 }}>Evcil hayvan, bulaşık makinesi, kombi, klima… 7 kısa soru, rutinlerin evine göre gelsin.</T>
      <Btn kind="primary" small label="Soruları cevapla" onPress={() => router.push('/evim')} style={{ alignSelf: 'flex-start' }} />
    </Card>
  );
}

/** Modlar: Misafir geliyor, Tatile gidiyorum, Yoğun / hasta, Bayram temizliği. */
function ModeCard({ now }: { now: number }) {
  const c = useColors();
  const { state: S, update } = useStore();
  const toast = useToast();
  const mode = S.mode;
  const [open, setOpen] = useState(false);

  const set = (k: ModeKind | null) => {
    update(D => {
      // Tatilden dönerken rutinler kaldığı yerden devam etsin.
      thawVacation(D, Date.now());
      D.mode = k ? { k, since: Date.now(), list: k === 'bayram' ? bayramList() : undefined } : null;
    });
    setOpen(false);
    toast(k ? `${MODES[k].emoji} ${MODES[k].label} modu açık.` : 'Normal düzene döndük 🙂');
  };

  if (!mode)
    return (
      <Card>
        <Pressable onPress={() => setOpen(o => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.modeHead}>
          <T v="h2" style={{ flex: 1 }}>Bugün nasılsın?</T>
          <T v="small">{open ? 'Kapat' : 'Mod seç ›'}</T>
        </Pressable>
        {open && (
          <View style={{ gap: 8 }}>
            {MODE_KINDS.map(k => (
              <Pressable
                key={k}
                onPress={() => set(k)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.modeRow, { backgroundColor: c.surface2 }, pressed && { transform: [{ translateY: 1 }] }]}
              >
                <Text style={{ fontSize: 24 }}>{MODES[k].emoji}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T v="bold" style={{ fontSize: 15 }}>{MODES[k].label}</T>
                  <T v="small">{MODES[k].text}</T>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </Card>
    );

  const m = MODES[mode.k];
  const list = mode.list || [];
  const done = list.filter(x => x.done).length;
  const days = Math.max(0, Math.round((now - mode.since) / 864e5));
  return (
    <Card style={{ backgroundColor: c.todaySoft }}>
      <View style={styles.modeHead}>
        <Text style={{ fontSize: 28 }}>{m.emoji}</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="h2">{m.label}</T>
          <T v="small">{mode.k === 'tatil' ? `${days} gündür tatildesin. Rutinler dondu, hatırlatma yok.` : m.text}</T>
        </View>
      </View>
      {mode.k === 'bayram' && (
        <View style={{ gap: 6 }}>
          <View style={[styles.bar, { backgroundColor: c.surface }]}>
            <View style={[styles.barFill, { width: `${list.length ? (done / list.length) * 100 : 0}%`, backgroundColor: c.hi }]} />
          </View>
          <T v="small">{done} / {list.length} tamam</T>
          {list.map(x => (
            <Pressable
              key={x.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: x.done }}
              onPress={() => update(D => {
                const y = D.mode?.list?.find(z => z.id === x.id);
                if (y) y.done = !y.done;
              })}
              style={styles.check}
            >
              <Text style={{ fontSize: 18 }}>{x.done ? '✅' : '⬜'}</Text>
              <T style={[{ flex: 1, fontSize: 15 }, x.done && { color: c.muted, textDecorationLine: 'line-through' }]}>{x.name}</T>
            </Pressable>
          ))}
        </View>
      )}
      <Btn small label={mode.k === 'tatil' ? 'Tatilden döndüm' : 'Modu kapat'} onPress={() => set(null)} style={{ alignSelf: 'flex-start' }} />
    </Card>
  );
}

/** "Ne kadar vaktin var?": seçilen süreye sığan en acil işler. */
function TimeBudget({ now }: { now: number }) {
  const { state: S } = useStore();
  const [min, setMin] = useState<number | null>(null);
  const picks = min ? quickPick(S, min, now) : [];
  const total = picks.reduce((a, x) => a + x.min, 0);
  if (S.mode?.k === 'tatil') return null;
  return (
    <Card>
      <SecHead title="Ne kadar vaktin var? ⏱️" right={min ? `${total} / ${min} dk` : undefined} />
      <View style={styles.wrap}>
        {[10, 20, 30, 60].map(m => (
          <Chip key={m} label={`${m} dk`} on={min === m} onPress={() => setMin(min === m ? null : m)} />
        ))}
      </View>
      {min != null && (
        <View>
          {picks.map((x, i) => <TaskRow key={x.t.id} t={x.t} rid={x.rid} list={x.list} showRoom first={i === 0} />)}
          {!picks.length && <EmptyMsg>Bu süreye sığan acil iş yok. Keyfine bak ☕</EmptyMsg>}
        </View>
      )}
    </Card>
  );
}

/** Ödenecek faturalar, biten garantiler ve zamanı gelen mevsimlik işler. */
function HomeDue({ now }: { now: number }) {
  const router = useRouter();
  const { state: S } = useStore();
  const rows: { key: string; k: 'late' | 'today' | 'ok'; label: string; title: string }[] = [];
  for (const b of S.bills || []) {
    const st = billStatus(b, now);
    if (!st.paid && st.k !== 'ok') rows.push({ key: b.id, k: st.k, label: st.label, title: `🧾 ${b.name} faturası` });
  }
  for (const w of S.warranties || []) {
    const st = warrantyStatus(w, now);
    if (st.k === 'today') rows.push({ key: w.id, k: 'today', label: st.label, title: `🛡️ ${w.name} garantisi` });
  }
  for (const x of seasonalNow(S, now)) rows.push({ key: x.id, k: 'ok', label: 'Bu ay', title: `${x.emoji} ${x.name}` });
  if (!rows.length) return null;
  return (
    <Card>
      <SecHead title="Faturalar ve bakım" right={String(rows.length)} />
      <View style={{ gap: 8 }}>
        {rows.map(r => (
          <View key={r.key} style={styles.dueRow}>
            <T v="bold" style={{ flex: 1, fontSize: 15 }}>{r.title}</T>
            <Pill k={r.k} label={r.label} />
          </View>
        ))}
      </View>
      <Btn small label="Ev bakımını aç" onPress={() => router.push('/bakim')} style={{ alignSelf: 'flex-start' }} />
    </Card>
  );
}

/** Günün üç hedefi: bir iş, spor, günlük. Her biri seriyi sürdürür ve puan verir. */
function DailyGoals({ now }: { now: number }) {
  const c = useColors();
  const router = useRouter();
  const { state: S } = useStore();
  const P = S.play;
  const today = dayKey(now);
  const tasks = Object.keys(P.awarded).filter(k => k.startsWith('gorev:') && P.awarded[k] === today).length;
  const hp = progressOf(P, now);
  const goals = [
    { done: tasks > 0, emoji: '🧹', label: tasks ? `${tasks} iş tamamladın` : 'Bir iş tamamla', pts: `+${POINTS.gorev}`, go: undefined },
    { done: awardedToday(P, 'spor', 'spor', now), emoji: '🏃', label: 'Spor yap', pts: `+${POINTS.spor}`, go: '/spor' as const },
    { done: awardedToday(P, 'gunluk', 'gunluk', now), emoji: '📔', label: 'Günlüğe yaz', pts: `+${POINTS.gunluk}`, go: '/gunluk' as const },
  ];
  return (
    <Card>
      <SecHead title="Bugünün hedefleri" right={hp.streak ? `🔥 ${hp.streak} gün` : undefined} />
      <View style={{ gap: 8 }}>
        {goals.map(g => (
          <Pressable
            key={g.label}
            disabled={!g.go}
            onPress={() => g.go && router.push(g.go)}
            accessibilityRole={g.go ? 'button' : undefined}
            style={({ pressed }) => [goalStyle.row, { backgroundColor: g.done ? c.okSoft : c.surface2 }, pressed && { transform: [{ translateY: 1 }] }]}
          >
            <Text style={{ fontSize: 20 }}>{g.done ? '✅' : g.emoji}</Text>
            <Text style={[goalStyle.label, { color: g.done ? c.ok : c.ink }]}>{g.label}</Text>
            <Text style={[goalStyle.pts, { color: g.done ? c.ok : c.warm }]}>{g.done ? 'tamam' : `${g.pts} ⭐`}</Text>
            {g.go && !g.done && <Text style={{ color: c.muted, fontSize: 18 }}>›</Text>}
          </Pressable>
        ))}
      </View>
      <T v="small">Her gün en az birini yap, evin inşaatı ilerlesin 🏗️</T>
    </Card>
  );
}

const styles = StyleSheet.create({
  modeHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  bar: { height: 10, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

const goalStyle = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16 },
  label: { flex: 1, fontFamily: fonts.bodyBlack, fontSize: 15 },
  pts: { fontFamily: fonts.bodyBlack, fontSize: 13 },
});
