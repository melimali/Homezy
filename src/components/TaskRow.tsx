import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { DAY } from '@/domain/constants';
import { isPhotoTask, taskMin } from '@/domain/home';
import { agoText, doneToday as isDoneToday, everyText, placeOf, roomClean, sod, statusIn, uid } from '@/domain/logic';
import type { AppState, Task, TaskList } from '@/domain/types';
import { useNow } from '@/hooks/useNow';
import { persistPhoto } from '@/lib/persistPhoto';
import { usePlay } from '@/play/usePlay';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

import { useToast } from './Toast';
import { Btn, Field, Pill, T } from './ui';

export function findList(S: AppState, rid: string, list: TaskList): Task[] {
  if (list === 'care') return (S.care ||= []);
  if (list === 'plants') return (S.mod[rid].plants ||= []);
  return (S.tasks[rid] ||= []);
}

/**
 * Bir iş satırı: durum, "Tamamladım" ve "⋯" ile açılan ayarlar (yarına ertele, bu sefer atla,
 * sıklık, süre, sil). `showRoom`: Bugün gibi karışık listelerde odanın adı da yazar.
 */
export function TaskRow({
  t, rid, list, showRoom, first,
}: { t: Task; rid: string; list: TaskList; showRoom?: boolean; first?: boolean }) {
  const c = useColors();
  const { state, update, get } = useStore();
  const { award } = usePlay();
  const toast = useToast();
  const now = useNow();
  const [open, setOpen] = useState(false);
  const s = statusIn(state, t, now);
  const room = state.rooms[rid];
  const place = placeOf(state, rid);
  const plant = list === 'plants';
  const photoTask = isPhotoTask(t);
  // Her iş günde bir kez tamamlanır (ve puan verir).
  const doneToday = isDoneToday(t, now);
  const urgent = s.k !== 'ok' && !doneToday;

  const edit = (fn: (x: Task) => void) =>
    update(S => {
      const x = findList(S, rid, list).find(y => y.id === t.id);
      if (x) fn(x);
    });

  const done = (photo?: string) => {
    if (doneToday) return;
    const before = room ? roomClean(get(), rid) : 0;
    const label = `${plant ? '🪴' : place.emoji} ${place.name} · ${t.name}`;
    award('gorev', t.id, label, t.name, S => {
      const x = findList(S, rid, list).find(y => y.id === t.id);
      if (!x) return;
      x.last = Date.now();
      x.snooze = null;
      if (photo) x.photo = photo;
    });
    // Tertemiz oda kutlaması (ayarlardan kapatılabilir).
    const after = get();
    if (room && list === 'tasks' && after.settings.celebrate && before < 100 && roomClean(after, rid) >= 100)
      setTimeout(() => toast(`✨ ${room.name} tertemiz! Harikasın 🎉`), 1800);
  };

  const snooze = (days: number, msg: string) => {
    edit(x => void (x.snooze = sod(sod(Date.now()) + days * DAY + DAY / 2)));
    setOpen(false);
    toast(msg);
  };

  const remove = () => {
    update(S => {
      const arr = findList(S, rid, list);
      const i = arr.findIndex(y => y.id === t.id);
      if (i > -1) arr.splice(i, 1);
    });
    toast(`${t.name} silindi.`);
  };

  const shoot = async () => {
    try {
      const perm = Platform.OS === 'web' ? { granted: true } : await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return toast('Kamera izni gerekli.');
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
      const res = Platform.OS === 'web' ? await ImagePicker.launchImageLibraryAsync(opts) : await ImagePicker.launchCameraAsync(opts);
      if (res.canceled || !res.assets?.[0]) return;
      done(persistPhoto(res.assets[0].uri, t.photo, 'sayac'));
    } catch (e) {
      console.warn(e);
      toast('Fotoğraf eklenemedi.');
    }
  };

  const min = taskMin(t);
  const action = photoTask ? '📸 Çek' : plant ? 'Suladım' : 'Tamamladım';

  return (
    <View style={[!first && { borderTopWidth: 1.5, borderTopColor: c.line }]}>
      <View style={styles.row}>
        <View style={{ flex: 1, minWidth: 0 }}>
          {showRoom && (
            <View style={styles.roomTag}>
              <View style={{ width: 10, height: 10, borderRadius: 4, borderWidth: 1.5, borderColor: c.wall, backgroundColor: room ? c.room[room.type] : c.surface2 }} />
              <T v="small" style={{ fontFamily: fonts.bodyBold }}>{place.name}{plant ? ' · bitki' : ''}</T>
            </View>
          )}
          <T v="bold">{t.name}</T>
          <View style={styles.meta}>
            <Pill k={s.k} label={s.label} />
            <T v="small">⏱ {min} dk · {everyText(t.every)} · son: {agoText(t.last, now)}</T>
          </View>
        </View>
        <Pressable
          onPress={() => (photoTask ? shoot() : done())}
          disabled={doneToday}
          accessibilityRole="button"
          accessibilityLabel={doneToday ? `${t.name} bugün tamamlandı` : `${t.name}: ${action}`}
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
            {doneToday ? '✓ Bugün' : action}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setOpen(o => !o)}
          accessibilityRole="button"
          accessibilityLabel={`${t.name} ayarları`}
          accessibilityState={{ expanded: open }}
          hitSlop={6}
          style={({ pressed }) => [styles.more, { backgroundColor: open ? c.surface2 : 'transparent' }, pressed && { opacity: 0.7 }]}
        >
          <Text style={{ color: c.muted, fontFamily: fonts.bodyBlack, fontSize: 16, lineHeight: 18 }}>⋯</Text>
        </Pressable>
      </View>
      {open && (
        <View style={[styles.panel, { backgroundColor: c.surface2 }]}>
          {!doneToday && (
            <View style={styles.wrap}>
              <Btn small label="Yarına ertele" onPress={() => snooze(1, `${t.name} yarına ertelendi.`)} />
              <Btn small label="Bu sefer atla" onPress={() => snooze(t.every, `${t.name} bu sefer atlandı, ${t.every === 1 ? 'yarın' : `${t.every} gün sonra`} görüşürüz.`)} />
            </View>
          )}
          <Stepper
            label="Sıklık"
            value={t.every}
            text={everyText(t.every)}
            steps={[1, 2, 3, 4, 5, 7, 10, 14, 21, 30, 45, 60, 90, 180, 365]}
            onChange={v => edit(x => void (x.every = v))}
          />
          <Stepper
            label="Süre"
            value={min}
            text={`${min} dakika`}
            steps={[2, 5, 10, 15, 20, 30, 45, 60, 90, 120]}
            onChange={v => edit(x => void (x.min = v))}
          />
          {photoTask && t.photo && <T v="small">Son sayaç fotoğrafı telefonunda saklı ({agoText(t.last, now)}).</T>}
          {!showRoom && <Btn small kind="ghost" label="Bu işi sil" onPress={remove} style={{ alignSelf: 'flex-start' }} />}
        </View>
      )}
    </View>
  );
}

