import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DAY } from '@/domain/constants';
import { agoText, everyText, fmtShort, status, uid } from '@/domain/logic';
import type { AppState, Task, TaskList } from '@/domain/types';
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
  const toast = useToast();
  const s = status(t);
  const room = state.rooms[rid];
  const plant = list === 'plants';
  const urgent = s.k !== 'ok';

  const done = () => {
    update(S => {
      const x = findList(S, rid, list).find(y => y.id === t.id);
      if (x) x.last = Date.now();
    });
    toast(`${t.name} tamam. Sıradaki: ${fmtShort(Date.now() + t.every * DAY)}`);
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
        </View>
      </View>
      <Pressable
        onPress={done}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.done,
          urgent
            ? { backgroundColor: c.accent, borderColor: c.accent, boxShadow: pressed ? undefined : `0 3px 0 ${c.shadow}` }
            : { borderColor: c.hi },
          pressed && { transform: [{ translateY: 2 }] },
        ]}
      >
        <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 12.5, color: urgent ? c.onAccent : c.ink }}>{plant ? 'Sulandı' : 'Yaptım'}</Text>
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
  done: { borderWidth: 2, borderRadius: radius.pill, paddingVertical: 7, paddingHorizontal: 13 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  everyText: { fontFamily: fonts.bodyBold, fontSize: 14 },
});
