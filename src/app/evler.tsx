import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { PremiumLock } from '@/components/PremiumLock';
import { useToast } from '@/components/Toast';
import { BackLink, Btn, Card, Field, Screen, SecHead, T, XBtn } from '@/components/ui';
import { ROOM_EMOJI } from '@/domain/constants';
import { addHome, homeCount, removeHome, renameHome, switchHome } from '@/domain/homes';
import { premiumHref } from '@/components/PaywallMoments';
import { packFor } from '@/domain/seasons';
import { track } from '@/lib/events';
import { limits, LIMITS, THEMES, themeFor } from '@/domain/premium';
import type { HouseTheme } from '@/domain/types';
import { useFamily } from '@/family/FamilyProvider';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';
import { Squish } from '@/components/motion';

/** Evlerim ve evin görünümü. Birden fazla ev ve gündüz dışındaki temalar Premium. */
export default function Evler() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const { state: S, update } = useStore();
  const { premium } = usePurchases();
  const family = useFamily();
  const lim = limits(premium.active);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  // Ev silmek iki dokunuş ister.
  const [armed, setArmed] = useState<string | null>(null);
  const theme = themeFor(S.settings.theme, premium.active);
  const shared = family.sharedId;
  const [peek, setPeek] = useState<HouseTheme | null>(null);
  const pack = packFor();
  const peekTheme = THEMES.find(t => t.id === peek);

  const homes = [
    { id: S.homeId, name: S.homeName, rooms: S.order.map(id => S.rooms[id]), active: true },
    ...S.others.map(h => ({ id: h.id, name: h.name, rooms: h.order.map(id => h.rooms[id]), active: false })),
  ];
  const canAdd = homeCount(S) < lim.homes;

  // Aile evine geçmek herkese açık; diğer evler arasında geçmek Premium.
  const free = (id: string) => id === shared || S.homeId === shared;
  const go = (id: string) => {
    if (!premium.active && !free(id)) return router.push('/premium');
    update(D => switchHome(D, id));
    toast('Eve geçildi 🏡');
    router.navigate('/');
  };
  const add = () => {
    if (!premium.active) return router.push('/premium');
    if (!canAdd) return toast(`En fazla ${lim.homes} ev ekleyebilirsin.`);
    const n = name.trim() || `Ev ${homeCount(S) + 1}`;
    update(D => addHome(D, n));
    setName('');
    setTimeout(() => router.replace('/kurulum'), 0);
  };
  const saveName = (id: string) => {
    update(D => renameHome(D, id, draft));
    setEditing(null);
  };
  const setTheme = (t: HouseTheme, locked: boolean) => {
    if (locked) {
      track('season_peek', t);
      return setPeek(t);
    }
    update(D => void (D.settings.theme = t));
  };

  return (
    <Screen header={false}>
      <BackLink />
      <View>
        <T v="eyebrow">Evlerim</T>
        <T v="h1">Evlerin ve görünüm 🏡</T>
        <T v="lead">Puanın, serin ve günlüğün bütün evlerinde ortak. Bildirimler açık olan ev için gelir.</T>
      </View>

      <Card>
        <SecHead title="Evlerim" right={`${homes.length}/${lim.homes}`} />
        {homes.map((h, i) => (
          <View key={h.id} style={[styles.home, i > 0 && { borderTopWidth: 1.5, borderTopColor: c.line }]}>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              {editing === h.id ? (
                <View style={styles.row}>
                  <Field value={draft} onChangeText={setDraft} autoFocus maxLength={30} onSubmitEditing={() => saveName(h.id)} returnKeyType="done" />
                  <Btn small kind="primary" label="Kaydet" onPress={() => saveName(h.id)} />
                </View>
              ) : (
                <Squish onPress={() => { setEditing(h.id); setDraft(h.name); }} accessibilityRole="button" accessibilityLabel={`${h.name} adını değiştir`}>
                  <T v="bold">{h.name} {h.id === shared ? '👨‍👩‍👧' : ''} <Text style={{ color: c.muted }}>✎</Text></T>
                </Squish>
              )}
              <T v="small" numberOfLines={1}>
                {h.rooms.length ? h.rooms.map(r => r && ROOM_EMOJI[r.type]).join(' ') : 'Henüz kurulmadı'}
              </T>
            </View>
            {h.active ? (
              <Text style={[styles.on, { color: c.ok }]}>Açık</Text>
            ) : (
              <>
                <Btn small label={premium.active || free(h.id) ? 'Geç' : '👑 Geç'} onPress={() => go(h.id)} />
                {armed === h.id ? (
                  <Btn small kind="danger" label="Sil" onPress={() => { update(D => removeHome(D, h.id)); setArmed(null); toast(`${h.name} silindi.`); }} />
                ) : (
                  <XBtn label={`${h.name} evini sil`} onPress={() => setArmed(h.id)} />
                )}
              </>
            )}
          </View>
        ))}
        {premium.active ? (
          canAdd ? (
            <View style={styles.row}>
              <Field value={name} onChangeText={setName} placeholder="Yeni ev, ör. Yazlık" maxLength={30} onSubmitEditing={add} returnKeyType="done" />
              <Btn small kind="primary" label="Ev ekle" onPress={add} />
            </View>
          ) : (
            <T v="small">En fazla {lim.homes} ev ekleyebilirsin.</T>
          )
        ) : (
          <PremiumLock
            emoji="🏡"
            title="Yazlığın, iş yerin, annenin evi…"
            text={`Ücretsiz planda ${LIMITS.free.homes} ev var. Premium ile ${LIMITS.premium.homes} eve kadar ekleyip aralarında geçebilirsin.${S.others.length ? ' Eklediğin evler silinmedi, Premium dönünce geri gelir.' : ''}`}
          />
        )}
      </Card>

      {pack && (
        <Card>
          <SecHead title={`${pack.emoji} ${pack.name}`} />
          <T v="small">Bu ayın teması. {THEMES.find(t => t.id === pack.theme)?.premium && !premium.active ? 'Önizleyebilirsin; uygulamak Premium.' : 'Hemen uygulayabilirsin.'}</T>
          <Btn small kind="primary" label={theme === pack.theme ? 'Uygulandı' : 'Göz at'} onPress={() => setTheme(pack.theme, !!THEMES.find(t => t.id === pack.theme)?.premium && !premium.active)} disabled={theme === pack.theme} style={{ alignSelf: 'flex-start' }} />
        </Card>
      )}

      <Card>
        <SecHead title="Evin görünümü" />
        <View style={styles.themes}>
          {THEMES.map(t => {
            const locked = t.premium && !premium.active;
            const on = theme === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => setTheme(t.id, locked)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${t.name} teması${locked ? ', Premium' : ''}`}
                style={[styles.theme, { backgroundColor: on ? c.accentSoft : c.surface2, borderColor: on ? c.hi : 'transparent' }]}
              >
                <Text style={{ fontSize: 28 }}>{t.emoji}</Text>
                <Text style={[styles.themeName, { color: c.ink }]}>{t.name}</Text>
                {locked && <Text style={{ fontSize: 11 }}>👑</Text>}
              </Pressable>
            );
          })}
        </View>
        {!premium.active && <T v="small">Gece, kış ve sonbahar temaları Premium üyelere özel.</T>}
      </Card>
      <Modal transparent visible={!!peekTheme} animationType="fade" onRequestClose={() => setPeek(null)}>
        <View style={[styles.bg, { backgroundColor: c.shadow }]}>
          <View style={[styles.sheet, { backgroundColor: c.surface }]}>
            <Text style={{ fontSize: 64 }}>{peekTheme?.emoji}</Text>
            <T v="h1" style={{ textAlign: 'center' }}>{peekTheme?.name} teması</T>
            <T v="lead" style={{ textAlign: 'center', marginTop: 0 }}>Evin bu temayla başka görünür. İlerlemen ve eşyaların aynen kalır, istediğin zaman Gündüz&apos;e dönebilirsin.</T>
            <Btn kind="primary" label="Premium'a bak ⭐" block onPress={() => { setPeek(null); router.push(premiumHref('theme')); }} />
            <Btn kind="ghost" label="Vazgeç" block onPress={() => setPeek(null)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { borderRadius: 40, padding: 28, gap: 14, alignItems: 'center', maxWidth: 400, width: '100%' },
  home: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  on: { fontFamily: fonts.bodyBlack, fontSize: 13 },
  themes: { flexDirection: 'row', gap: 8 },
  theme: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.card - 6, borderWidth: 2, gap: 2 },
  themeName: { fontFamily: fonts.bodyBlack, fontSize: 12.5 },
});
