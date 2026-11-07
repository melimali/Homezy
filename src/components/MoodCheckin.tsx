import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Appear, Float, Squish } from '@/components/motion';
import { TaskRow } from '@/components/TaskRow';
import { Btn, Field, T } from '@/components/ui';
import { MOKA_ASSETS } from '@/constants/moka';
import { allTasks, doneToday } from '@/domain/logic';
import { answerBusy, answerFeel, BUSY, checkinOf, cleanNote, countOpen, NOTE_MAX, dayPlan, FEELS, feelOf, planTasks, saveCheckin, skipBusy, skipFeel, stageOf, type DayBusy, type Feel } from '@/domain/mood';
import { AWAY_DAYS, awayAhead, dayKey, progressOf } from '@/domain/play';
import { useStep } from '@/lib/firstRun';
import { StepModal } from '@/components/StepModal';
import { sfx } from '@/lib/sfx';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

/**
 * Günün ilk açılışında Moka'nın iki sorusu. `open` verilmezse kendisi karar verir (bugün cevap yoksa açılır);
 * Bugün sekmesindeki "Değiştir" ile `open` ve `onClose` verilerek yeniden açılır.
 */
let counted = false; // Bu uygulama oturumunda açılış bir kere sayılır.

export function MoodCheckin({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const c = useColors();
  const now = useNow();
  const { state: S, update } = useStore();
  // "Tekrar hoş geldin" açılacaksa o gün önce o çıksın; soru kapatılınca sonra gelir.
  const away = awayAhead(S.play, 0, now);
  const welcomeFirst = !progressOf(S.play, now).today && away != null && away >= AWAY_DAYS && S.play.welcomed !== dayKey(now);
  const auto = open === undefined;
  // Otomatik: açılış sayılır, sonra sadece sırası gelen tek soru sorulur (1. açılış nasılsın, 2. açılış evde misin).
  useEffect(() => {
    if (!auto || counted) return;
    counted = true;
    update(D => countOpen(D.play, now));
  }, [auto, update, now]);
  const stage = stageOf(S.play, now);
  const wantsAuto = auto && stage != null && !welcomeFirst;
  // Otomatik açılış sıradan geçer (karşılama → ruh hali); Bugün'deki "Değiştir" doğrudan açar.
  const turn = useStep('mood', wantsAuto);
  const visible = auto ? turn : open;
  const after = useRef<() => void>(() => {});
  const prev = checkinOf(S.play, now);
  const [feel, setFeel] = useState<Feel | null>(prev && 'feel' in prev ? prev.feel : null);
  const [note, setNote] = useState(prev && 'feel' in prev ? prev.note ?? '' : '');
  if (!visible) return null;

  const close = () => onClose?.();
  const skip = (dismiss: () => void) => {
    after.current = () => {
      if (auto) update(D => (stage === 'busy' ? skipBusy(D.play, now) : skipFeel(D.play, now)));
      else if (!prev) update(D => saveCheckin(D.play, { skip: true, at: Date.now() }, now));
      close();
    };
    dismiss();
  };
  const pickFeel = (f: Feel, dismiss: () => void) => {
    sfx('tap');
    if (!auto) { setFeel(f); return; }
    after.current = () => { update(D => answerFeel(D.play, f, now)); close(); };
    dismiss();
  };
  const pick = (busy: DayBusy, dismiss: () => void) => {
    if (!auto && !feel) return;
    sfx('done');
    after.current = () => {
      update(D => (auto || !feel ? answerBusy(D.play, busy, now) : saveCheckin(D.play, { feel, busy, at: Date.now(), note: cleanNote(note) }, now)));
      close();
    };
    dismiss();
  };
  const showBusy = auto ? stage === 'busy' : !!feel;
  const pose = feel && !auto ? feelOf(feel).pose : 'sipping';

  return (
    <StepModal onClose={() => after.current()}>
      {dismiss => (
        <View style={[styles.box, { backgroundColor: c.surface }]}>
          <Float amp={4} dur={2400} style={styles.moka}>
            <Image source={MOKA_ASSETS[pose]} style={styles.mokaImg} resizeMode="contain" accessibilityIgnoresInvertColors />
          </Float>
          {!showBusy ? (
            <Appear key="feel" style={styles.step}>
              <T v="h1" style={styles.center}>Bugün nasıl hissediyorsun?</T>
              <T v="small" style={styles.center}>Günün planını sana göre ayarlayayım.</T>
              <View style={styles.feels}>
                {FEELS.map(f => (
                  <Squish key={f.id} onPress={() => pickFeel(f.id, dismiss)} accessibilityLabel={f.label}
                    style={[styles.feel, { backgroundColor: c.surface2 }]}>
                    <Text style={styles.emoji}>{f.emoji}</Text>
                    <Text style={[styles.feelTxt, { color: c.ink }]}>{f.label}</Text>
                  </Squish>
                ))}
              </View>
            </Appear>
          ) : (
            <Appear key="busy" style={styles.step}>
              <T v="h1" style={styles.center}>Bugün için planın var mı?</T>
              {!auto && <Field value={note} onChangeText={setNote} maxLength={NOTE_MAX} placeholder="İstersen bir not bırak (isteğe bağlı)"
                accessibilityLabel="Not" style={{ alignSelf: 'stretch' }} />}
              <View style={{ gap: 8, alignSelf: 'stretch' }}>
                {BUSY.map(b => (
                  <Squish key={b.id} onPress={() => pick(b.id, dismiss)} accessibilityLabel={`${b.label}, ${b.sub}`}
                    style={[styles.busy, { backgroundColor: c.surface2 }]}>
                    <Text style={styles.emoji}>{b.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <T v="bold">{b.label}</T>
                      <T v="tiny">{b.sub}</T>
                    </View>
                  </Squish>
                ))}
              </View>
              {!auto && <Btn kind="ghost" small label="‹ Geri" onPress={() => setFeel(null)} />}
            </Appear>
          )}
          <Btn kind="ghost" small label={auto ? 'Bugün sorma' : 'Kapat'} onPress={() => skip(dismiss)} />
        </View>
      )}
    </StepModal>
  );
}

/** Bugün sekmesinin üstünde: cevaba göre Moka'nın önerdiği kısa plan. Cevap yoksa "Moduna göre planla" düğmesi. */
export function DayPlanCard() {
  const c = useColors();
  const now = useNow();
  const { state: S } = useStore();
  const [edit, setEdit] = useState(false);
  const ci = checkinOf(S.play, now);
  const plan = dayPlan(ci);
  if (S.mode?.k === 'tatil') return null;

  if (!plan)
    return (
      <>
        <Squish onPress={() => setEdit(true)} accessibilityLabel="Moduna göre planla" style={[styles.card, styles.row, { backgroundColor: c.accentSoft }]}>
          <Text style={styles.emoji}>🌤️</Text>
          <View style={{ flex: 1 }}>
            <T v="bold">Bugün nasılsın?</T>
            <T v="tiny">Söyle, planı moduna göre ayarlayayım.</T>
          </View>
        </Squish>
        <MoodCheckin open={edit} onClose={() => setEdit(false)} />
      </>
    );

  // Plan açılış anında bir kere seçilir: iş yapılınca listeden düşmesin, üstü çizilsin.
  return <PlanBody key={JSON.stringify(ci)} plan={plan} onEdit={() => setEdit(true)} edit={edit} onClose={() => setEdit(false)} />;
}

function PlanBody({ plan, onEdit, edit, onClose }: { plan: NonNullable<ReturnType<typeof dayPlan>>; onEdit: () => void; edit: boolean; onClose: () => void }) {
  const c = useColors();
  const now = useNow();
  const { state: S } = useStore();
  const [ids] = useState(() => planTasks(S, plan, now).map(x => x.t.id));
  // Bugün yapılan iş öneriden düşer; satır üstü çizili kalsın diye bütün işlerden bulunur.
  const all = allTasks(S, now);
  const rows = ids.flatMap(id => all.filter(x => x.t.id === id));
  const allDone = rows.length > 0 && rows.every(x => doneToday(x.t, now));
  const ci = checkinOf(S.play, now);
  const feel = ci && 'feel' in ci ? feelOf(ci.feel) : null;

  return (
    <Appear style={[styles.card, { backgroundColor: c.surface, gap: 10 }]}>
      <View style={styles.row}>
        <Image source={MOKA_ASSETS[allDone ? 'party' : plan.pose]} style={styles.cardMoka} resizeMode="contain" accessibilityIgnoresInvertColors />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="eyebrow" style={{ marginBottom: 0 }}>{feel ? `${feel.emoji} ${feel.label}` : 'Bugün'} · {plan.minutes} dk</T>
          <T v="h3">{plan.title}</T>
          <T v="small" style={{ color: c.ink }}>{allDone ? plan.doneLine : plan.line}</T>
        </View>
        <Btn small label="Değiştir" onPress={onEdit} />
      </View>
      {rows.map((x, i) => <TaskRow key={x.t.id} t={x.t} rid={x.rid} list={x.list} showRoom first={i === 0} />)}
      {!rows.length && <T v="small" style={styles.center}>Bugün için iş yok, keyfine bak 💛</T>}
      <MoodCheckin open={edit} onClose={onClose} />
    </Appear>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  box: { borderRadius: radius.card, padding: 22, paddingTop: 0, marginTop: 80, gap: 12, alignItems: 'center', maxWidth: 420, width: '100%' },
  moka: { marginTop: -80 },
  mokaImg: { width: 150, height: 150 },
  step: { gap: 12, alignItems: 'center', alignSelf: 'stretch' },
  center: { textAlign: 'center' },
  feels: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  feel: { width: 92, paddingVertical: 12, borderRadius: 20, alignItems: 'center', gap: 4 },
  feelTxt: { fontFamily: fonts.bodyBlack, fontSize: 13 },
  emoji: { fontSize: 28 },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 999 },
  card: { borderRadius: radius.card, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardMoka: { width: 56, height: 56 },
});
