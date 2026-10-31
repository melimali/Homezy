import { BADGE_ART, type BadgeArt } from '@/constants/badges';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { displayName, useAuth } from '@/auth/AuthProvider';
import { Appear, Squish } from '@/components/motion';
import { Bar, Btn, IconBtn, Screen, SecHead, Sheet, T, TitleBar } from '@/components/ui';
import { MOKA_ASSETS } from '@/constants/moka';
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
  const badges: { label: string; art: BadgeArt; on: boolean; hint: string }[] = [
    { label: 'İlk Adım', art: 'ilk', on: allDone >= 1, hint: 'İlk işini tamamla' },
    { label: 'Kahve Sever', art: 'kus', on: hp.streak >= 3, hint: '3 gün seri yap' },
    { label: 'Seri Ateşi', art: 'seri', on: hp.streak >= 7, hint: '7 gün seri yap' },
    { label: 'Haftanın Yıldızı', art: 'takvim', on: weekDone >= 10, hint: 'Bu hafta 10 iş yap' },
    { label: 'Temizlik Ustası', art: 'el', on: allDone >= 20, hint: '20 iş tamamla' },
    { label: 'Düzen Canavarı', art: 'ev', on: homeScore(state, now) >= 80, hint: 'Ev puanını %80 yap' },
    { label: 'Bitki Dostu', art: 'filiz', on: plants >= 3, hint: '3 kez bitki sula' },
    { label: 'Yıldız Ev', art: 'yildiz', on: allDone >= 100, hint: '100 iş tamamla' },
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
    <Screen header={false} tab tone="lavender">
      <TitleBar
        title={t('profile')}
        right={
          <IconBtn icon="⚙️" label={t('settings')} onPress={() => router.push('/bildirimler')} />
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

      {/* Her şey kategorilerde; sayılar ve grafikler Gelişim sekmesinde (docs/skeleton-v3.md). */}
      <Group index={2} title="Kendim" items={[
        { emoji: '📔', label: 'Günlük', sub: 'Bugün nasıldı?', tint: c.roseSoft, href: '/gunluk' },
        { emoji: '💬', label: 'Moka ile sohbet', sub: 'İş ekle, not al, sohbet et', tint: c.peachSoft, href: '/moka' },
        { emoji: '🍅', label: 'Odak', sub: 'Pomodoro, ders çalışma', tint: c.lavenderSoft, href: '/odak' },
        { emoji: '🏃', label: 'Spor', sub: 'Hareket ve antrenman', tint: c.peachSoft, href: '/spor' },
      ]} />
      <Group index={3} title="Evim" items={[
        { emoji: '🗺️', label: 'Ev planı', sub: 'Odaları çiz, düzenle', tint: c.sageSoft, href: '/plan' },
        { emoji: '🎨', label: 'Evini kendine benzet', sub: 'Zemin, duvar, pencere, eşya', tint: c.peachSoft, href: '/dekor' },
        { emoji: '🔧', label: 'Ev bakımı', sub: 'Faturalar, garantiler, mevsimlik işler', tint: c.peachSoft, href: '/bakim' },
        { emoji: '🏡', label: 'Evimin özellikleri', sub: 'Evcil hayvan, halı, kombi…', tint: c.lavenderSoft, href: '/evim' },
        { emoji: '🏘️', label: 'Evlerim', sub: `${1 + state.others.length} ev`, tint: c.sageSoft, href: '/evler' },
        { emoji: '👨‍👩‍👧', label: 'Aile evi', sub: 'Evini paylaş', tint: c.roseSoft, href: '/aile' },
      ]} />
      <Group index={4} title="Keyif" items={[
        { emoji: '🌷', label: "Moka'nın bahçesi", sub: 'Çiçek yetiştir', tint: c.sageSoft, href: '/bahce' },
        { emoji: '🛍️', label: 'Mağaza', sub: `${state.play.points} puanın var`, tint: c.peachSoft, href: '/magaza' },
        { emoji: '🎬', label: 'Evimin hikâyesi', sub: 'Baştan bugüne', tint: c.lavenderSoft, href: '/hikaye' },
      ]} />
      <Group index={5} title="Ayarlar" items={[
        { emoji: '🔔', label: 'Bildirimler ve ayarlar', sub: 'Sabah özeti, ses, tema', tint: c.lavenderSoft, href: '/bildirimler' },
        { emoji: '🌍', label: t('language'), sub: LANGUAGES.find(l => l.code === (state.settings.language ?? 'tr'))?.label ?? '', tint: c.sageSoft, onPress: () => setLangOpen(true) },
      ]} />

      <View style={{ gap: 12 }}>
        <SecHead title={t('badges')} h="h3" right={`${badges.filter(b => b.on).length}/${badges.length}`} />
        <Appear index={6} style={st.badges}>
          {badges.map(b => (
            <View key={b.label} style={[st.badge, { backgroundColor: c.surface }]} accessibilityLabel={`${b.label}: ${b.on ? 'kazanıldı' : b.hint}`}>
              <View style={[st.badgeIcon, !b.on && { opacity: 0.3 }]}>
                <Image source={BADGE_ART[b.art]} style={st.badgeImg} resizeMode="contain" accessibilityIgnoresInvertColors />
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
            <Squish onPress={doRestore} disabled={busy === 'restore'} accessibilityRole="button" accessibilityLabel={t('restorePurchases')} style={{ alignSelf: 'center', padding: 4 }}>
              <T v="small" style={{ textDecorationLine: 'underline' }}>{busy === 'restore' ? 'Kontrol ediliyor…' : t('restorePurchases')}</T>
            </Squish>
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
          <Squish onPress={() => Linking.openURL(LEGAL.terms)} accessibilityRole="link" accessibilityLabel={t('terms')}>
            <T v="small" style={{ textDecorationLine: 'underline' }}>{t('terms')}</T>
          </Squish>
          <Text style={{ color: c.muted }}>•</Text>
          <Squish onPress={() => Linking.openURL(LEGAL.privacy)} accessibilityRole="link" accessibilityLabel={t('privacy')}>
            <T v="small" style={{ textDecorationLine: 'underline' }}>{t('privacy')}</T>
          </Squish>
        </View>
        <T v="tiny" style={{ textAlign: 'center', opacity: 0.6 }}>
          Müzik ve ortam sesleri: Pixabay (Pixabay İçerik Lisansı). Konum yalnızca gökyüzü için kullanılır, saklanmaz.
        </T>
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

type Item = { emoji: string; label: string; sub: string; tint: string; href?: Href; onPress?: () => void };

/** Kategori: başlık ve altında ikon baloncuklu, yuvarlak satırlar tek kartta. */
function Group({ title, items, index }: { title: string; items: Item[]; index: number }) {
  const c = useColors();
  const router = useRouter();
  return (
    <Appear index={index} style={{ gap: 8 }}>
      <T v="eyebrow" style={{ marginLeft: 6, marginBottom: 0 }}>{title}</T>
      <View style={[st.group, { backgroundColor: c.surface }]}>
        {items.map((x, i) => (
          <Squish
            key={x.label}
            onPress={() => (x.onPress ? x.onPress() : x.href && router.push(x.href))}
            accessibilityRole="button"
            accessibilityLabel={x.label}
            style={[st.row, i > 0 && { borderTopWidth: 1, borderTopColor: c.line }]}
          >
            <View style={[st.rowIcon, { backgroundColor: x.tint }]}><Text style={{ fontSize: 20 }}>{x.emoji}</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T v="bold" numberOfLines={1} style={{ fontSize: 15 }}>{x.label}</T>
              {!!x.sub && <T v="tiny" numberOfLines={1}>{x.sub}</T>}
            </View>
            <Text style={[st.chev, { color: c.muted }]}>›</Text>
          </Squish>
        ))}
      </View>
    </Appear>
  );
}

const st = StyleSheet.create({
  profile: { borderRadius: radius.card, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 60, height: 60, marginTop: 6 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  level: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 2 },
  levelT: { fontFamily: fonts.bodyBlack, fontSize: 11.5, textTransform: 'uppercase' },
  group: { borderRadius: radius.card, paddingHorizontal: 6, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 10 },
  rowIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  chev: { fontFamily: fonts.bodyBlack, fontSize: 22 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { width: '48.5%', borderRadius: radius.tile, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  badgeIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  badgeImg: { width: 46, height: 46 },
  card: { borderRadius: radius.card, padding: 16, gap: 12 },
  legal: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  danger: { gap: 8, marginBottom: 20 },
  dangerBtn: { borderRadius: radius.tile, paddingVertical: 14, alignItems: 'center' },
  langRow: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.tile, padding: 12, gap: 12, borderWidth: 1.5 },
  langText: { flex: 1, fontFamily: fonts.bodyBlack, fontSize: 15 },
});
