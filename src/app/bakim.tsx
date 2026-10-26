import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AddTaskForm, StepBtn, TaskRow } from '@/components/TaskRow';
import { useToast } from '@/components/Toast';
import { BackLink, Btn, Card, Chip, EmptyMsg, Field, Pill, Screen, SecHead, T, XBtn } from '@/components/ui';
import { CARE } from '@/domain/constants';
import { billStatus, dayOfMonth, fmtDate, inDays, monthKey, MONTHS, parseDate, SEASONAL, seasonalNow, warrantyStatus } from '@/domain/home';
import { sortByDue, uid } from '@/domain/logic';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { fonts, useColors } from '@/theme';

/** Ev bakımı: kombi, klima, dedektör, sayaç gibi işler; faturalar, garanti belgeleri ve mevsimlik işler. */
export default function Bakim() {
  const { state: S } = useStore();
  const care = sortByDue(S.care || []);
  return (
    <Screen header={false}>
      <BackLink />
      <View>
        <T v="eyebrow">Sığınak bakımı</T>
        <T v="h1">Sığınağın altyapısı 🔧</T>
        <T v="lead">Arada bir yapılan ama unutulan onarımlar, kaynak faturaları ve garantiler burada.</T>
      </View>

      <Card>
        <SecHead title="Onarım görevleri" right={`${care.length} görev`} />
        <View>
          {care.map((t, i) => <TaskRow key={t.id} t={t} rid={CARE} list="care" first={i === 0} />)}
          {!care.length && <EmptyMsg>Onarım görevi yok. Aşağıdan ekle.</EmptyMsg>}
        </View>
        <AddTaskForm rid={CARE} list="care" placeholder="Yeni bakım işi, ör. Şofben bakımı" />
      </Card>

      <Bills />
      <Warranties />
      <Seasonal />
    </Screen>
  );
}

function Bills() {
  const c = useColors();
  const { state: S, update } = useStore();
  const toast = useToast();
  const now = useNow();
  const [name, setName] = useState('');
  const [day, setDay] = useState(10);
  const bills = [...(S.bills || [])].sort((a, b) => billStatus(a, now).diff - billStatus(b, now).diff);

  const add = () => {
    const n = name.trim();
    if (!n) return;
    // Bu ayın son günü geçmişse bu ayki fatura büyük ihtimalle ödendi; ilk hatırlatma gelecek aya kalır.
    const passed = billStatus({ id: '', name: n, day, paid: null }, now).diff < 0;
    update(D => void D.bills.push({ id: uid(), name: n, day, paid: passed ? monthKey(now) : null }));
    setName('');
    toast(`${n} faturası eklendi. Son günden 2 gün önce hatırlatırım.`);
  };

  return (
    <Card>
      <SecHead title="Faturalar 🧾" right={`${MONTHS[new Date(now).getMonth()]}`} />
      <View>
        {bills.map((b, i) => {
          const st = billStatus(b, now);
          return (
            <View key={b.id} style={[styles.line, i > 0 && { borderTopWidth: 1.5, borderTopColor: c.line }]}>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <T v="bold">{b.name}</T>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Pill k={st.k} label={st.label} />
                  <T v="small">her ayın {b.day}. günü</T>
                </View>
              </View>
              <Btn
                small
                kind={st.paid ? 'soft' : 'primary'}
                label={st.paid ? 'Geri al' : 'Ödendi'}
                onPress={() => update(D => {
                  const x = D.bills.find(y => y.id === b.id);
                  if (x) x.paid = st.paid ? null : monthKey(Date.now());
                })}
              />
              <XBtn label={`${b.name} sil`} onPress={() => update(D => void (D.bills = D.bills.filter(y => y.id !== b.id)))} />
            </View>
          );
        })}
        {!bills.length && <EmptyMsg>Elektrik, su, doğalgaz, internet, kira… Ekle, son günü kaçırma.</EmptyMsg>}
      </View>
      <View style={styles.addRow}>
        <Field value={name} onChangeText={setName} placeholder="Fatura, ör. Elektrik" onSubmitEditing={add} returnKeyType="done" />
      </View>
      <View style={styles.addRow}>
        <T v="bold" style={{ fontSize: 14 }}>Son gün</T>
        <StepBtn label="−" a11y="Günü azalt" onPress={() => setDay(d => Math.max(1, d - 1))} />
        <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 15, color: c.ink, minWidth: 64, textAlign: 'center' }}>ayın {dayOfMonth(day)}</Text>
        <StepBtn label="+" a11y="Günü artır" onPress={() => setDay(d => Math.min(31, d + 1))} />
        <View style={{ flex: 1 }} />
        <Btn small kind="primary" label="Ekle" onPress={add} />
      </View>
    </Card>
  );
}

