import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { DoneCelebration } from '@/components/DoneCelebration';
import { Appear, Squish } from '@/components/motion';
import { SceneImage } from '@/components/SceneImage';
import { TaskSettings, useTask } from '@/components/TaskRow';
import { Bar, IconBtn, Pill, Sheet, T } from '@/components/ui';
import { MOKA_ASSETS } from '@/constants/moka';
import { POSE_SCENES, ROOM_SCENES } from '@/constants/scenes';
import { taskArt, taskPose } from '@/domain/icons';
import { everyText } from '@/domain/logic';
import { POINTS } from '@/domain/play';
import type { AppState, Task, TaskList } from '@/domain/types';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

const LISTS: TaskList[] = ['tasks', 'plants', 'care'];

function findTask(S: AppState, rid: string, list: TaskList, id: string): Task | undefined {
  const arr = list === 'care' ? S.care : list === 'plants' ? S.mod[rid]?.plants : S.tasks[rid];
  return arr?.find(t => t.id === id);
}

/** İş ekranı: üstte işin sahnesi, adımlar ve "Başla". Bitince koyu kutlama ekranı açılır. */
export default function TaskScreen() {
  const { rid, list, id } = useLocalSearchParams<{ rid: string; list: string; id: string }>();
  const { state: S } = useStore();
  const l = LISTS.find(x => x === list) ?? 'tasks';
  const t = rid && id ? findTask(S, rid, l, id) : undefined;
  if (!t || !rid) return <Redirect href="/bugun" />;
  return <TaskView t={t} rid={rid} list={l} />;
}

