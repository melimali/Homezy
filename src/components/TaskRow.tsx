import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Animated, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { DAY } from '@/domain/constants';
import { isPhotoTask, taskMin } from '@/domain/home';
import { MOKA_ASSETS } from '@/constants/moka';
import { taskEmoji, taskPose } from '@/domain/icons';
import { agoText, doneToday as isDoneToday, everyText, placeOf, roomClean, sod, statusIn, uid } from '@/domain/logic';
import type { AppState, Task, TaskList } from '@/domain/types';
import { useFamily } from '@/family/FamilyProvider';
import { useNow } from '@/hooks/useNow';
import { persistPhoto } from '@/lib/photos';
import { sfx } from '@/lib/sfx';
import { usePlay } from '@/play/usePlay';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

import { Appear, Burst, Float, Squish } from './motion';
import { useToast } from './Toast';
import { Btn, Field, Pill, Sheet, T } from './ui';

export function findList(S: AppState, rid: string, list: TaskList): Task[] {
  if (list === 'care') return (S.care ||= []);
  if (list === 'plants') return (S.mod[rid].plants ||= []);
  return (S.tasks[rid] ||= []);
}

/** Bir işin durumu ve eylemleri; satır (TaskRow) ve kare (TaskTile) aynı mantığı kullanır. */
export function useTask(t: Task, rid: string, list: TaskList) {
  const { state, update, get } = useStore();
  const { award } = usePlay();
  const toast = useToast();
  const now = useNow();
  // Tamamlayınca düğme zıplar, üstünden '+10 ⭐' süzülür, etrafa yıldız saçılır.
  const [bounce] = useState(() => new Animated.Value(1));
  const [rise] = useState(() => new Animated.Value(0));
  const [gain, setGain] = useState(0);
  const [burst, setBurst] = useState(0);
  const s = statusIn(state, t, now);
  const room = state.rooms[rid];
  const place = placeOf(state, rid);
  const plant = list === 'plants';
  const photoTask = isPhotoTask(t);
  // Her iş günde bir kez tamamlanır (ve puan verir).
  const doneToday = isDoneToday(t, now);
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

  const edit = (fn: (x: Task) => void) =>
    update(S => {
      const x = findList(S, rid, list).find(y => y.id === t.id);
      if (x) fn(x);
    });

  /** İşi bitirir; puan verildiyse kaç puan olduğunu döner (kutlama ekranı için). */
  const done = (photo?: string) => {
    if (doneToday) return 0;
    const before = room ? roomClean(get(), rid) : 0;
    const label = `${plant ? '🪴' : place.emoji} ${place.name} · ${t.name}`;
    const r = award('gorev', t.id, label, t.name, S => {
      const x = findList(S, rid, list).find(y => y.id === t.id);
      if (!x) return;
      x.last = Date.now();
      x.snooze = null;
      if (photo) x.photo = photo;
    });
    // Anında ödül: başarı titreşimi + "bitti" sesi, puan geldiyse hemen ardından jeton sesi.
    sfx('done');
    if (r.awarded) setTimeout(() => sfx('coin'), 220);
    bounce.setValue(0.7);
    Animated.spring(bounce, { toValue: 1, friction: 3, tension: 140, useNativeDriver: true }).start();
    setBurst(b => b + 1);
    if (r.awarded) {
      setGain(r.points);
      rise.setValue(0);
      Animated.timing(rise, { toValue: 1, duration: 1100, useNativeDriver: true }).start(() => setGain(0));
    }
    // Tertemiz oda kutlaması (ayarlardan kapatılabilir).
    const after = get();
    if (room && list === 'tasks' && after.settings.celebrate && before < 100 && roomClean(after, rid) >= 100)
      setTimeout(() => {
        sfx('party');
        toast(`✨ ${room.name} tertemiz! Harikasın 🎉`);
      }, 1800);
    return r.awarded ? r.points : 0;
  };

  const snooze = (days: number, msg: string) => {
    edit(x => void (x.snooze = sod(sod(Date.now()) + days * DAY + DAY / 2)));
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
      done(persistPhoto(res.assets[0].uri, 'sayac', t.photo));
    } catch (e) {
      console.warn(e);
      toast('Fotoğraf eklenemedi.');
    }
  };

  const act = () => (photoTask ? shoot() : done());
  const action = photoTask ? '📸 Çek' : plant ? '💧 Suladım' : 'Tamamladım';
  const emoji = photoTask ? '📸' : taskEmoji(t.name, plant);
  const pose = photoTask ? null : taskPose(t.name, plant);

  return { s, now, room, place, plant, photoTask, doneToday, urgent, names, nextWho, edit, snooze, remove, act, action, emoji, pose, bounce, rise, gain, burst, min: taskMin(t) };
}