/** Hazır adımlar arasında − / + ile değer seçer (klavye açmadan). */
function Stepper({ label, value, text, steps, onChange }: { label: string; value: number; text: string; steps: number[]; onChange: (v: number) => void }) {
  const c = useColors();
  const prev = [...steps].reverse().find(x => x < value);
  const next = steps.find(x => x > value);
  return (
    <View style={styles.stepRow}>
      <T v="bold" style={{ fontSize: 14, width: 52 }}>{label}</T>
      <StepBtn label="−" a11y={`${label} azalt`} disabled={prev == null} onPress={() => prev != null && onChange(prev)} />
      <Text style={{ flex: 1, textAlign: 'center', fontFamily: fonts.bodyBlack, fontSize: 14, color: c.ink }}>{text}</Text>
      <StepBtn label="+" a11y={`${label} artır`} disabled={next == null} onPress={() => next != null && onChange(next)} />
    </View>
  );
}

export function StepBtn({ label, a11y, onPress, disabled }: { label: string; a11y: string; onPress: () => void; disabled?: boolean }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y} hitSlop={4}
      style={({ pressed }) => [styles.step, { backgroundColor: c.surface }, (pressed || disabled) && { opacity: 0.5 }]}>
      <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 17, color: c.ink }}>{label}</Text>
    </Pressable>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 11 },
  more: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  panel: { borderRadius: 16, padding: 12, gap: 10, marginBottom: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  step: { width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  roomTag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 },
  done: { borderWidth: 2, borderRadius: radius.pill, paddingVertical: 7, paddingHorizontal: 13 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  everyText: { fontFamily: fonts.bodyBold, fontSize: 14 },
});