function TaskView({ t, rid, list }: { t: Task; rid: string; list: TaskList }) {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state: S } = useStore();
  const k = useTask(t, rid, list);
  const pose = k.photoTask ? 'todo' : taskPose(t.name, k.plant);
  const art = taskArt(pose);
  const scene = (pose && POSE_SCENES[pose]) || (k.room && ROOM_SCENES[k.room.type]) || POSE_SCENES.happy || MOKA_ASSETS.happy;
  const [checked, setChecked] = useState<boolean[]>(() => art.steps.map(() => false));
  const [started, setStarted] = useState(false);
  const [menu, setMenu] = useState(false);
  const [party, setParty] = useState<number | null>(null);
  const n = checked.filter(Boolean).length;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/bugun'));

  const finish = () => {
    const r = k.act();
    // Fotoğraflı işte kamera açılır; kutlama sadece iş burada bittiyse.
    if (typeof r === 'number') setParty(r);
  };
  const toggle = (i: number) => {
    if (k.doneToday) return;
    setStarted(true);
    setChecked(a => a.map((x, j) => (j === i ? !x : x)));
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        <SceneImage source={scene} ratio={4 / 3.3}>
          <View style={[st.topBtns, { top: insets.top + 10 }]}>
            <IconBtn icon={<Chevron color={c.ink} />} label="Geri" onPress={back} />
            <IconBtn icon={<Text style={{ fontFamily: fonts.bodyBlack, fontSize: 20, color: c.ink, lineHeight: 22 }}>⋮</Text>} label="İş ayarları" onPress={() => setMenu(true)} />
          </View>
        </SceneImage>

        <View style={[st.sheet, { backgroundColor: c.bg }]}>
          <Appear style={[st.card, { backgroundColor: c.surface }]}>
            <View style={st.head}>
              <View style={[st.icon, { backgroundColor: c.surface2 }]}>
                {pose ? <Image source={MOKA_ASSETS[pose]} style={st.iconImg} resizeMode="contain" /> : <Text style={{ fontSize: 30 }}>{k.emoji}</Text>}
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <T v="h2" numberOfLines={2}>{t.name}</T>
                <T v="small" style={{ fontSize: 14.5 }}>{art.line}</T>
              </View>
            </View>
            <View style={st.pointsRow}>
              <Text style={{ fontSize: 20 }}>⭐</Text>
              <Text style={[st.points, { color: c.warm }]}>+{POINTS.gorev} puan</Text>
              <Bar value={k.doneToday ? 1 : n / art.steps.length} color={c.accent} style={{ flex: 1, marginLeft: 8 }} />
            </View>
            <View style={st.meta}>
              <Pill k={k.doneToday ? 'ok' : k.s.k} label={k.doneToday ? 'Bugün yapıldı' : k.s.label} />
              <Pill k="neutral" label={`${k.plant ? '🪴' : k.place.emoji} ${k.place.name}`} />
              <Pill k="neutral" label={`🔁 ${everyText(t.every)}`} />
              <Pill k="neutral" label={`⏱ ${k.min} dk`} />
            </View>
          </Appear>

          <Appear index={1} style={[st.card, { backgroundColor: c.surface, gap: 0 }]}>
            <View style={st.stepsHead}>
              <T v="h3">Adımlar</T>
              <T v="small">{k.doneToday ? art.steps.length : n}/{art.steps.length}</T>
            </View>
            {art.steps.map((s, i) => {
              const on = k.doneToday || checked[i];
              return (
                <Pressable
                  key={s}
                  onPress={() => toggle(i)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  style={[st.step, i > 0 && { borderTopWidth: 1, borderTopColor: c.line }]}
                >
                  <View style={[st.check, { borderColor: on ? c.ok : c.line, backgroundColor: on ? c.ok : 'transparent' }]}>
                    {on && <Text style={{ color: c.surface, fontFamily: fonts.bodyBlack, fontSize: 13 }}>✓</Text>}
                  </View>
                  <T style={[{ flex: 1, fontSize: 15.5 }, on && { color: c.muted, textDecorationLine: 'line-through' }]}>{s}</T>
                </Pressable>
              );
            })}
          </Appear>
        </View>
      </ScrollView>

      <View style={[st.footer, { paddingBottom: insets.bottom + 16, backgroundColor: c.bg }]}>
        {k.doneToday ? (
          <View style={[st.cta, { backgroundColor: c.okSoft }]}>
            <Text style={[st.ctaT, { color: c.ok }]}>✓ Bugün yapıldı</Text>
          </View>
        ) : (
          <Squish onPress={k.photoTask || started ? finish : () => setStarted(true)} accessibilityLabel={k.photoTask ? k.action : started ? 'Bitirdim' : 'Başla'} style={[st.cta, { backgroundColor: c.accent }]}>
            {k.photoTask ? null : started ? <Text style={[st.ctaT, { color: c.onAccent }]}>✓</Text> : <Play color={c.onAccent} />}
            <Text style={[st.ctaT, { color: c.onAccent }]}>{k.photoTask ? k.action : started ? 'Bitirdim' : 'Başla'}</Text>
          </Squish>
        )}
      </View>

      <Sheet open={menu} onClose={() => setMenu(false)} pose={pose ?? 'happy'}>
        <T v="h2">{t.name}</T>
        <TaskSettings t={t} k={k} canDelete onDone={() => { setMenu(false); if (!findTask(S, rid, list, t.id)) back(); }} />
      </Sheet>

      <DoneCelebration
        open={party != null}
        text={`${t.name} tamam 🎉`}
        points={party ?? 0}
        quote={art.cheer}
        onClose={() => {
          setParty(null);
          back();
        }}
      />
    </View>
  );
}

function Chevron({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function Play({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" fill={color} />
    </Svg>
  );
}

const st = StyleSheet.create({
  topBtns: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  sheet: { marginTop: -32, borderTopLeftRadius: 34, borderTopRightRadius: 34, paddingHorizontal: 18, paddingTop: 18, gap: 16, width: '100%', maxWidth: 520, alignSelf: 'center' },
  card: { borderRadius: radius.tile, padding: 18, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  iconImg: { width: 62, height: 62, marginTop: 6 },
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  points: { fontFamily: fonts.bodyBlack, fontSize: 15 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stepsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 6 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 10, alignItems: 'center' },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: radius.pill, paddingVertical: 19, alignSelf: 'stretch', maxWidth: 484, width: '100%' },
  ctaT: { fontFamily: fonts.bodyBlack, fontSize: 18 },
});