export type TaskApi = ReturnType<typeof useTask>;

/** '+10 ⭐' yazısı: düğmenin üstünden süzülüp kaybolur. */
export function Gain({ k }: { k: TaskApi }) {
  const c = useColors();
  if (!k.gain) return null;
  return (
    <Animated.Text
      pointerEvents="none"
      style={[styles.gain, { color: c.warm, opacity: k.rise.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }), transform: [{ translateY: k.rise.interpolate({ inputRange: [0, 1], outputRange: [0, -34] }) }] }]}
    >
      +{k.gain} ⭐
    </Animated.Text>
  );
}

/**
 * Bir iş satırı: solda işin resmi, adı, durumu ve "Tamamladım". "⋯" ile ayarlar açılır (yarına ertele,
 * bu sefer atla, sıklık, süre, sil). `showRoom`: Bugün gibi karışık listelerde odanın adı da yazar.
 */
export function TaskRow({
  t, rid, list, showRoom, first,
}: { t: Task; rid: string; list: TaskList; showRoom?: boolean; first?: boolean }) {
  const c = useColors();
  const router = useRouter();
  const k = useTask(t, rid, list);
  const [open, setOpen] = useState(false);
  const tone = k.doneToday ? c.ok : k.s.k === 'late' ? c.late : k.s.k === 'today' ? c.today : c.muted;
  const sub = [showRoom ? `${k.plant ? '🪴' : k.place.emoji} ${k.place.name}` : null, k.doneToday ? 'Bugün yapıldı' : k.s.label, `${k.min} dk`].filter(Boolean).join(' · ');
  const detail = () => router.push({ pathname: '/is' as any, params: { rid, list, id: t.id } });

  return (
    <View style={[styles.rowWrap, { backgroundColor: k.doneToday ? c.okSoft : k.s.k === 'late' ? c.lateSoft : k.s.k === 'today' ? c.todaySoft : c.surface, shadowColor: c.shadow, borderLeftColor: tone }, !first && { marginTop: 10 }]}>
      {k.doneToday && (
        <Appear style={[styles.stamp, { borderColor: c.ok }]}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, letterSpacing: 1.5, color: c.ok }}>YAPILDI</Text>
        </Appear>
      )}
      <View style={styles.row}>
        <Animated.View style={{ transform: [{ scale: k.bounce }] }}>
          <Gain k={k} />
          <Burst fire={k.burst} />
          <Squish
            onPress={k.act}
            disabled={k.doneToday}
            quiet
            dim={false}
            accessibilityLabel={k.doneToday ? `${t.name} bugün tamamlandı` : `${t.name}: ${k.action}`}
            style={[
              styles.done,
              k.doneToday ? { backgroundColor: c.ok, borderColor: c.ok } : { borderColor: k.urgent ? tone : c.line },
            ]}
          >
            {k.doneToday ? (
              <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 16, color: c.surface }}>✓</Text>
            ) : k.photoTask || k.plant ? (
              <Text style={{ fontSize: 14 }}>{k.photoTask ? '📸' : '💧'}</Text>
            ) : null}
          </Squish>
        </Animated.View>
        <Pressable
          onPress={detail}
          onLongPress={() => setOpen(o => !o)}
          delayLongPress={350}
          accessibilityRole="button"
          accessibilityLabel={`${t.name}, ${sub}. Ayrıntı için dokun, ayarlar için basılı tut`}
          accessibilityState={{ expanded: open }}
          style={({ pressed }) => [styles.rowMain, pressed && { opacity: 0.75 }]}
        >
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <T v="bold" numberOfLines={2} style={k.doneToday && { color: c.muted, textDecorationLine: 'line-through' }}>{t.name}</T>
            <T v="small" numberOfLines={1} style={{ fontSize: 12.5, color: k.urgent ? tone : c.muted }}>{sub}</T>
            <Who k={k} t={t} />
          </View>
          {k.pose ? (
            <Image source={MOKA_ASSETS[k.pose]} style={[styles.sticker, k.doneToday && { opacity: 0.5 }]} resizeMode="contain" accessibilityIgnoresInvertColors />
          ) : (
            <View style={[styles.bubble, { backgroundColor: c.surface2 }]}>
              <Text style={{ fontSize: 24 }}>{k.emoji}</Text>
            </View>
          )}
        </Pressable>
      </View>
      {open && (
        <View style={[styles.panel, { backgroundColor: c.surface2 }]}>
          <TaskSettings t={t} k={k} canDelete={!showRoom} onDone={() => setOpen(false)} />
        </View>
      )}
    </View>
  );
}

