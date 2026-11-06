import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Squish } from '@/components/motion';
import { BackLink, Btn, Card, Chip, EmptyMsg, Field, Screen, SecHead, Sheet, T, XBtn } from '@/components/ui';
import { MOKA_ASSETS } from '@/constants/moka';
import { adherence, dosesOn, doseState, history, markDose, MED_DISCLAIMER, missedNow, mokaMedLine, newMed, removeMed, type Dose } from '@/domain/meds';
import { dayKey, dayTs } from '@/domain/play';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { dateLocale } from '@/i18n/runtime';
import { fonts, radius, useColors } from '@/theme';

const pad = (n: number) => String(n).padStart(2, '0');
const PRESETS: [string, string][] = [['🌅 Sabah', '08:00'], ['☀️ Öğle', '13:00'], ['🌆 Akşam', '19:00'], ['🌙 Gece', '22:30']];
/** Pazartesiden başlayan hafta günleri; değerler Date.getDay() (0 pazar). */
const WEEK: [number, string][] = [[1, 'Pt'], [2, 'Sa'], [3, 'Ça'], [4, 'Pe'], [5, 'Cu'], [6, 'Ct'], [0, 'Pz']];

const shiftTime = (t: string, dm: number) => {
  const [h, m] = t.split(':').map(n => parseInt(n, 10));
  const total = ((((h || 0) * 60 + (m || 0) + dm) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};

/**
 * İlaç takibi: ilaç ekle (doz, saatler, günler), bugünün dozlarını "Aldım" / "Atla" ile işaretle,
 * son 7 günün özetine bak. Veri sadece telefonda kalır. Tıbbi tavsiye vermez.
 */
export default function Ilac() {
  const c = useColors();
  const now = useNow();
  const { state: S, update } = useStore();
  const today = dayKey(now);
  const doses = dosesOn(S, today);
  const missed = missedNow(S, now);
  const dueNow = doses.filter(d => doseState(d, now) === 'due');
  const allDone = doses.length > 0 && doses.every(d => d.mark);
  const hist = history(S, 7, now);
  const pct = adherence(hist);
  // Bugün sekmesindeki "+ İlaç ekle" doğrudan ekleme penceresini açar (/ilac?add=1).
  const { add } = useLocalSearchParams<{ add?: string }>();
  const [open, setOpen] = useState(add === '1');

  const mark = (d: Dose, s: 'taken' | 'skipped' | null) => update(D => void markDose(D, today, d.key, s));

  return (
    <Screen header={false}>
      <BackLink />
      <View>
        <T v="eyebrow">İlaçlarım</T>
        <T v="h1">İlaç ve takviye 💊</T>
        <T v="lead">Vaktinde hatırlatırım, aldıklarını sen işaretlersin.</T>
      </View>

      {S.meds.length > 0 && (
        <Card style={{ backgroundColor: missed.length ? c.todaySoft : c.accentSoft }}>
          <View style={st.moka}>
            <Image source={MOKA_ASSETS[missed.length ? 'wink' : 'happy']} style={st.mokaImg} resizeMode="contain" accessibilityIgnoresInvertColors />
            <T v="bold" style={{ flex: 1, fontSize: 14.5, lineHeight: 21 }}>{mokaMedLine(missed, dueNow, allDone)}</T>
          </View>
        </Card>
      )}

      <Card>
        <SecHead title="Bugün" right={doses.length ? `${doses.filter(d => d.mark?.s === 'taken').length}/${doses.length}` : undefined} />
        {!S.meds.length ? (
          <EmptyMsg>Henüz ilaç eklemedin. İlk ilacını ya da takviyeni (vitamin, mineral…) ekleyince vaktinde hatırlatırım.</EmptyMsg>
        ) : !doses.length ? (
          <T v="small">Bugün için alınacak ilaç yok 🌿</T>
        ) : (
          <View style={{ gap: 10 }}>
            {doses.map(d => {
              const state = doseState(d, now);
              const bg = state === 'taken' ? c.okSoft : state === 'missed' ? c.todaySoft : c.surface2;
              return (
                <View key={d.key} style={[st.dose, { backgroundColor: bg }]}>
                  <Text style={{ fontSize: 24 }}>{state === 'taken' ? '✅' : state === 'skipped' ? '⏭️' : d.med.kind === 'takviye' ? '🌿' : '💊'}</Text>
                  <View style={{ flex: 1 }}>
                    <T v="bold" style={{ fontSize: 15 }}>{d.med.name}</T>
                    <T v="small">
                      {d.time}{d.med.dose ? ` · ${d.med.dose}` : ''}
                      {state === 'skipped' ? ' · atladın' : state === 'missed' ? ' · vakti geçti' : state === 'due' ? ' · şimdi' : ''}
                    </T>
                  </View>
                  {d.mark ? (
                    <Btn small label="Geri al" onPress={() => mark(d, null)} />
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Btn small kind="primary" label="Aldım" onPress={() => mark(d, 'taken')} />
                      <Btn small label="Atla" onPress={() => mark(d, 'skipped')} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
        <Btn kind={S.meds.length ? 'soft' : 'primary'} label="+ İlaç / takviye ekle" onPress={() => setOpen(true)} />
      </Card>

      {S.meds.length > 0 && (
        <>
          <Card>
            <SecHead title="Son 7 gün" right={pct == null ? undefined : `%${pct} alındı`} />
            <View style={st.week}>
              {hist.map(h => {
                const ratio = h.total ? h.taken / h.total : 0;
                return (
                  <View key={h.day} style={{ alignItems: 'center', gap: 4, flex: 1 }}>
                    <View style={[st.barBox, { backgroundColor: c.surface2 }]}>
                      {h.total > 0 && <View style={[st.bar, { height: `${Math.max(8, ratio * 100)}%`, backgroundColor: ratio >= 1 ? c.ok : ratio > 0 ? c.hi : c.line }]} />}
                    </View>
                    <Text style={[st.dayLabel, { color: h.day === today ? c.ink : c.muted }]}>
                      {new Date(dayTs(h.day)).toLocaleDateString(dateLocale(), { weekday: 'narrow' })}
                    </Text>
                    <Text style={[st.dayLabel, { color: c.muted, fontSize: 10.5 }]}>{h.total ? `${h.taken}/${h.total}` : '–'}</Text>
                  </View>
                );
              })}
            </View>
          </Card>

          <Card>
            <SecHead title="İlaç ve takviyelerim" />
            {S.meds.map(m => (
              <View key={m.id} style={st.medRow}>
                <View style={{ flex: 1 }}>
                  <T v="bold" style={{ fontSize: 15 }}>{m.name}{m.dose ? ` · ${m.dose}` : ''}</T>
                  <T v="small">{m.times.join(', ')} · {m.days.length ? WEEK.filter(([d]) => m.days.includes(d)).map(([, l]) => l).join(' ') : 'her gün'}</T>
                </View>
                <XBtn label={`${m.name} ilacını sil`} onPress={() => update(D => void removeMed(D, m.id))} />
              </View>
            ))}
          </Card>
        </>
      )}

      <T v="tiny" style={{ textAlign: 'center' }}>{MED_DISCLAIMER} İlaç bilgilerin sadece bu telefonda durur, buluta yedeklenmez.</T>

      <AddSheet open={open} onClose={() => setOpen(false)} onSave={(n, d, t, days, k) => {
        update(D => void D.meds.push(newMed(n, d, t, days, Date.now(), k)));
        setOpen(false);
      }} />
    </Screen>
  );
}

function AddSheet({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (name: string, dose: string, times: string[], days: number[], kind: 'ilac' | 'takviye') => void }) {
  const c = useColors();
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [times, setTimes] = useState<string[]>(['08:00']);
  const [days, setDays] = useState<number[]>([]);
  const [kind, setKind] = useState<'ilac' | 'takviye'>('ilac');
  const togglePreset = (t: string) => setTimes(x => (x.includes(t) ? x.filter(y => y !== t) : [...x, t].sort()));
  const ok = name.trim().length > 0 && times.length > 0;

  return (
    <Sheet open={open} onClose={onClose} scroll pose="happy">
      <T v="h2">{kind === 'takviye' ? 'Yeni takviye' : 'Yeni ilaç'}</T>
      <View style={st.wrap}>
        <Chip label="💊 İlaç" on={kind === 'ilac'} onPress={() => setKind('ilac')} />
        <Chip label="🌿 Takviye" on={kind === 'takviye'} onPress={() => setKind('takviye')} />
      </View>
      {kind === 'takviye' && (
        <View style={st.wrap}>
          {['D vitamini', 'C vitamini', 'Omega-3', 'Magnezyum', 'Demir', 'Probiyotik'].map(n => <Chip key={n} label={n} on={name === n} onPress={() => setName(n)} />)}
        </View>
      )}
      <Field value={name} onChangeText={setName} placeholder={kind === 'takviye' ? 'Takviye adı (ör. D vitamini)' : 'İlaç adı'} maxLength={40} accessibilityLabel="Ad" />
      <Field value={dose} onChangeText={setDose} placeholder="Doz (ör. 1 tablet, 5 ml)" maxLength={30} accessibilityLabel="Doz" />
      <T v="h3">Hangi vakitler?</T>
      <View style={st.wrap}>
        {PRESETS.map(([label, t]) => <Chip key={t} label={label} on={times.includes(t)} onPress={() => togglePreset(t)} />)}
      </View>
      {times.map((t, i) => (
        <View key={`${i}-${t}`} style={st.timeRow}>
          <Squish onPress={() => setTimes(x => x.map((y, j) => (j === i ? shiftTime(y, -15) : y)))} accessibilityLabel="15 dakika geri" style={[st.step, { backgroundColor: c.surface2 }]}>
            <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 18, color: c.ink }}>−</Text>
          </Squish>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 22, color: c.ink, minWidth: 64, textAlign: 'center' }}>{t}</Text>
          <Squish onPress={() => setTimes(x => x.map((y, j) => (j === i ? shiftTime(y, 15) : y)))} accessibilityLabel="15 dakika ileri" style={[st.step, { backgroundColor: c.surface2 }]}>
            <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 18, color: c.ink }}>+</Text>
          </Squish>
        </View>
      ))}
      <T v="h3">Hangi günler?</T>
      <View style={st.wrap}>
        <Chip label="Her gün" on={days.length === 0} onPress={() => setDays([])} />
        {WEEK.map(([d, l]) => (
          <Chip key={d} label={l} on={days.includes(d)} onPress={() => setDays(x => (x.includes(d) ? x.filter(y => y !== d) : [...x, d]))} />
        ))}
      </View>
      <T v="tiny">{MED_DISCLAIMER}</T>
      <Btn kind="primary" label="Ekle" disabled={!ok} onPress={() => { onSave(name, dose, times, days, kind); setKind('ilac'); setName(''); setDose(''); setTimes(['08:00']); setDays([]); }} />
    </Sheet>
  );
}

const st = StyleSheet.create({
  moka: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mokaImg: { width: 56, height: 56 },
  dose: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.tile, padding: 12 },
  week: { flexDirection: 'row', gap: 6 },
  barBox: { width: '100%', height: 70, borderRadius: 12, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 12 },
  dayLabel: { fontFamily: fonts.bodyBold, fontSize: 12 },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  step: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
