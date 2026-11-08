import { isEn, tlText } from '@/i18n/runtime';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Appear, Squish } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { BackLink, Btn, Card, Chip, EmptyMsg, Screen, Tabs, T } from '@/components/ui';
import { healthLabel, planMeals, qtyText, type MealPick, type Slot } from '@/domain/meals';
import { uid } from '@/domain/logic';
import type { Budget } from '@/domain/persona';
import { titleCase } from '@/domain/recipes';
import { savePersona, usePersona } from '@/profile/usePersona';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

const TIER = { dusuk: '🪙 Cebe dost', orta: '💵 Dengeli', buyuk: '💎 Özel' } as const;
const BUDGETS: [Budget, string][] = [['dusuk', '🪙 Düşük'], ['orta', '💵 Orta'], ['buyuk', '💎 Rahat']];

/** Bu gece ve yarın sabah için kişiye özel yemek önerileri: dolapta olanlar işaretli, eksikler alışveriş listesine eklenir. */
export default function Yemek() {
  const c = useColors();
  const toast = useToast();
  const { state: S, update } = useStore();
  const { answers, done } = usePersona();
  const [slot, setSlot] = useState<Slot>(new Date().getHours() >= 15 || new Date().getHours() < 4 ? 'aksam' : 'sabah');
  const [skip, setSkip] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  const kitchen = S.order.find(id => S.rooms[id]?.type === 'mutfak') ?? null;
  const now = useNow();
  const picks = useMemo(
    () => planMeals(answers, kitchen ? S.mod[kitchen]?.stock ?? [] : [], slot, 3, now, skip),
    [answers, S.mod, kitchen, slot, now, skip],
  );

  const addMissing = (p: MealPick) => {
    if (!kitchen) {
      toast('Önce evine bir mutfak ekle.');
      return;
    }
    update(D => {
      const st = ((D.mod[kitchen] ||= {}).stock ||= []);
      for (const m of p.missing) {
        const ex = st.find(x => x.name.toLocaleLowerCase('tr-TR') === m.n);
        if (ex) ex.lvl = 'yok';
        else st.push({ id: uid(), name: titleCase(m.n), lvl: 'yok' });
      }
    });
    toast(`${p.missing.map(m => titleCase(m.n)).join(', ')} alışveriş listesine eklendi 🛒`);
  };

  return (
    <Screen header={false} tone="peach">
      <BackLink />
      <View>
        <T v="eyebrow">Yemek</T>
        <T v="h1">Bugün ne yesek?</T>
        <T v="lead">{answers.who === 'ogrenci' ? 'Bütçene göre, pratik tarifler.' : 'Sana göre pratik tarifler.'}</T>
        <T v="small">{`${picks[0]?.servings ?? 1} kişilik ölçüler.`}</T>
      </View>

      <Tabs items={[{ k: 'aksam', emoji: '🌙', label: 'Bu gece' }, { k: 'sabah', emoji: '🌞', label: 'Yarın sabah' }]} value={slot} onChange={s => { setSlot(s); setSkip(0); setOpen(null); }} />

      <View style={st.chips}>
        {BUDGETS.map(([b, l]) => (
          <Chip key={b} label={l} on={answers.budget === b} onPress={() => { savePersona({ ...answers, budget: b }, done || true); setSkip(0); }} />
        ))}
      </View>

      {!picks.length && <EmptyMsg pose="chef">Bu ayarlara uyan tarif bulamadım. Bütçeyi ya da süreyi değiştirmeyi dene.</EmptyMsg>}

      {picks.map((p, i) => {
        const on = open === p.meal.id;
        return (
          <Appear key={p.meal.id} index={i}>
            <Card>
              <Squish onPress={() => setOpen(on ? null : p.meal.id)} accessibilityRole="button" accessibilityLabel={p.meal.name} style={st.head}>
                <Text style={{ fontSize: 34 }}>{p.meal.emoji}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T v="bold" style={{ fontSize: 16 }}>{p.meal.name}</T>
                  <T v="small">{p.why} · ⏱ {p.meal.min} dk</T>
                </View>
                <Text style={{ color: c.muted, fontSize: 18 }}>{on ? '⌃' : '⌄'}</Text>
              </Squish>
              <View style={st.badges}>
                <Badge text={`🌿 ${p.meal.health}/5 ${healthLabel(p.meal.health)}`} bg={p.meal.health >= 4 ? c.accentSoft : c.surface2} fg={c.ink} />
                <Badge text={`${TIER[p.tier]} · ~${tlText(p.price)}`} bg={c.surface2} fg={c.ink} />
                <Badge text={p.missing.length ? `🛒 ${p.missing.length} eksik` : '✓ Hepsi dolapta'} bg={p.missing.length ? c.peachSoft : c.accentSoft} fg={c.ink} />
              </View>
              {on && (
                <View style={{ gap: 8 }}>
                  <View style={{ gap: 4 }}>
                    {p.meal.ing.map(x => {
                      const has = p.have.includes(x);
                      return (
                        <View key={x.n} style={st.ing}>
                          <Text style={{ width: 22 }}>{has ? '✅' : '🛒'}</Text>
                          <T style={{ flex: 1, fontSize: 15 }}>{titleCase(x.n)} · {qtyText(x, p.servings)}</T>
                          <T v="tiny" style={{ color: has ? c.ok : c.warm }}>{has ? 'Dolapta var' : 'Alınacak'}</T>
                        </View>
                      );
                    })}
                  </View>
                  <T style={{ fontSize: 14 }}>{p.meal.steps}</T>
                  {p.missing.length > 0 && (
                    <>
                      <T v="small">{isEn() ? `The missing items cost about ${tlText(p.missingPrice)}. Prices are estimates.` : `Eksikler yaklaşık ${p.missingPrice} TL tutar. Fiyatlar tahminidir.`}</T>
                      <Btn small kind="primary" label="Eksikleri listeye ekle 🛒" onPress={() => addMissing(p)} style={{ alignSelf: 'flex-start' }} />
                    </>
                  )}
                </View>
              )}
            </Card>
          </Appear>
        );
      })}

      {picks.length > 0 && <Btn label="🔄 Başka öner" onPress={() => { setSkip(skip + 3); setOpen(null); }} block />}
      {picks.length > 0 && <T v="tiny">Sağlık puanı genel bir tahmindir; beslenme, diyet ya da tıbbi tavsiye değildir. Alerjin ya da özel bir beslenme düzenin varsa içindekilere ve son kullanma tarihine kendin bak.</T>}
      {!kitchen && <T v="small">İpucu: Mutfak odan olursa dolabındakileri işaretleyip eşleştiririm.</T>}
    </Screen>
  );
}

function Badge({ text, bg, fg }: { text: string; bg: string; fg: string }) {
  return (
    <View style={[st.badge, { backgroundColor: bg }]}>
      <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 12, color: fg }}>{text}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  ing: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