function Who({ k, t }: { k: TaskApi; t: Task }) {
  const c = useColors();
  if (!k.names.length) return null;
  return (
    <Pressable onPress={k.nextWho} accessibilityRole="button" accessibilityLabel={`${t.name}: kim yapacak? ${t.who ?? 'herkes'}`} hitSlop={6}
      style={[styles.who, { backgroundColor: t.who ? c.accentSoft : c.surface2 }]}>
      <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 11.5, color: c.ink }}>👤 {t.who ?? 'Herkes'}</Text>
    </Pressable>
  );
}

/** Ertele, atla, sıklık, süre, sil. Satırın altında ya da karenin alt sayfasında açılır. */
export function TaskSettings({ t, k, canDelete, onDone }: { t: Task; k: TaskApi; canDelete: boolean; onDone: () => void }) {
  return (
    <>
      {!k.doneToday && (
        <View style={styles.wrap}>
          <Btn small label="😴 Yarına ertele" onPress={() => { k.snooze(1, `${t.name} yarına ertelendi.`); onDone(); }} />
          <Btn small label="⏭️ Bu sefer atla" onPress={() => { k.snooze(t.every, `${t.name} bu sefer atlandı, ${t.every === 1 ? 'yarın' : `${t.every} gün sonra`} görüşürüz.`); onDone(); }} />
        </View>
      )}
      <T v="small">🔁 {everyText(t.every)} · son: {agoText(t.last, k.now)}</T>
      <Stepper
        label="🔁"
        a11y="Sıklık"
        value={t.every}
        text={everyText(t.every)}
        steps={[1, 2, 3, 4, 5, 7, 10, 14, 21, 30, 45, 60, 90, 180, 365]}
        onChange={v => k.edit(x => void (x.every = v))}
      />
      <Stepper
        label="⏱"
        a11y="Süre"
        value={k.min}
        text={`${k.min} dakika`}
        steps={[2, 5, 10, 15, 20, 30, 45, 60, 90, 120]}
        onChange={v => k.edit(x => void (x.min = v))}
      />
      {k.photoTask && t.photo && <T v="small">Son sayaç fotoğrafı telefonunda saklı ({agoText(t.last, k.now)}).</T>}
      {canDelete && <Btn small kind="ghost" label="🗑️ Bu işi sil" onPress={() => { onDone(); k.remove(); }} style={{ alignSelf: 'flex-start' }} />}
    </>
  );
}

