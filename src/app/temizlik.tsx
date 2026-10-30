import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Appear, Float, Squish } from '@/components/motion';
import { SceneImage } from '@/components/SceneImage';
import { useTask } from '@/components/TaskRow';
import { Bar, IconBtn, Pill, T } from '@/components/ui';
import { MOKA_ASSETS, ROOM_POSE, type MokaPose } from '@/constants/moka';
import { roomMokaScene, HOME_MOKA_SCENE } from '@/constants/curated-scenes';
import { ROOM_SCENES } from '@/constants/scenes';
import { cleanQueue } from '@/domain/clean';
import { ROOM_EMOJI } from '@/domain/constants';
import { taskArt } from '@/domain/icons';
import { allTasks } from '@/domain/logic';
import { sfx } from '@/lib/sfx';
import type { TaskRef } from '@/domain/types';
import { useStore } from '@/store/AppStore';
import { fonts, radius, space, useColors } from '@/theme';

type Phase = 'room' | 'count' | 'run' | 'end';
const key = (x: TaskRef) => `${x.list}:${x.t.id}`;

/** Temizlik başlat: oda seç → 3-2-1 → Moka'nın sıraladığı işler tek tek → özet. */
export default function Clean() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state: S } = useStore();
  const [phase, setPhase] = useState<Phase>('room');
  const [rid, setRid] = useState<string | null>(null);
  const [queue, setQueue] = useState<TaskRef[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [finished, setFinished] = useState<string[]>([]);
  const [points, setPoints] = useState(0);
  const [empty, setEmpty] = useState(false);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const rooms = S.order.filter(id => S.rooms[id]);
  const room = rid ? S.rooms[rid] : null;

  const pick = (id: string) => {
    sfx('tap');
    const q = cleanQueue(S, id);
    setRid(id);
    setQueue(q);
    setSkipped([]);
    setFinished([]);
    setPoints(0);
    setEmpty(q.length === 0);
    if (q.length) setPhase('count');
  };

  // Sıra: henüz bitmeyenler, atlananlar en sona.
  const left = queue.filter(x => !finished.includes(key(x)));
  const ordered = [...left.filter(x => !skipped.includes(key(x))), ...left.filter(x => skipped.includes(key(x)))];
  const cur = ordered[0];
  const live = cur ? allTasks(S).find(x => key(x) === key(cur)) : undefined;

  const shown: Phase = phase === 'run' && !cur ? 'end' : phase;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {shown === 'room' && (
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32, paddingHorizontal: space.screen, gap: 14 }}>
          <View style={st.top}>
            <IconBtn icon={<Text style={[st.x, { color: c.ink }]}>‹</Text>} label="Geri" onPress={back} />
          </View>
          <Appear style={{ alignItems: 'center', gap: 6 }}>
            <Float amp={4}>
              <Image source={MOKA_ASSETS.dusting} style={st.moka} resizeMode="contain" accessibilityIgnoresInvertColors />
            </Float>
            <T v="h1" style={{ textAlign: 'center' }}>Hangi odayı temizliyorsun?</T>
            <T v="small" style={{ textAlign: 'center' }}>Sırayı Moka çıkarır, sen sadece yap.</T>
          </Appear>
          {empty && room && (
            <View style={[st.note, { backgroundColor: c.okSoft }]}>
              <T v="bold" style={{ color: c.ok }}>{room.name} şu an tertemiz ✨ Başka bir oda seç.</T>
            </View>
          )}
          {rooms.map((id, i) => {
            const r = S.rooms[id];
            const n = cleanQueue(S, id).length;
            return (
              <Appear key={id} index={i + 1}>
                <Squish onPress={() => pick(id)} accessibilityLabel={`${r.name}, ${n} iş`} style={[st.room, { backgroundColor: c.surface }]}>
                  <Text style={{ fontSize: 30 }}>{ROOM_EMOJI[r.type]}</Text>
                  <T v="bold" style={{ flex: 1 }}>{r.name}</T>
                  <Pill k={n ? 'today' : 'ok'} label={n ? `${n} iş` : 'Temiz'} />
                </Squish>
              </Appear>
            );
          })}
        </ScrollView>
      )}

      {shown === 'count' && room && <Countdown room={room.name} pose={ROOM_POSE[room.type]} total={queue.length} onDone={() => setPhase('run')} onCancel={() => setPhase('room')} />}

      {shown === 'run' && room && live && (
        <Run
          key={key(live)}
          ref_={live}
          roomType={room.type}
          roomName={room.name}
          step={finished.length + 1}
          total={queue.length}
          canSkip={ordered.length > 1}
          onClose={back}
          onFinish={p => {
            setPoints(x => x + p);
            setFinished(f => [...f, key(live)]);
          }}
          onSkip={() => setSkipped(s => [...s.filter(x => x !== key(live)), key(live)])}
        />
      )}

      {shown === 'end' && room && (
        <View style={[st.center, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
          <Appear style={{ alignItems: 'center', gap: 10 }}>
            <Float amp={5} dur={2200}>
              <Image source={MOKA_ASSETS.sparkling_complete} style={st.big} resizeMode="contain" accessibilityIgnoresInvertColors />
            </Float>
            <T v="h1" style={{ textAlign: 'center' }}>{room.name} pırıl pırıl!</T>
            <T v="lead" style={{ textAlign: 'center' }}>{finished.length} iş bitti{points ? ` · +${points} ⭐` : ''}. Moka seninle gurur duyuyor.</T>
          </Appear>
          <View style={{ width: '100%', gap: 10 }}>
            <Squish onPress={() => { setPhase('room'); setEmpty(false); }} style={[st.cta, { backgroundColor: c.surface2 }]}>
              <Text style={[st.ctaT, { color: c.ink }]}>Başka oda temizle</Text>
            </Squish>
            <Squish onPress={back} style={[st.cta, { backgroundColor: c.accent }]}>
              <Text style={[st.ctaT, { color: c.onAccent }]}>Bitti</Text>
            </Squish>
          </View>
        </View>
      )}
    </View>
  );
}

