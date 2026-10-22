import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ROOM_EMOJI } from '@/domain/constants';
import { agoText, daysSince, everyText, status, uid } from '@/domain/logic';
import type { AppState, Task, TaskList } from '@/domain/types';
import { useFamily } from '@/family/FamilyProvider';
import { usePlay } from '@/play/usePlay';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

import { useToast } from './Toast';
import { Btn, Field, Pill, T, XBtn } from './ui';

function findList(S: AppState, rid: string, list: TaskList): Task[] {
  if (list === 'plants') return (S.mod[rid].plants ||= []);
  return (S.tasks[rid] ||= []);
}

export function TaskRow({
  t, rid, list, showRoom, first,
}: { t: Task; rid: string; list: TaskList; showRoom?: boolean; first?: boolean }) {
  const c = useColors();
  const { state, update } = useStore();
  const { award } = usePlay();
  const toast = useToast();
  const s = status(t);
  const room = state.rooms[rid];
  const plant = list === 'plants';
  // Her iş günde bir kez tamamlanır (ve puan verir).
  const doneToday = t.last != null && daysSince(t.last) === 0;
  const urgent = s.k !== 'ok' && !doneToday;
  // Aile paylaşımında işi kimin yapacağı: dokundukça sıradaki kişi, sonra "herkes".
  const { sharing, info } = useFamily();
  const names = sharing && info ? info.members.map(m => m.name) : [];
  const nextWho = () =>
    update(S => {
      const x = findList(S, rid, list).find(y => y.id === t.id);
      if (!x) return;
      const i = x.who ? names.indexOf(x.who) : -1;
      x.who = i + 1 < names.length ? names[i + 1] : null;
    });

  const done = () => {
    if (doneToday) return;
    const label = `${plant ? '🪴' : room ? ROOM_EMOJI[room.type] : '✅'} ${room?.name ?? ''} · ${t.name}`;
    award('gorev', t.id, label, t.name, S => {
      const x = findList(S, rid, list).find(y => y.id === t.id);
      if (x) x.last = Date.now();
    });
  };
  const remove = () => {
    update(S => {
      const arr = findList(S, rid, list);
      const i = arr.findIndex(y => y.id === t.id);
      if (i > -1) arr.splice(i, 1);
    });
    toast(`${t.name} silindi.`);
  };

  return (
    <View style={[styles.row, !first && { borderTopWidth: 1.5, borderTopColor: c.line }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {showRoom && room && (
          <View style={styles.roomTag}>
            <View style={{ width: 10, height: 10, borderRadius: 4, borderWidth: 1.5, borderColor: c.wall, backgroundColor: c.room[room.type] }} />
            <T v="small" style={{ fontFamily: fonts.bodyBold }}>{room.name}{plant ? ' · bitki' : ''}</T>
          </View>
        )}
        <T v="bold">{t.name}</T>
        <View style={styles.meta}>
          <Pill k={s.k} label={s.label} />
          <T v="small">Son: {agoText(t.last)} · {everyText(t.every)}</T>
          {names.length > 0 && (
            <Pressable onPress={nextWho} accessibilityRole="button" accessibilityLabel={`${t.name}: kim yapacak? ${t.who ?? 'herkes'}`} hitSlop={6}
              style={[styles.who, { backgroundColor: t.who ? c.accentSoft : c.surface2 }]}>
              <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 11.5, color: c.ink }}>👤 {t.who ?? 'Herkes'}</Text>
            </Pressable>
          )}
        </View>
      </View>
      <Pressable
        onPress={done}
        disabled={doneToday}
        accessibilityRole="button"
        accessibilityLabel={doneToday ? `${t.name} bugün tamamlandı` : `${t.name}: ${plant ? 'Suladım' : 'Tamamladım'}`}
        style={({ pressed }) => [
          styles.done,
          doneToday
            ? { backgroundColor: c.okSoft, borderColor: c.okSoft }
            : urgent
            ? { backgroundColor: c.accent, borderColor: c.accent, boxShadow: pressed ? undefined : `0 3px 0 ${c.shadow}` }
            : { borderColor: c.hi },
          pressed && { transform: [{ translateY: 2 }] },
        ]}
      >
        <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 12.5, color: doneToday ? c.ok : urgent ? c.onAccent : c.ink }}>
          {doneToday ? '✓ Bugün' : plant ? 'Suladım' : 'Tamamladım'}
        </Text>
      </Pressable>
      {!showRoom && <XBtn onPress={remove} label={`${t.name} sil`} />}
    </View>
  );
}

/** "Yeni rutin" / "Yeni bitki" satırı. */
export function AddTaskForm({ rid, list, placeholder }: { rid: string; list: TaskList; placeholder: string }) {
  const c = useColors();
  const { update } = useStore();
  const toast = useToast();
  const [name, setName] = useState('');
  const [every, setEvery] = useState('7');

  const submit = () => {
    const n = name.trim();
    if (!n) return;
    const e = Math.min(365, Math.max(1, parseInt(every, 10) || 7));
    update(S => {
      findList(S, rid, list).push({ id: uid(), name: n, every: e, last: null });
    });
    setName('');
    toast(`${n} eklendi.`);
  };

  return (
    <View style={{ gap: 8, marginTop: 4 }}>
      <View style={styles.addRow}>
        <Field value={name} onChangeText={setName} placeholder={placeholder} onSubmitEditing={submit} returnKeyType="done" />
      </View>
      <View style={styles.addRow}>
        <Text style={[styles.everyText, { color: c.muted }]}>Her</Text>
        <Field
          value={every}
          onChangeText={v => setEvery(v.replace(/[^0-9]/g, '').slice(0, 3))}
          keyboardType="number-pad"
          accessibilityLabel="Kaç günde bir"
          style={{ flex: 0, width: 60, textAlign: 'center', paddingHorizontal: 6 }}
        />
        <Text style={[styles.everyText, { color: c.muted, flex: 1 }]}>günde bir</Text>
        <Btn label="Ekle" kind="primary" small onPress={submit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11 },
  roomTag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 },
  who: { borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: 8 },
  done: { borderWidth: 2, borderRadius: radius.pill, paddingVertical: 7, paddingHorizontal: 13 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  everyText: { fontFamily: fonts.bodyBold, fontSize: 14 },
});