/**
 * Bir iş, büyük ve dokunulabilir bir kare olarak. Ortada işin resmi, altında kısa adı ve durum rengi.
 * Kareye dokununca iş biter (yıldızlar saçılır); basılı tutunca ya da "⋯" ile ayarlar alttan açılır.
 * Oda ekranında ızgara hâlinde durur, böylece uzun yazı okumadan işler bir bakışta görülür.
 */
export function TaskTile({ t, rid, list, index = 0 }: { t: Task; rid: string; list: TaskList; index?: number }) {
  const c = useColors();
  const k = useTask(t, rid, list);
  const [open, setOpen] = useState(false);
  const tone = k.doneToday
    ? { bg: c.okSoft, fg: c.ok }
    : k.s.k === 'late'
    ? { bg: c.lateSoft, fg: c.late }
    : k.s.k === 'today'
    ? { bg: c.todaySoft, fg: c.today }
    : { bg: c.surface, fg: c.muted };
  const label = k.doneToday ? 'Yapıldı ✓' : k.s.label;

  return (
    <Appear index={index} style={styles.tileWrap}>
      <Animated.View style={{ transform: [{ scale: k.bounce }] }}>
        <Squish
          onPress={() => (k.doneToday ? setOpen(true) : k.act())}
          onLongPress={() => setOpen(true)}
          delayLongPress={350}
          quiet
          accessibilityLabel={`${t.name}, ${label}. ${k.doneToday ? 'Ayarlar için dokun' : `${k.action} için dokun, ayarlar için basılı tut`}`}
          style={[
            styles.tile,
            { backgroundColor: tone.bg },
          ]}
        >
          <Float amp={k.urgent ? 3 : 0} dur={1600 + (index % 4) * 200}>
            <Text style={[styles.tileEmoji, k.doneToday && { opacity: 0.55 }]}>{k.emoji}</Text>
          </Float>
          <Text numberOfLines={2} style={[styles.tileName, { color: k.doneToday ? c.muted : c.ink }]}>{t.name}</Text>
          <View style={[styles.tileTag, { backgroundColor: k.doneToday || k.s.k !== 'ok' ? c.surface : c.surface2 }]}>
            <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 11.5, color: tone.fg }}>{label}</Text>
          </View>
          {k.doneToday && <Text style={styles.tileCheck}>✅</Text>}
        </Squish>
        <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`${t.name} ayarları`} hitSlop={8} style={styles.tileMore}>
          <Text style={{ color: c.muted, fontFamily: fonts.bodyBlack, fontSize: 16 }}>⋯</Text>
        </Pressable>
        <Gain k={k} />
        <Burst fire={k.burst} />
      </Animated.View>
      <Sheet open={open} onClose={() => setOpen(false)}>
        <View style={styles.sheetHead}>
          <Text style={{ fontSize: 40 }}>{k.emoji}</Text>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T v="h2">{t.name}</T>
            <View style={styles.meta}>
              <Pill k={k.doneToday ? 'ok' : k.s.k} label={label} />
              <T v="small">⏱ {k.min} dk</T>
              <Who k={k} t={t} />
            </View>
          </View>
        </View>
        {!k.doneToday && <Btn kind="primary" label={k.action} onPress={() => { setOpen(false); k.act(); }} block />}
        <TaskSettings t={t} k={k} canDelete onDone={() => setOpen(false)} />
      </Sheet>
    </Appear>
  );
}

/** Kareler için iki sütunlu ızgara. */
export function TaskGrid({ tasks, rid, list }: { tasks: Task[]; rid: string; list: TaskList }) {
  return (
    <View style={styles.grid}>
      {tasks.map((t, i) => <TaskTile key={t.id} t={t} rid={rid} list={list} index={i} />)}
    </View>
  );
}

