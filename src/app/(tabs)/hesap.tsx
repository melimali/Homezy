import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { displayName, useAuth } from '@/auth/AuthProvider';
import { Appear } from '@/components/motion';
import { MokaWardrobe } from '@/components/MokaWardrobe';
import { Bar, Btn, IconBtn, Screen, SecHead, Sheet, T, TitleBar } from '@/components/ui';
import { MOKA_ASSETS, type MokaPose } from '@/constants/moka';
import { useToast } from '@/components/Toast';
import { LANGUAGES } from '@/i18n/translations';
import { useTranslation } from '@/i18n/i18n';
import { homeScore, seed } from '@/domain/logic';
import { addDays, dayKey, nextStage, progressOf, STAGES } from '@/domain/play';
import { useNow } from '@/hooks/useNow';
import { LEGAL } from '@/lib/links';
import { purchasesEnabled, usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import { flush } from '@/sync/cloud';
import { fonts, radius, useColors } from '@/theme';

/** Onay penceresi; web önizlemesinde Alert düğmeleri çalışmadığı için tarayıcı penceresi. */
function confirm(title: string, text: string, ok: string, onOk: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${text}`)) onOk();
    return;
  }
  Alert.alert(title, text, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: ok, style: 'destructive', onPress: onOk },
  ]);
}

/** Hesap ve üyelik: profil, bulut yedeği, Premium durumu, satın alımları geri yükleme, çıkış, hesap silme. */
export default function Hesap() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const { t } = useTranslation();
  const { status, user, signOut, deleteAccount } = useAuth();
  const { premium, restore, manage } = usePurchases();
  const { state, replace, update } = useStore();
  const [busy, setBusy] = useState<'restore' | 'out' | 'delete' | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const account = status === 'account';
  const name = account ? displayName(user) : t('guest');
  const now = useNow();
  const hp = progressOf(state.play, now);
  const next = nextStage(hp.level);
  const prev = [...STAGES].reverse().find(x => x.level <= hp.level);
  // Bu hafta tamamlananlar (son 7 gün) ve başarımlar: sadece gösterim, mevcut kayıtlardan hesaplanır.
  const today = dayKey(now);
  const weekDone = [0, 1, 2, 3, 4, 5, 6].reduce((n, i) => n + (state.play.log[addDays(today, -i)]?.length ?? 0), 0);
  const allDone = Object.values(state.play.log).reduce((n, a) => n + a.length, 0);
  const plants = Object.values(state.play.log).flat().filter(x => x.startsWith('🪴')).length;
  const badges: { label: string; pose: MokaPose; on: boolean; hint: string }[] = [
    { label: 'Kahve Sever', pose: 'sipping', on: hp.streak >= 3, hint: '3 gün seri yap' },
    { label: 'Temizlik Ustası', pose: 'sweeping', on: allDone >= 20, hint: '20 iş tamamla' },
    { label: 'Düzen Canavarı', pose: 'checklist', on: homeScore(state, now) >= 80, hint: 'Ev puanını %80 yap' },
    { label: 'Bitki Dostu', pose: 'watering', on: plants >= 3, hint: '3 kez bitki sula' },
  ];

  const doRestore = async () => {
    setBusy('restore');
    const r = await restore();
    setBusy(null);
    if (!r.ok) toast(r.error);
    else toast(r.active ? 'Premium üyeliğin geri yüklendi.' : 'Bu mağaza hesabında etkin bir üyelik bulunamadı.');
  };

  const doSignOut = () =>
    confirm(
      t('signOut'),
      account
        ? 'Evin hesabında kayıtlı kalır. Bu telefondaki veriler silinir; tekrar giriş yapınca geri gelir.'
        : 'Misafir olduğun için evin sadece bu telefonda. Çıkarsan ev ve rutinlerin silinir, uygulama baştan başlar.',
      t('close'),
      async () => {
        setBusy('out');
        if (account) {
          await flush(user?.id, state);
          await signOut();
        } else {
          // Misafirin sunucudaki anonim kaydı bir daha açılamaz; çıkarken onu da sil.
          await deleteAccount();
        }
        replace(seed());
      },
    );

  const doDelete = () =>
    confirm(
      t('deleteAccount'),
      'Hesabın, evin ve üyelik kaydın kalıcı olarak silinir, uygulama baştan başlar. Bu geri alınamaz.\n\nPremium aboneliğin varsa ücret alınmaya devam etmemesi için onu App Store ya da Google Play abonelik ayarlarından ayrıca iptal et.',
      t('deleteAccount'),
      async () => {
        setBusy('delete');
        const r = await deleteAccount();
        setBusy(null);
        if (!r.ok) return toast(r.error);
        replace(seed());
        toast('Hesabın silindi.');
      },
    );

  return (
    <Screen header={false}>
      <TitleBar
        title={t('profile')}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <IconBtn icon="🌍" label={t('language')} onPress={() => setLangOpen(true)} />
            <IconBtn icon="⚙️" label={t('settings')} onPress={() => router.push('/bildirimler')} />
          </View>
        }
      />

      <Appear index={1} style={[st.profile, { backgroundColor: c.surface }]}>
        <View style={[st.avatar, { backgroundColor: c.surface2 }]}>
          <Image source={MOKA_ASSETS[account ? 'sipping' : 'begging']} style={st.avatarImg} resizeMode="contain" accessibilityIgnoresInvertColors />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <View>
            <T v="h2" numberOfLines={1}>{name}</T>
            <T v="tiny" numberOfLines={1}>{account ? user?.email : `${state.homeName} · ${t('noAccount')}`}</T>
          </View>
          <View style={st.levelRow}>
            <View style={[st.level, { backgroundColor: c.hi }]}>
              <Text style={[st.levelT, { color: c.onBadge }]}>{t('level')} {hp.level}</Text>
            </View>
            <Bar value={next ? (hp.level - (prev?.level ?? 0)) / (next.level - (prev?.level ?? 0)) : 1} color={c.hi} style={{ flex: 1 }} />
          </View>
          <T v="tiny" style={{ textAlign: 'right' }}>{next ? `${hp.level} / ${next.level} gün · ${next.emoji} ${next.name}` : 'Rüya evin tamam ⭐'}</T>
        </View>
      </Appear>

      <View style={{ gap: 12 }}>
        <SecHead title={t('stats')} h="h3" right={t('thisWeek')} />
        <Appear index={2} style={st.stats}>
          <Stat emoji="🔥" n={hp.streak} label={t('streakDays')} />
          <Stat emoji="✅" n={weekDone} label={t('tasksCompleted')} />
          <Stat emoji="⭐" n={state.play.points} label={t('points')} />
        </Appear>
      </View>

      <View style={{ gap: 12 }}>
        <SecHead title="Moka'nın dolabı" h="h3" />
        <MokaWardrobe />
      </View>

      <View style={{ gap: 12 }}>
        <SecHead title={t('badges')} h="h3" right={`${badges.filter(b => b.on).length}/${badges.length}`} />
        <Appear index={3} style={st.badges}>
          {badges.map(b => (
            <View key={b.label} style={[st.badge, { backgroundColor: c.surface }]} accessibilityLabel={`${b.label}: ${b.on ? 'kazanıldı' : b.hint}`}>
              <View style={[st.badgeIcon, { backgroundColor: c.surface2 }, !b.on && { opacity: 0.35 }]}>
                <Image source={MOKA_ASSETS[b.pose]} style={st.badgeImg} resizeMode="contain" accessibilityIgnoresInvertColors />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T v="bold" style={!b.on && { opacity: 0.5 }} numberOfLines={1}>{b.label}</T>
                <T v="tiny" numberOfLines={1}>{b.on ? 'Kazanıldı ✓' : b.hint}</T>
              </View>
            </View>
          ))}
        </Appear>
      </View>

      {/* Dil Seçme Modalı */}
      <Sheet open={langOpen} onClose={() => setLangOpen(false)}>
        <View style={{ gap: 12, paddingVertical: 10 }}>
          <T v="h2">{t('selectLanguage')}</T>
          <View style={{ gap: 8 }}>
            {LANGUAGES.map(l => {
              const selected = (state.settings.language ?? 'tr') === l.code;
              return (
                <Pressable
                  key={l.code}
                  onPress={() => {
                    update(D => void (D.settings.language = l.code));
                    setLangOpen(false);
                    toast(`${l.flag} ${l.label} seçildi.`);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={l.label}
                  style={[
                    st.langRow,
                    { backgroundColor: selected ? c.accentSoft : c.surface2, borderColor: selected ? c.hi : c.line },
                  ]}
                >
                  <Text style={{ fontSize: 22 }}>{l.flag}</Text>
                  <Text style={[st.langText, { color: c.ink }]}>{l.label}</Text>
                  {selected && <Text style={{ fontFamily: fonts.bodyBlack, color: c.ok }}>✓</Text>}
                </Pressable>
              );
            })}
          </View>
          <Btn label={t('close')} onPress={() => setLangOpen(false)} block style={{ marginTop: 6 }} />
        </View>
      </Sheet>

      {purchasesEnabled && (
        <Appear index={4} style={[st.card, { backgroundColor: c.surface }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ gap: 2 }}>
              <T v="h3">Homezy Premium</T>
              <T v="small">{premium.active ? 'Sınırsız ev, özel temalar ve fazlası açık' : 'Tüm özellikleri aç'}</T>
            </View>
            <Text style={{ fontSize: 32 }}>👑</Text>
          </View>
          {premium.active ? (
            <Btn label={t('manageSub')} kind="soft" onPress={() => manage()} block />
          ) : (
            <Btn label={t('goPremium')} kind="primary" onPress={() => router.push('/premium')} block />
          )}
          {!premium.active && (
            <Pressable onPress={doRestore} disabled={busy === 'restore'} accessibilityRole="button" accessibilityLabel={t('restorePurchases')} style={{ alignSelf: 'center', padding: 4 }}>
              <T v="small" style={{ textDecorationLine: 'underline' }}>{busy === 'restore' ? 'Kontrol ediliyor…' : t('restorePurchases')}</T>
            </Pressable>
          )}
        </Appear>
      )}

      <Appear index={5} style={[st.card, { backgroundColor: c.surface }]}>
        <T v="h3">{t('cloudBackup')}</T>
        <T v="small">
          {account
            ? `Hesabın güvende (${user?.email}). Giriş yaptığın her cihazda evin seninle.`
            : 'Şu an misafir olarak kullanıyorsun. Hesaba geç, evin ve serin kaybolmasın.'}
        </T>
        {account ? (
          <Btn label="Şifre / Bilgi değiştir" kind="soft" onPress={() => router.push('/giris')} block />
        ) : (
          <Btn label="Hesap aç veya giriş yap" kind="primary" onPress={() => router.push('/giris')} block />
        )}
      </Appear>

      <Appear index={6} style={[st.card, { backgroundColor: c.surface }]}>
        <T v="h3">{t('about')}</T>
        <View style={st.legal}>
          <Pressable onPress={() => Linking.openURL(LEGAL.terms)} accessibilityRole="link" accessibilityLabel={t('terms')}>
            <T v="small" style={{ textDecorationLine: 'underline' }}>{t('terms')}</T>
          </Pressable>
          <Text style={{ color: c.muted }}>•</Text>
          <Pressable onPress={() => Linking.openURL(LEGAL.privacy)} accessibilityRole="link" accessibilityLabel={t('privacy')}>
            <T v="small" style={{ textDecorationLine: 'underline' }}>{t('privacy')}</T>
          </Pressable>
        </View>
        <T v="tiny" style={{ textAlign: 'center', opacity: 0.6 }}>Homezy · v1.0.0</T>
      </Appear>

      <Appear index={7} style={st.danger}>
        <Pressable onPress={doSignOut} disabled={busy != null} accessibilityRole="button" accessibilityLabel={t('signOut')} style={({ pressed }) => [st.dangerBtn, { backgroundColor: c.surface }, pressed && { opacity: 0.7 }]}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, color: c.late }}>{busy === 'out' ? 'Çıkılıyor…' : t('signOut')}</Text>
        </Pressable>
        <Pressable onPress={doDelete} disabled={busy != null} accessibilityRole="button" accessibilityLabel={t('deleteAccount')} style={({ pressed }) => [st.dangerBtn, { backgroundColor: c.surface }, pressed && { opacity: 0.7 }]}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, color: c.late }}>{busy === 'delete' ? 'Siliniyor…' : t('deleteAccount')}</Text>
        </Pressable>
      </Appear>
    </Screen>
  );
}

function Stat({ emoji, n, label }: { emoji: string; n: number; label: string }) {
  const c = useColors();
  return (
    <View style={[st.stat, { backgroundColor: c.surface }]}>
      <Text style={{ fontSize: 24 }}>{emoji}</Text>
      <T v="h3">{n}</T>
      <T v="tiny" style={{ color: c.muted }}>{label}</T>
    </View>
  );
}

const st = StyleSheet.create({
  profile: { borderRadius: radius.card, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 60, height: 60, marginTop: 6 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  level: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 2 },
  levelT: { fontFamily: fonts.bodyBlack, fontSize: 11.5, textTransform: 'uppercase' },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, borderRadius: radius.card, paddingVertical: 12, alignItems: 'center', gap: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { width: '48.5%', borderRadius: radius.tile, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  badgeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  badgeImg: { width: 34, height: 34, marginTop: 4 },
  card: { borderRadius: radius.card, padding: 16, gap: 12 },
  legal: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  danger: { gap: 8, marginBottom: 20 },
  dangerBtn: { borderRadius: radius.tile, paddingVertical: 14, alignItems: 'center' },
  langRow: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.tile, padding: 12, gap: 12, borderWidth: 1.5 },
  langText: { flex: 1, fontFamily: fonts.bodyBlack, fontSize: 15 },
});
