import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MokaMascot } from '@/components/MokaMascot';
import { Squish } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { Ring, WeekBars } from '@/components/charts';
import { BackLink, Bar, Btn, Card, Chip, Screen, SecHead, T, Tabs } from '@/components/ui';
import {
  addPack, addWater, avgSleep, dropPack, fmtSleep, hKey, logSleep, PACKS, packRoom, shiftTime, sleepLine, sleepMinutes, sleepOf,
  sleepOk, waterLine, waterMet, waterOf, waterPct, WATER_GOALS, weekSleep, weekWater,
} from '@/domain/habits';
import { uid } from '@/domain/logic';
import { addXp } from '@/domain/mokaLevel';
import { useNow } from '@/hooks/useNow';
import { usePlay } from '@/play/usePlay';
import { useStore } from '@/store/AppStore';
import { radius, useColors } from '@/theme';

type Tab = 'paket' | 'su' | 'uyku';

/** Alışkanlıklar: hazır paketler, su ve uyku takibi (src/domain/habits.ts). Puan günde bir kez (`gorev:alisk:*`). */
export default function Aliskanlik() {
  const [tab, setTab] = useState<Tab>('paket');
  return (
    <Screen header={false} tone="sky">
      <BackLink />
      <T v="h1">Alışkanlıklar 🌿</T>
      <T v="small">Küçük, tatlı rutinler. Tek dokunuşla planına ekle.</T>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { k: 'paket', emoji: '🧺', label: 'Paketler' },
          { k: 'su', emoji: '💧', label: 'Su' },
          { k: 'uyku', emoji: '🌙', label: 'Uyku' },
        ]}
      />
      {tab === 'paket' && <PacksTab />}
      {tab === 'su' && <WaterTab />}
      {tab === 'uyku' && <SleepTab />}
    </Screen>
  );
}

/* ---------- Paketler ---------- */

function PacksTab() {
  const c = useColors();
  const toast = useToast();
  const { state: S, update } = useStore();
  const H = S.play.habits;
  return (
    <>
      {PACKS.map(p => {
        const on = H.packs.includes(p.id);
        const rid = packRoom(S, p);
        const where = rid ? S.rooms[rid]?.name : 'Ev bakımı';
        return (
          <Card key={p.id}>
            <View style={st.row}>
              <T style={{ fontSize: 34 }}>{p.emoji}</T>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T v="h3">{p.name}</T>
                <T v="tiny">{p.sub} · {where}</T>
              </View>
            </View>
            {p.tasks.map(t => (
              <T key={t.name} v="small">• {t.name} <T v="tiny">· {t.every === 1 ? 'her gün' : `${t.every} günde bir`} · {t.min} dk</T></T>
            ))}
            <Btn
              kind={on ? 'soft' : 'primary'}
              label={on ? 'Plandan kaldır' : 'Planıma ekle'}
              block
              onPress={() => {
                update(D => {
                  if (rid) D.tasks[rid] = on ? dropPack(D.play.habits, D.tasks[rid] || [], p.id) : addPack(D.play.habits, D.tasks[rid] || [], p, uid);
                  else D.care = on ? dropPack(D.play.habits, D.care || [], p.id) : addPack(D.play.habits, D.care || [], p, uid);
                });
                toast(on ? `${p.name} kaldırıldı` : `${p.name} planına eklendi ${p.emoji}`);
              }}
            />
            {on && <T v="tiny" style={{ color: c.muted }}>İşler {where} için Bugün sekmesinde görünür.</T>}
          </Card>
        );
      })}
    </>
  );
}

/* ---------- Su ---------- */

