import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { HowTo } from '@/components/HowTo';
import { Squish } from '@/components/motion';
import { Card, Chip, SecHead, T } from '@/components/ui';
import { gKey } from '@/domain/growth';
import { kindsOf } from '@/domain/havuz';
import { ACTS, CATS, cState, inCat, nextOf, setChoice, starterThree, suggest, type CatId, type CTask } from '@/domain/secim';
import type { Growth } from '@/domain/types';
import { useNow } from '@/hooks/useNow';
import { tx } from '@/i18n/runtime';
import { saveActs, useActs } from '@/profile/useActs';
import { usePersona } from '@/profile/usePersona';
import { useStore } from '@/store/AppStore';
import { radius, useColors } from '@/theme';

type Tab = 'for' | CatId;
const NO_G = { bonus: {} } as unknown as Growth;

/**
 * "Kendin seç": ev işlerinin dışında bakım, sağlık, ders, para, dijital ve sosyal işler.
 * Gün 1 yalnızca 3 basit iş; sonrası isteğe bağlı ve katlanır (Bugün sade kalsın). Puan / seri yok.
 * "Evde neler yaparsın?" cevapları özel işleri açar (klavye, ayakkabı, evcil hayvan...); iş zincirleri sırayla gelir.
 */
export function SecimCard() {
  const c = useColors();
  const now = useNow();
  const { state: S, update } = useStore();
  const { answers, done: asked, disc } = usePersona();
  const acts = useActs();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('for');
  const [edit, setEdit] = useState(false);
  if (!S.setup || S.mode?.k === 'tatil') return null;

  const day = gKey(now);
  const G = S.play.growth;
  const kinds = kindsOf(asked ? answers : null, disc?.type, disc?.answers);
  const ctx = { acts, kinds };
  const first = S.play.days.length === 0;
  // Gün 1'in 3 işi bugünkü işaretlerden etkilenmesin diye boş geçmişle hesaplanır.
  const starters = first ? starterThree(NO_G, day, kinds) : [];
  const startDone = starters.filter(t => cState(G, day, t.id) === 'done').length;
  const showPicker = !first || startDone >= starters.length;
  const list: CTask[] = tab === 'for' ? suggest(G, day, ctx, 5) : inCat(G, ctx, tab);

  const toggleAct = (id: string) => saveActs(acts.includes(id as never) ? acts.filter(a => a !== id) : [...acts, id]);

  return (
    <Card bare>
      <SecHead title="🎯 Sana göre işler" h="h3" />
      {first && starters.length > 0 && (
        <View style={{ gap: 8 }}>
          <T v="small" style={{ marginTop: -6 }}>İlk gün sadece 3 basit iş. Küçük başla, sayılır.</T>
          {starters.map(t => <Row key={t.id} t={t} day={day} G={G} update={update} />)}
          <T v="tiny">{tx(`${startDone}/${starters.length} tamam`)}</T>
        </View>
      )}

      {showPicker && (
        <>
          <Squish onPress={() => setOpen(o => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel="Kendin seç" style={[st.head, { backgroundColor: c.surface2 }]}>
            <T style={{ lineHeight: 29, fontSize: 22 }}>🧭</T>
            <View style={{ flex: 1 }}>
              <T v="bold">{first ? 'Daha fazlası ister misin?' : 'İstersen kendin seç'}</T>
              <T v="tiny">Bakım, sağlık, ders, para, dijital, sosyal... Tamamen isteğe bağlı.</T>
            </View>
            <T v="bold">{open ? '▴' : '▾'}</T>
          </Squish>

          {open && (
            <View style={{ gap: 10, marginTop: 10 }}>
              <View style={st.chips}>
                <Chip label={tx('⭐ Sana göre')} on={tab === 'for'} onPress={() => setTab('for')} />
                {CATS.map(k => <Chip key={k.id} label={`${k.emoji} ${tx(k.label)}`} on={tab === k.id} onPress={() => setTab(k.id)} />)}
              </View>
              {list.map(t => <Row key={t.id} t={t} day={day} G={G} update={update} />)}
              {!list.length && <T v="small">Bu kategoride şimdilik iş kalmadı. Başka bir kategoriye bak.</T>}

              <Squish onPress={() => setEdit(e => !e)} accessibilityRole="button" accessibilityLabel="Evde neler yaparsın" style={[st.head, { backgroundColor: c.surface2 }]}>
                <T style={{ lineHeight: 26, fontSize: 20 }}>🏡</T>
                <T v="bold" style={{ flex: 1 }}>Evde neler yaparsın?</T>
                <T v="small">{tx(`${acts.length} seçili`)}</T>
              </Squish>
              {edit && (
                <View>
                  <T v="tiny" style={{ marginBottom: 6 }}>Seçtiklerine özel işler (klavye, ayakkabı, evcil hayvan...) listeye eklenir.</T>
                  <View style={st.chips}>
                    {ACTS.map(a => <Chip key={a.id} label={`${a.emoji} ${tx(a.label)}`} on={acts.includes(a.id)} onPress={() => toggleAct(a.id)} />)}
                  </View>
                </View>
              )}
            </View>
          )}
        </>
      )}
    </Card>
  );
}

function Row({ t, day, G, update }: { t: CTask; day: string; G: Growth; update: (f: (d: import('@/domain/types').AppState) => void) => void }) {
  const c = useColors();
  const [how, setHow] = useState(false);
  const s = cState(G, day, t.id);
  const next = s === 'done' ? nextOf(t.id) : [];
  return (
    <View style={[st.row, { backgroundColor: c.surface2 }]}>
      <Squish onPress={() => setHow(h => !h)} accessibilityRole="button" accessibilityState={{ expanded: how }} accessibilityLabel={`Nasıl yapılır: ${tx(t.title)}`} style={st.line}>
        <T style={{ lineHeight: 34, fontSize: 26 }}>{s === 'done' ? '✅' : t.emoji}</T>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="bold" numberOfLines={2} style={s === 'done' ? { textDecorationLine: 'line-through' } : undefined}>{tx(t.title)}</T>
          <T v="tiny">{`${tx(CATS.find(k => k.id === t.cat)?.label ?? '')} · ${t.min} ${tx('dk')}${t.after ? ' · ' + tx('zincir') : ''} · ${tx(how ? 'Gizle' : 'Nasıl?')}`}</T>
        </View>
        <Squish onPress={() => update(d => setChoice(d.play.growth, day, t.id, 'done'))} accessibilityRole="button" accessibilityLabel={`Yaptım: ${tx(t.title)}`} style={[st.btn, { backgroundColor: s === 'done' ? c.accent : c.surface }]}>
          <T v="small" style={{ color: s === 'done' ? c.onAccent : c.ink }}>Yaptım</T>
        </Squish>
      </Squish>
      {how && (
        <View>
          <HowTo steps={t.how} />
          {s !== 'done' && (
            <Squish onPress={() => update(d => setChoice(d.play.growth, day, t.id, 'skip'))} accessibilityRole="button" accessibilityLabel={`Geç: ${tx(t.title)}`} style={[st.btn, { backgroundColor: c.surface, alignSelf: 'flex-start', marginTop: 8 }]}>
              <T v="small">Geç, başkasını öner</T>
            </Squish>
          )}
        </View>
      )}
      {next.length > 0 && (
        <T v="small" style={{ color: c.accent }}>{`➡️ ${tx('Sıradaki')}: ${next.map(n => `${n.emoji} ${tx(n.title)}`).join(', ')}`}</T>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.tile, padding: 12, marginTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { borderRadius: radius.tile, padding: 12, gap: 6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
});