function Countdown({ room, pose, total, onDone, onCancel }: { room: string; pose: MokaPose; total: number; onDone: () => void; onCancel: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [n, setN] = useState(3);
  useEffect(() => {
    sfx('tap');
    const id = setTimeout(() => (n === 0 ? onDone() : setN(n - 1)), n === 0 ? 500 : 900);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);
  return (
    <View style={[st.center, { backgroundColor: c.night, paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <Float amp={5}>
        <Image source={MOKA_ASSETS[pose]} style={st.big} resizeMode="contain" accessibilityIgnoresInvertColors />
      </Float>
      <Appear key={n} style={{ alignItems: 'center' }}>
        <Text style={[st.count, { color: c.onNight }]}>{n || '🧹'}</Text>
      </Appear>
      <T v="lead" style={{ textAlign: 'center', color: c.onNight }}>{room} için {total} iş sıraya girdi. Hazır ol!</T>
      <Squish onPress={onCancel} style={st.cancel}>
        <Text style={{ fontFamily: fonts.bodyBold, color: c.onNight }}>Vazgeç</Text>
      </Squish>
    </View>
  );
}

function Run({ ref_, roomType, roomName, step, total, canSkip, onClose, onFinish, onSkip }: {
  ref_: TaskRef; roomType: keyof typeof ROOM_POSE; roomName: string; step: number; total: number; canSkip: boolean;
  onClose: () => void; onFinish: (points: number) => void; onSkip: () => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { t, rid, list } = ref_;
  const k = useTask(t, rid, list);
  const pose = k.pose ?? ROOM_POSE[roomType];
  const art = taskArt(k.pose);
  const scene = roomMokaScene(roomType, ROOM_SCENES[roomType]) ?? HOME_MOKA_SCENE;
  const [busy, setBusy] = useState(false);
  const pts = useRef(0);
  const finish = () => {
    if (busy || k.doneToday) return;
    const r = k.act();
    if (typeof r === 'number') pts.current = r;
    setBusy(true);
  };
  // Fotoğraflı iş kamerada bitince de (doneToday) bir sonrakine geç.
  useEffect(() => {
    if (!k.doneToday) return;
    const id = setTimeout(() => onFinish(pts.current), 900);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k.doneToday]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 170 }}>
        <SceneImage source={scene} ratio={4 / 3.3}>
          <View style={[st.runTop, { top: insets.top + 10 }]}>
            <IconBtn icon={<Text style={[st.x, { color: c.ink }]}>×</Text>} label="Temizliği bırak" onPress={onClose} />
            <View style={[st.stepPill, { backgroundColor: c.surface }]}>
              <Text style={{ fontFamily: fonts.bodyBlack, color: c.ink }}>{roomName} · {Math.min(step, total)}/{total}</Text>
            </View>
          </View>
          <Float amp={4} style={st.runMoka}>
            <Image source={MOKA_ASSETS[pose]} style={{ width: 150, height: 150 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          </Float>
        </SceneImage>
        <View style={[st.sheet, { backgroundColor: c.bg }]}>
          <Bar value={(step - 1) / Math.max(1, total)} color={c.accent} />
          <Appear key={t.id} style={[st.card, { backgroundColor: c.surface }]}>
            <T v="tiny">ŞİMDİ YAPILACAK</T>
            <T v="h1">{k.emoji} {t.name}</T>
            <T v="small" style={{ fontSize: 15 }}>{art.line}</T>
            <View style={st.meta}>
              <Pill k={k.s.k} label={k.s.label} />
              <Pill k="neutral" label={`⏱ ${k.min} dk`} />
            </View>
            {art.steps.map((s, i) => (
              <T key={s} style={{ fontSize: 15 }}>{i + 1}. {s}</T>
            ))}
          </Appear>
        </View>
      </ScrollView>
      <View style={[st.footer, { paddingBottom: insets.bottom + 16, backgroundColor: c.bg }]}>
        <Squish onPress={finish} disabled={busy || k.doneToday} accessibilityLabel="İşi bitir" style={[st.cta, { backgroundColor: k.doneToday ? c.ok : c.accent }]}>
          <Text style={[st.ctaT, { color: c.onAccent }]}>{k.doneToday ? '✓ Tamam!' : k.photoTask ? k.action : 'İşi bitir'}</Text>
        </Squish>
        <Squish onPress={onSkip} disabled={!canSkip || busy} accessibilityLabel="Sonraki iş" style={[st.cta, { backgroundColor: c.surface2, opacity: canSkip ? 1 : 0.5 }]}>
          <Text style={[st.ctaT, { color: c.ink }]}>Sonraki iş →</Text>
        </Squish>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: 'row' },
  x: { fontFamily: fonts.bodyBlack, fontSize: 24, lineHeight: 26 },
  moka: { width: 140, height: 140 },
  big: { width: 220, height: 220 },
  note: { borderRadius: radius.tile, padding: 14 },
  room: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.tile, paddingVertical: 16, paddingHorizontal: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.screen, gap: 16 },
  count: { fontFamily: fonts.displayBold, fontSize: 120, lineHeight: 130 },
  cancel: { paddingVertical: 12, paddingHorizontal: 20 },
  runTop: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepPill: { borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14 },
  runMoka: { position: 'absolute', right: 16, bottom: 28 },
  sheet: { marginTop: -32, borderTopLeftRadius: 34, borderTopRightRadius: 34, paddingHorizontal: 18, paddingTop: 18, gap: 14, width: '100%', maxWidth: 520, alignSelf: 'center' },
  card: { borderRadius: radius.tile, padding: 18, gap: 10 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 10, gap: 10, alignItems: 'center' },
  cta: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, paddingVertical: 17, alignSelf: 'stretch', maxWidth: 484, width: '100%' },
  ctaT: { fontFamily: fonts.bodyBlack, fontSize: 17 },
});