function WaterTab() {
  const c = useColors();
  const now = useNow();
  const { state: S, update } = useStore();
  const { award } = usePlay();
  const H = S.play.habits;
  const day = hKey(now);
  const n = waterOf(H, day);
  const met = waterMet(H, day);

  const add = (k: number) => {
    const willMeet = !met && k > 0 && n + k >= H.waterGoal;
    const run = (D: typeof S) => addWater(D.play.habits, day, k);
    if (willMeet) award('gorev', 'alisk:su', '💧 Su hedefi', 'Su hedefi', D => { run(D); addXp(D.play, 'saglik', 3); });
    else update(run);
  };
  return (
    <>
      <Card>
        <View style={st.row}>
          <Ring pct={waterPct(H, day)} size={96} stroke={11} color={c.accent} />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <T v="h2">{n} / {H.waterGoal} bardak</T>
            <T v="small">{waterLine(H, day)}</T>
          </View>
        </View>
        <View style={st.cups}>
          {Array.from({ length: Math.max(H.waterGoal, n) }, (_, i) => (
            <T key={i} style={{ fontSize: 26, opacity: i < n ? 1 : 0.25 }}>💧</T>
          ))}
        </View>
        <View style={st.row}>
          <Squish onPress={() => add(1)} accessibilityRole="button" accessibilityLabel="Bir bardak ekle" style={[st.big, { backgroundColor: c.accent }]}>
            <T v="bold" style={{ color: c.onAccent }}>+ Bir bardak</T>
          </Squish>
          <Btn label="Geri al" small disabled={!n} onPress={() => add(-1)} />
        </View>
      </Card>

      <Card>
        <SecHead title="Günlük hedef" h="h3" />
        <View style={st.row}>
          {WATER_GOALS.map(g => (
            <Chip key={g} label={`${g} bardak`} on={H.waterGoal === g} onPress={() => update(D => void (D.play.habits.waterGoal = g))} />
          ))}
        </View>
        <T v="tiny">Hatırlatmalar: 12:00 ve 17:00 (hedef tutulduysa gelmez). Bildirimler ekranından kapatılır.</T>
      </Card>

      <Card>
        <SecHead title="Bu hafta" h="h3" />
        <WeekBars bars={weekWater(H, now).map(b => ({ key: b.key, label: b.label, n: b.v, today: b.today }))} />
      </Card>
    </>
  );
}

/* ---------- Uyku ---------- */

function SleepTab() {
  const now = useNow();
  const toast = useToast();
  const { state: S, update } = useStore();
  const { award } = usePlay();
  const H = S.play.habits;
  const day = hKey(now);
  const [bed, setBed] = useState(H.bedtime);
  const [wake, setWake] = useState(H.wake);
  const last = sleepOf(H, day);
  const min = sleepMinutes(bed, wake);
  const avg = avgSleep(H, now);

  const save = () => {
    const run = (D: typeof S) => logSleep(D.play.habits, day, bed, wake);
    if (sleepOk(min, H.sleepGoal)) award('gorev', 'alisk:uyku', '🌙 İyi uyku', 'Uyku kaydı', D => { run(D); addXp(D.play, 'saglik', 3); });
    else {
      update(run);
      toast('Uyku kaydedildi 🌙');
    }
  };
  return (
    <>
      <Card>
        <View style={st.row}>
          <MokaMascot pose={last ? 'sipping' : 'thumbs_up'} size="sm" showBubble={false} />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <T v="bold">{last ? `Bugün ${fmtSleep(last.min)} uyudun` : 'Dün gece nasıl uyudun?'}</T>
            <T v="small">{sleepLine(H, now)}</T>
          </View>
        </View>
      </Card>

      <Card>
        <SecHead title="Dün geceyi kaydet" h="h3" />
        <TimeStep label="🛏️ Yattım" value={bed} onChange={setBed} />
        <TimeStep label="☀️ Kalktım" value={wake} onChange={setWake} />
        <T v="bold">Toplam {fmtSleep(min)}</T>
        <Bar value={min / (H.sleepGoal * 60)} />
        <Btn kind="primary" label={last ? 'Kaydı güncelle' : 'Kaydet'} block onPress={save} />
      </Card>

      <Card>
        <SecHead title="Hedef uyku" h="h3" />
        <View style={st.row}>
          {[7, 8, 9].map(g => <Chip key={g} label={`${g} saat`} on={H.sleepGoal === g} onPress={() => update(D => void (D.play.habits.sleepGoal = g))} />)}
        </View>
        <T v="tiny">Hatırlatma yatış saatinden 30 dk önce gelir. Bildirimler ekranından kapatılır.</T>
      </Card>

      <Card>
        <SecHead title="Bu hafta" h="h3" right={avg != null ? `ort. ${fmtSleep(avg)}` : undefined} />
        <WeekBars bars={weekSleep(H, now).map(b => ({ key: b.key, label: b.label, n: Math.round(b.v), today: b.today }))} />
      </Card>
    </>
  );
}

/** Saati 15 dakikalık adımlarla değiştirir (yazı yazmak yok). */
function TimeStep({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={st.row}>
      <T v="bold" style={{ flex: 1 }}>{label}</T>
      <Btn label="−" small onPress={() => onChange(shiftTime(value, -15))} accessibilityLabel="15 dakika geri" />
      <T v="h3" style={{ minWidth: 64, textAlign: 'center' }}>{value}</T>
      <Btn label="+" small onPress={() => onChange(shiftTime(value, 15))} accessibilityLabel="15 dakika ileri" />
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  cups: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  big: { flex: 1, minWidth: 140, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
});
