import { useFocusEffect, type Href } from 'expo-router';
import { useRouter } from '@/lib/nav';
import { useCallback, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { BackLink, Btn, Card, EmptyMsg, Screen, T } from '@/components/ui';
import { notifs } from '@/domain/logic';
import { prefs } from '@/lib/supabase';
import type { Notice, Settings } from '@/domain/types';
import { PremiumLock } from '@/components/PremiumLock';
import { fmtMinute, getPermission, notificationsAvailable, requestPermission, rescheduleMorningSummaries, smartTimes } from '@/notifications/schedule';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

const pad = (n: number) => String(n).padStart(2, '0');

export default function Bildirimler() {
  const c = useColors();
  const router = useRouter();
  const { state: S, update } = useStore();
  const now = useNow();
  const ns = notifs(S, now);
  const s = S.settings;
  const [perm, setPerm] = useState<'granted' | 'denied' | 'undetermined'>('granted');
  const { premium } = usePurchases();
  const smart = premium.active && s.smart;
  const learned = smartTimes(S);

  useFocusEffect(
    useCallback(() => {
      getPermission().then(setPerm).catch(() => {});
    }, []),
  );

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => update(D => void (D.settings[k] = v));

  const [hh, mm] = s.time.split(':').map(n => parseInt(n, 10));
  const shift = (dh: number, dm: number) => {
    let total = ((hh * 60 + mm + dh * 60 + dm) % 1440 + 1440) % 1440;
    total = Math.round(total / 15) * 15 % 1440;
    set('time', `${pad(Math.floor(total / 60))}:${pad(total % 60)}`);
  };

  const askPermission = async () => {
    if (perm === 'denied') {
      Linking.openSettings().catch(() => {});
      return;
    }
    const ok = await requestPermission();
    setPerm(ok ? 'granted' : 'denied');
    if (ok) rescheduleMorningSummaries(S, premium.active).catch(() => {});
  };

  const [readSet, setRead] = useState<Set<string>>(() => loadRead());
  const unread = ns.filter(n => !readSet.has(keyOf(n))).length;
  const save = (r: Set<string>) => {
    setRead(r);
    prefs.set('notifRead', JSON.stringify([...r].slice(-300)));
  };
  const open = (n: Notice) => {
    save(new Set(readSet).add(keyOf(n)));
    if (n.url) router.push(n.url as Href);
    else router.push({ pathname: '/oda/[id]', params: { id: n.rid } });
  };
  const markAll = () => save(new Set([...readSet, ...ns.map(keyOf)]));

  return (
    <Screen header={false}>
      <BackLink />
      <View>
        <T v="h1">Bildirimler</T>
        <T v="lead">
          {S.settings.language === 'en' ? 'Every morning at ' : 'Homezy her sabah '}<Text style={{ fontFamily: fonts.bodyBlack, color: c.ink }}>{s.time}</Text>{S.settings.language === 'en' ? ' Homezy sends these to your phone as a notification.' : "'da bunları telefonuna bildirim olarak gönderir."}
        </T>
      </View>

      {notificationsAvailable() && perm !== 'granted' && (
        <Card style={{ backgroundColor: c.accentSoft }}>
          <T v="bold">Bildirimler kapalı</T>
          <T style={{ fontSize: 14 }}>
            {perm === 'denied'
              ? 'Sabah özetini alabilmek için telefonun ayarlarından Homezy bildirimlerini aç.'
              : 'Sabah özetini alabilmek için bildirim izni ver.'}
          </T>
          <Btn label={perm === 'denied' ? 'Ayarları aç' : 'İzin ver'} kind="primary" onPress={askPermission} />
        </Card>
      )}

      <Inbox ns={ns} onOpen={open} onAllRead={markAll} readSet={readSet} unread={unread} />

      <Card>
        <T v="h2">Bildirim ayarları</T>
        <View style={[styles.setRow, { borderTopWidth: 0 }]}>
          <View style={{ flex: 1 }}>
            <T v="bold" style={{ fontSize: 14 }}>Günlük özet saati</T>
            <T v="small">Sabah özeti bu saatte gelir</T>
          </View>
          <View style={styles.timeBox}>
            <Step label="−" a11y="Saati 15 dakika geri al" onPress={() => shift(0, -15)} />
            <Text style={[styles.time, { color: c.ink }]}>{s.time}</Text>
            <Step label="+" a11y="Saati 15 dakika ileri al" onPress={() => shift(0, 15)} />
          </View>
        </View>
        <Toggle label="Rutin hatırlatmaları" sub="Geciken ve bugün yapılacak işler, bitki sulama" value={s.routine} onChange={v => set('routine', v)} />
        {s.routine && (
          <Toggle
            label="Bildirimden cevapla ✅"
            sub="Günün en acil 3 işi ayrı bildirimle gelir; uygulamayı açmadan “Yaptım” de, puanın ve serin işlensin. “Yapmadım” işi yarına erteler."
            value={s.actions}
            onChange={v => set('actions', v)}
          />
        )}
        <Toggle label="Eksik ürünler" sub="Biten ürünler ve eski buzdolabı fotoğrafı" value={s.stock} onChange={v => set('stock', v)} />
        <Toggle label="Çamaşır ve dolap" sub="Aynı yıkama türünden 3 kirli parça, mevsim değişimi, bağış önerisi" value={s.laundry} onChange={v => set('laundry', v)} />
        <Toggle label="Faturalar ve bakım 🧾" sub="Son ödeme gününe 2 gün kala, garanti bitişine 30 gün kala, kombi ve klima bakımı, mevsimlik işler" value={s.bills} onChange={v => set('bills', v)} />
        <Toggle label="Son kullanma tarihleri ⏳" sub="Buzdolabındaki ürünlere 2 gün kala" value={s.expiry} onChange={v => set('expiry', v)} />
        <Toggle label="Haftalık özet 📅" sub="Pazar akşamı 19:00'da haftanın özeti" value={s.weekly} onChange={v => set('weekly', v)} />
        <Toggle
          label="Seri hatırlatması 🔥"
          sub={`Akşam ${smart && learned.streak ? fmtMinute(learned.streak) : '20:30'}'da, o gün hiçbir şey yapmadıysan`}
          value={s.streak}
          onChange={v => set('streak', v)}
        />
        <Toggle
          label="Spor hatırlatması 🏃"
          sub={`${smart && learned.sport ? fmtMinute(learned.sport) : s.sportTime}, seçtiğin günlerde`}
          value={s.sport}
          onChange={v => set('sport', v)}
        />
        <Toggle label="İlaç hatırlatmaları 💊" sub="İlaç vaktinde ve 45 dakika sonra bir nazik ikinci hatırlatma (işaretlediysen gelmez)" value={s.meds} onChange={v => set('meds', v)} />
        <Toggle label="Okuma hatırlatması 📖" sub="Akşam 21:00, günlük okuma hedefin tutulmadıysa" value={s.read} onChange={v => set('read', v)} />
        <Toggle label="Su hatırlatması 💧" sub="12:00 ve 17:00, günlük hedef tutulmadıysa" value={s.water} onChange={v => set('water', v)} />
        <Toggle label="Uyku hatırlatması 🌙" sub="Yatış saatinden 30 dakika önce" value={s.sleepRemind} onChange={v => set('sleepRemind', v)} />
        <Btn label="Spor günlerini ve saatini seç" small onPress={() => router.push('/spor')} />
      </Card>

      {premium.active ? (
        <Card>
          <Toggle
            first
            label="Akıllı bildirimler 🧠"
            sub="Hatırlatmalar işlerini genelde yaptığın saate göre gelir; acil bir şey yoksa sabah özeti gelmez."
            value={s.smart}
            onChange={v => set('smart', v)}
          />
          {s.smart && (
            <T v="small">
              {learned.streak || learned.sport
                ? `Öğrendiğim saatler: seri ${learned.streak ? fmtMinute(learned.streak) : '20:30'}, spor ${learned.sport ? fmtMinute(learned.sport) : s.sportTime}.`
                : 'Birkaç gün iş ve spor yaptıkça saatlerini öğreneceğim.'}
            </T>
          )}
        </Card>
      ) : (
        <PremiumLock emoji="🧠" title="Akıllı bildirimler" text="Hatırlatmalar sabit saatte değil, işlerini genelde yaptığın saate göre gelsin; boş yere rahatsız etmesin." />
      )}
      <Card>
        <T v="h2">Düzen ve motivasyon</T>
        <Toggle label="Esnek zamanlama" sub="Zamanı geçen iş hemen gecikmiş sayılmaz; sıklığının yarısı kadar gün tolerans (haftalık iş 3 gün)" value={s.flex} onChange={v => set('flex', v)} />
        <Toggle label="Ses ve titreşim 🔔" sub="Dokunuşta, iş bitince ve kutlamada yumuşak bir ses" value={s.sound} onChange={v => set('sound', v)} />
        <Toggle label="Tertemiz oda kutlaması 🎉" sub="Bir odanın bütün işleri bitince kısa bir kutlama" value={s.celebrate} onChange={v => set('celebrate', v)} />
      </Card>
      {!notificationsAvailable() && (
        <T v="small" style={{ textAlign: 'center' }}>Burada bildirim gönderilemiyor (web önizlemesi ya da Expo Go). Telefona kurulan sürümde aynı kurallar bildirim merkezine düşer.</T>
      )}
    </Screen>
  );
}

const keyOf = (n: Notice) => `${n.k}|${n.title}`;

function loadRead(): Set<string> {
  try {
    return new Set(JSON.parse(prefs.get('notifRead') || '[]') as string[]);
  } catch {
    return new Set();
  }
}

/** Okunur zaman: "3 gün gecikti", "Bugün", "Yarın", "5 gün kaldı". */
function whenLabel(n: Notice): string {
  const d = n.diff;
  if (d == null) return n.k === 'late' ? 'Gecikti' : n.k === 'today' ? 'Bugün' : 'Yaklaşıyor';
  if (d < 0) return `${-d} gün gecikti`;
  if (d === 0) return 'Bugün';
  if (d === 1) return 'Yarın';
  return `${d} gün kaldı`;
}

const emojiOf = (n: Notice) => {
  const m = n.title.match(/^\p{Extended_Pictographic}\uFE0F?/u);
  return m ? m[0] : '🔔';
};
const bare = (n: Notice) => n.title.replace(/^\p{Extended_Pictographic}\uFE0F?\s*/u, '');

function Inbox({ ns, onOpen, onAllRead, readSet, unread }: { ns: Notice[]; onOpen: (n: Notice) => void; onAllRead: () => void; readSet: Set<string>; unread: number }) {
  const c = useColors();
  const [showRead, setShowRead] = useState(false);
  if (!ns.length)
    return (
      <Card>
        <EmptyMsg pose="wink">Bildirim yok. Evde her şey yolunda, Moka da rahat 🌿</EmptyMsg>
      </Card>
    );
  const fresh = ns.filter(n => !readSet.has(keyOf(n)));
  const old = ns.filter(n => readSet.has(keyOf(n)));
  const groups = [
    { id: 'late', title: '🔴 Önemli', sub: 'Geciken işler', items: fresh.filter(n => n.k === 'late'), col: c.late },
    { id: 'today', title: '🟠 Bugün', sub: 'Bugün bakılacaklar', items: fresh.filter(n => n.k === 'today'), col: c.warm },
    { id: 'ok', title: '🔵 Yaklaşan', sub: 'Acelesi yok', items: fresh.filter(n => n.k === 'ok'), col: c.hi },
  ].filter(g => g.items.length);
  const colOf = (k: Notice['k']) => (k === 'late' ? c.late : k === 'today' ? c.warm : c.hi);
  const row = (n: Notice, i: number, isRead: boolean) => (
    <Pressable
      key={`${keyOf(n)}${i}`}
      accessibilityRole="button"
      accessibilityLabel={`${isRead ? '' : 'Okunmadı. '}${n.title}. ${n.text}`}
      onPress={() => onOpen(n)}
      style={({ pressed }) => [styles.notif, { backgroundColor: c.surface, borderColor: colOf(n.k), opacity: isRead ? 0.65 : 1 }, pressed && { transform: [{ translateY: 1 }] }]}
    >
      <View style={[styles.icon, { backgroundColor: colOf(n.k) + '22' }]}>
        <Text style={{ fontSize: 22 }}>{emojiOf(n)}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={styles.head}>
          <T v="bold" style={{ fontSize: 14, flex: 1 }}>{bare(n)}</T>
          {!isRead && <View style={[styles.dot, { backgroundColor: colOf(n.k) }]} />}
        </View>
        <T v="small" style={{ fontSize: 13 }}>{n.text}</T>
        <Text style={[styles.when, { color: colOf(n.k) }]}>{whenLabel(n)}</Text>
      </View>
    </Pressable>
  );
  return (
    <View style={{ gap: 14 }}>
      <View style={styles.sumRow}>
        <T v="bold" style={{ fontSize: 14, flex: 1 }}>{unread ? `${unread} okunmamış bildirim` : 'Hepsini okudun 🎉'}</T>
        {unread > 0 && (
          <Pressable onPress={onAllRead} accessibilityRole="button" hitSlop={8}>
            <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 13, color: c.hi }}>Hepsini okundu yap</Text>
          </Pressable>
        )}
      </View>
      {groups.map(g => (
        <View key={g.id} style={{ gap: 8 }}>
          <View style={styles.head}>
            <T v="bold" style={{ fontSize: 15 }}>{g.title}</T>
            <Text style={[styles.count, { backgroundColor: g.col + '22', color: g.col }]}>{g.items.length}</Text>
            <T v="small" style={{ flex: 1, textAlign: 'right' }}>{g.sub}</T>
          </View>
          {g.items.map((n, i) => row(n, i, false))}
        </View>
      ))}
      {old.length > 0 && (
        <View style={{ gap: 8 }}>
          <Pressable onPress={() => setShowRead(v => !v)} accessibilityRole="button" style={styles.head}>
            <T v="bold" style={{ fontSize: 15, flex: 1 }}>⚪ Eski · okunanlar ({old.length})</T>
            <Text style={{ fontFamily: fonts.bodyBlack, color: c.muted }}>{showRead ? '▲' : '▼'}</Text>
          </Pressable>
          {showRead && old.map((n, i) => row(n, i, true))}
        </View>
      )}
    </View>
  );
}