/** Hazır adımlar arasında − / + ile değer seçer (klavye açmadan). */
function Stepper({ label, a11y = label, value, text, steps, onChange }: { label: string; a11y?: string; value: number; text: string; steps: number[]; onChange: (v: number) => void }) {
  const c = useColors();
  const prev = [...steps].reverse().find(x => x < value);
  const next = steps.find(x => x > value);
  return (
    <View style={styles.stepRow}>
      <T v="bold" style={{ fontSize: 18, width: 30 }} accessibilityLabel={a11y}>{label}</T>
      <StepBtn label="−" a11y={`${a11y} azalt`} disabled={prev == null} onPress={() => prev != null && onChange(prev)} />
      <Text style={{ flex: 1, textAlign: 'center', fontFamily: fonts.bodyBlack, fontSize: 14, color: c.ink }}>{text}</Text>
      <StepBtn label="+" a11y={`${a11y} artır`} disabled={next == null} onPress={() => next != null && onChange(next)} />
    </View>
  );
}

export function StepBtn({ label, a11y, onPress, disabled }: { label: string; a11y: string; onPress: () => void; disabled?: boolean }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y} hitSlop={4}
      style={({ pressed }) => [styles.step, { backgroundColor: c.accentSoft }, (pressed || disabled) && { opacity: 0.5 }]}>
      <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 17, color: c.ink }}>{label}</Text>
    </Pressable>
  );
}

/** "Yeni rutin" / "Yeni bitki" satırı. */
export function AddTaskForm({ rid, list, placeholder, autoOpen, onAdded }: { rid: string; list: TaskList; placeholder: string; autoOpen?: boolean; onAdded?: () => void }) {
  const c = useColors();
  const { update } = useStore();
  const toast = useToast();
  const [name, setName] = useState('');
  const [every, setEvery] = useState('7');
  // Form kapalı başlar; ekranda sadece bir düğme durur.
  const [open, setOpen] = useState(!!autoOpen);

  const submit = () => {
    const n = name.trim();
    if (!n) return;
    const e = Math.min(365, Math.max(1, parseInt(every, 10) || 7));
    update(S => {
      findList(S, rid, list).push({ id: uid(), name: n, every: e, last: null });
    });
    setName('');
    setOpen(false);
    toast(`${n} eklendi.`);
    onAdded?.();
  };

  if (!open) return <Btn small kind="ghost" label={list === 'plants' ? '🌱 Bitki ekle' : '➕ Yeni iş ekle'} onPress={() => setOpen(true)} style={{ alignSelf: 'flex-start', marginTop: 4 }} />;

  return (
    <View style={{ gap: 8, marginTop: 4 }}>
      <View style={styles.addRow}>
        <Field value={name} onChangeText={setName} placeholder={placeholder} onSubmitEditing={submit} returnKeyType="done" autoFocus />
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
      <Btn small kind="ghost" label="Vazgeç" onPress={() => setOpen(false)} style={{ alignSelf: 'flex-start' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  rowWrap: { borderRadius: radius.tile, paddingHorizontal: 14, borderLeftWidth: 5, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 1, shadowRadius: 10, elevation: 2 },
  stamp: { position: 'absolute', top: 8, right: 12, zIndex: 3, borderWidth: 2, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 1, transform: [{ rotate: '-8deg' }], opacity: 0.8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rowMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  bubble: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  sticker: { width: 66, height: 66, marginVertical: -8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  tileWrap: { width: '48%' },
  tile: { minHeight: 140, borderRadius: radius.card, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16, paddingHorizontal: 10, borderWidth: 0 },
  tileEmoji: { fontSize: 40, lineHeight: 48 },
  tileName: { fontFamily: fonts.bodyBlack, fontSize: 14.5, lineHeight: 19, textAlign: 'center' },
  tileTag: { borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 10, marginTop: 2 },
  tileCheck: { position: 'absolute', top: 8, left: 10, fontSize: 16 },
  tileMore: { position: 'absolute', top: 4, right: 8, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  panel: { borderRadius: radius.tile, padding: 16, gap: 12, marginBottom: 14 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  step: { width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 },
  who: { borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: 8 },
  gain: { position: 'absolute', top: -6, alignSelf: 'center', fontFamily: fonts.bodyBlack, fontSize: 16, zIndex: 2 },
  done: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  everyText: { fontFamily: fonts.bodyBold, fontSize: 14 },
});