function Warranties() {
  const c = useColors();
  const { state: S, update } = useStore();
  const toast = useToast();
  const now = useNow();
  const [name, setName] = useState('');
  const [end, setEnd] = useState('');
  const list = [...(S.warranties || [])].sort((a, b) => a.end - b.end);

  const add = (endTs: number | null) => {
    const n = name.trim();
    if (!n) return toast('Önce ürünün adını yaz.');
    if (endTs == null) return toast('Bitiş tarihini 12.05.2027 gibi yaz ya da bir süre seç.');
    update(D => void D.warranties.push({ id: uid(), name: n, end: endTs }));
    setName('');
    setEnd('');
    toast(`${n} eklendi. Garanti bitmeden 30 gün önce hatırlatırım.`);
  };

  return (
    <Card>
      <SecHead title="Garanti belgeleri 🛡️" right={`${list.length} ürün`} />
      <View>
        {list.map((w, i) => {
          const st = warrantyStatus(w, now);
          return (
            <View key={w.id} style={[styles.line, i > 0 && { borderTopWidth: 1.5, borderTopColor: c.line }]}>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <T v="bold">{w.name}</T>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Pill k={st.k === 'late' ? 'neutral' : st.k} label={st.label} />
                  <T v="small">{fmtDate(w.end)}</T>
                </View>
              </View>
              <XBtn label={`${w.name} sil`} onPress={() => update(D => void (D.warranties = D.warranties.filter(y => y.id !== w.id)))} />
            </View>
          );
        })}
        {!list.length && <EmptyMsg>Buzdolabı, telefon, çamaşır makinesi… Garantisi bitmeden haber veririm.</EmptyMsg>}
      </View>
      <View style={styles.addRow}>
        <Field value={name} onChangeText={setName} placeholder="Ürün, ör. Çamaşır makinesi" />
      </View>
      <View style={styles.addRow}>
        <Field value={end} onChangeText={setEnd} placeholder="Bitiş: GG.AA.YYYY" keyboardType="numbers-and-punctuation" />
        <Btn small kind="primary" label="Ekle" onPress={() => add(parseDate(end))} />
      </View>
      <View style={styles.wrap}>
        <T v="small">Bugün aldıysan:</T>
        <Chip label="+1 yıl" on={false} onPress={() => add(inDays(365))} />
        <Chip label="+2 yıl" on={false} onPress={() => add(inDays(730))} />
        <Chip label="+3 yıl" on={false} onPress={() => add(inDays(1095))} />
      </View>
    </Card>
  );
}

function Seasonal() {
  const c = useColors();
  const { state: S, update } = useStore();
  const now = useNow();
  const year = new Date(now).getFullYear();
  const active = new Set(seasonalNow(S, now).map(x => x.id));
  return (
    <Card>
      <SecHead title="Mevsimlik görevler 🍂" right={String(year)} />
      <View>
        {/* Zamanı gelenler üstte, sonra en yakın aydan başlayanlar. */}
        {[...SEASONAL].sort((a, b) => monthsAway(a.months, now) - monthsAway(b.months, now)).map((x, i) => {
          const done = S.seasonal[x.id] === year;
          return (
            <View key={x.id} style={[styles.line, i > 0 && { borderTopWidth: 1.5, borderTopColor: c.line }]}>
              <Text style={{ fontSize: 22 }}>{x.emoji}</Text>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <T v="bold" style={{ fontSize: 15 }}>{x.name}</T>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  {done ? <Pill k="ok" label="Bu yıl yapıldı ✓" /> : active.has(x.id) ? <Pill k="today" label="Zamanı geldi" /> : null}
                  <T v="small">{x.months.map(m => MONTHS[m - 1]).join(' - ')}</T>
                </View>
              </View>
              <Btn
                small
                kind={done ? 'soft' : active.has(x.id) ? 'primary' : 'ghost'}
                label={done ? 'Geri al' : 'Tahkim Et / Onar'}
                onPress={() => update(D => {
                  if (done) delete D.seasonal[x.id];
                  else D.seasonal[x.id] = year;
                })}
              />
            </View>
          );
        })}
      </View>
    </Card>
  );
}

/** Ay listesindeki en yakın aya kaç ay var (bu ay 0). */
function monthsAway(months: number[], now: number) {
  const cur = new Date(now).getMonth() + 1;
  return Math.min(...months.map(m => (m - cur + 12) % 12));
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
});