function Step({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} hitSlop={4}
      style={({ pressed }) => [styles.step, { backgroundColor: c.surface2 }, pressed && { opacity: 0.7 }]}>
      <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 17, color: c.ink }}>{label}</Text>
    </Pressable>
  );
}

function Toggle({ label, sub, value, onChange, first }: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void; first?: boolean }) {
  const c = useColors();
  return (
    <View style={[styles.setRow, { borderTopColor: c.line }, first && { borderTopWidth: 0 }]}>
      <View style={{ flex: 1 }}>
        <T v="bold" style={{ fontSize: 14 }}>{label}</T>
        <T v="small">{sub}</T>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: c.hi, false: c.line }}
        thumbColor={c.surface}
        ios_backgroundColor={c.line}
        // react-native-web varsayılan olarak yeşil bir düğme çiziyor.
        {...(Platform.OS === 'web' ? ({ activeThumbColor: c.surface } as object) : null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  notif: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: radius.card, borderWidth: 1.5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sumRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  count: { fontFamily: fonts.bodyBlack, fontSize: 12, paddingHorizontal: 8, paddingVertical: 1, borderRadius: 10, overflow: 'hidden' },
  when: { fontFamily: fonts.bodyBlack, fontSize: 12, marginTop: 2 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 0 },
  timeBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  time: { fontFamily: fonts.bodyBlack, fontSize: 16, fontVariant: ['tabular-nums'], minWidth: 48, textAlign: 'center' },
  step: { width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
