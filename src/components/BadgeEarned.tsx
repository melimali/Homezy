import { requireOptionalNativeModule } from 'expo-modules-core';
import { useEffect, useMemo, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';

import { MokaSprite } from '@/components/MokaSprite';
import { Burst, Float } from '@/components/motion';
import { StepModal } from '@/components/StepModal';
import { Btn, T } from '@/components/ui';
import { BADGE_ART } from '@/constants/badges';
import { achievements, type Ach } from '@/domain/achievements';
import { useNow } from '@/hooks/useNow';
import { useTranslation } from '@/i18n/i18n';
import { prefs } from '@/lib/supabase';
import { useStore } from '@/store/AppStore';
import { radius, useColors } from '@/theme';

const KEY = 'badgesSeen';
const MAX_SHOWN = 6;

function cheer() {
  if (Platform.OS === 'web' || !requireOptionalNativeModule('ExpoHaptics')) return;
  try {
    const h = require('expo-haptics') as typeof import('expo-haptics'); // eslint-disable-line @typescript-eslint/no-require-imports
    void h.notificationAsync(h.NotificationFeedbackType.Success);
  } catch { /* titreşim yoksa sessiz geç */ }
}

function readSeen(): string[] | null {
  try {
    const v = JSON.parse(prefs.get(KEY) ?? 'null') as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : null;
  } catch {
    return null;
  }
}

/**
 * Yeni rozet kazanılınca tek bir kutlama penceresi açar (birden fazlaysa birleşik).
 * İlk çalışmada mevcut rozetler sessizce "görüldü" sayılır: eski kullanıcıya geriye dönük pencere yağmaz.
 */
export function BadgeEarned() {
  const { state } = useStore();
  const now = useNow();
  const [tick, setTick] = useState(0);
  const fresh = useMemo(() => {
    if (!state.setup) return [];
    const on = achievements(state, now).filter(a => a.on);
    const seen = readSeen();
    if (!seen) {
      prefs.set(KEY, JSON.stringify(on.map(a => a.id)));
      return [];
    }
    return on.filter(a => !seen.includes(a.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick: pencere kapanınca görülenler yeniden okunur
  }, [state, now, tick]);
  const n = fresh.length;
  useEffect(() => {
    if (n) cheer();
  }, [n > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!n) return null;
  const close = () => {
    const seen = readSeen() ?? [];
    prefs.set(KEY, JSON.stringify([...new Set([...seen, ...fresh.map(a => a.id)])]));
    setTick(x => x + 1);
  };
  return <Popup list={fresh} onClose={close} />;
}

function Popup({ list, onClose }: { list: Ach[]; onClose: () => void }) {
  const c = useColors();
  const { t } = useTranslation();
  const [fire, setFire] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setFire(1), 350);
    return () => clearTimeout(id);
  }, []);
  const shown = list.slice(0, MAX_SHOWN);
  const more = list.length - shown.length;
  const one = list.length === 1 ? list[0]! : null;
  const tierTxt = (a: Ach) => t(a.tier === 'kolay' ? 'Kolay rozet' : a.tier === 'orta' ? 'Orta rozet' : 'Zor rozet');
  const tierEmoji = (a: Ach) => (a.tier === 'kolay' ? '🥉' : a.tier === 'orta' ? '🥈' : '🥇');
  const icon = (a: Ach, size: number) =>
    a.art ? <Image source={BADGE_ART[a.art]} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors /> : <T style={{ fontSize: size * 0.7, lineHeight: size }}>{a.emoji}</T>;
  return (
    <StepModal onClose={onClose}>
      {dismiss => (
        <View style={[st.box, { backgroundColor: c.surface }]} accessibilityViewIsModal>
          <MokaSprite anim="party" size={110} />
          <T v="h1" style={{ textAlign: 'center' }}>{t(one ? 'Rozet kazandın! 🎉' : 'Rozetler kazandın! 🎉')}</T>
          {one ? (
            <View style={st.center}>
              <Float amp={5}>
                <View style={[st.big, { backgroundColor: c.sageSoft }]}>{icon(one, 84)}</View>
              </Float>
              <Burst fire={fire} />
              <T v="h3" style={{ textAlign: 'center' }}>{t(one.name)}</T>
              <T v="small" style={{ textAlign: 'center' }}>{t(one.hint)}</T>
              <T v="tiny">{tierEmoji(one)} {tierTxt(one)}</T>
            </View>
          ) : (
            <View style={st.center}>
              <View style={st.row}>
                {shown.map(a => (
                  <View key={a.id} style={[st.small, { backgroundColor: c.sageSoft }]}>
                    {icon(a, 44)}
                    <T v="tiny" style={{ textAlign: 'center' }} numberOfLines={2}>{t(a.name)}</T>
                  </View>
                ))}
              </View>
              <Burst fire={fire} />
              {more > 0 && <T v="small">{t('+{} rozet daha').replace('{}', String(more))}</T>}
            </View>
          )}
          <Btn kind="primary" label={t('Harika!')} onPress={dismiss} block />
        </View>
      )}
    </StepModal>
  );
}

const st = StyleSheet.create({
  box: { borderRadius: 40, padding: 24, gap: 12, alignItems: 'center', maxWidth: 400, width: '100%' },
  center: { alignItems: 'center', gap: 8, alignSelf: 'stretch' },
  big: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  small: { width: 92, borderRadius: radius.tile, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center', gap: 4 },
});
