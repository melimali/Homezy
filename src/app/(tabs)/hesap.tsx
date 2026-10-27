import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { displayName, useAuth } from '@/auth/AuthProvider';
import { Appear, Squish } from '@/components/motion';
import { Bar, Btn, Card, IconBtn, Pill, Screen, SecHead, T, TitleBar } from '@/components/ui';
import { MOKA_ASSETS, type MokaPose } from '@/constants/moka';
import { useToast } from '@/components/Toast';
import { homeScore, seed } from '@/domain/logic';
import { addDays, dayKey, nextStage, progressOf, STAGES } from '@/domain/play';
import { useNow } from '@/hooks/useNow';
import { LEGAL } from '@/lib/links';
import { purchasesEnabled, usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import { flush } from '@/sync/cloud';
import { fonts, radius, useColors } from '@/theme';

const fmtDate = (ms: number) => new Date(ms).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

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
  const { status, user, signOut, deleteAccount } = useAuth();
  const { premium, restore, manage } = usePurchases();
  const { state, replace } = useStore();
  const [busy, setBusy] = useState<'restore' | 'out' | 'delete' | null>(null);
  const account = status === 'account';
  const name = account ? displayName(user) : 'Misafir';
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
      'Hesaptan çık',
      account
        ? 'Evin hesabında kayıtlı kalır. Bu telefondaki veriler silinir; tekrar giriş yapınca geri gelir.'
        : 'Misafir olduğun için evin sadece bu telefonda. Çıkarsan ev ve rutinlerin silinir, uygulama baştan başlar.',
      'Çık',
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
      'Hesabını sil',
      'Hesabın, evin ve üyelik kaydın kalıcı olarak silinir, uygulama baştan başlar. Bu geri alınamaz.\n\nPremium aboneliğin varsa ücret alınmaya devam etmemesi için onu App Store ya da Google Play abonelik ayarlarından ayrıca iptal et.',
      'Hesabı sil',
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
      <TitleBar title="Profilim" right={<IconBtn icon="⚙️" label="Ayarlar" onPress={() => router.push('/bildirimler')} />} />

      <Appear index={1} style={[st.profile, { backgroundColor: c.surface }]}>
        <View style={[st.avatar, { backgroundColor: c.surface2 }]}>
          <Image source={MOKA_ASSETS[account ? 'sipping' : 'begging']} style={st.avatarImg} resizeMode="contain" accessibilityIgnoresInvertColors />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <View>
            <T v="h2" numberOfLines={1}>{name}</T>
            <T v="tiny" numberOfLines={1}>{account ? user?.email : `${state.homeName} · hesapsız`}</T>
          </View>
          <View style={st.levelRow}>
            <View style={[st.level, { backgroundColor: c.hi }]}>
              <Text style={[st.levelT, { color: c.onBadge }]}>Seviye {hp.level}</Text>
            </View>
            <Bar value={next ? (hp.level - (prev?.level ?? 0)) / (next.level - (prev?.level ?? 0)) : 1} color={c.hi} style={{ flex: 1 }} />
          </View>
          <T v="tiny" style={{ textAlign: 'right' }}>{next ? `${hp.level} / ${next.level} gün · ${next.emoji} ${next.name}` : 'Rüya evin tamam ⭐'}</T>
        </View>
      </Appear>

      <View style={{ gap: 12 }}>
        <SecHead title="İstatistiklerim" h="h3" right="Bu hafta" />
        <Appear index={2} style={st.stats}>
          <Stat emoji="🔥" n={hp.streak} label="gün seri" />
          <Stat emoji="✅" n={weekDone} label="tamamlanan iş" />
          <Stat emoji="⭐" n={state.play.points} label="puan" />
        </Appear>
      </View>

      <View style={{ gap: 12 }}>
        <SecHead title="Başarımlar" h="h3" right={`${badges.filter(b => b.on).length}/${badges.length}`} />
        <Appear index={3} style={st.badges}>
          {badges.map(b => (
            <View key={b.label} style={[st.badge, { backgroundColor: c.surface }]} accessibilityLabel={`${b.label}: ${b.on ? 'kazanıldı' : b.hint}`}>
              <View style={[st.badgeIcon, { backgroundColor: c.surface2 }, !b.on && { opacity: 0.35 }]}>
                <Image source={MOKA_ASSETS[b.pose]} style={st.badgeImg} resizeMode="contain" accessibilityIgnoresInvertColors />
              </View>
              <Text numberOfLines={2} style={[st.badgeT, { color: b.on ? c.ink : c.muted }]}>{b.label}</Text>
            </View>
          ))}
        </Appear>
      </View>

      <Squish onPress={() => router.push('/magaza')} accessibilityLabel="Evini geliştir: mağaza" style={[st.upgrade, { backgroundColor: c.surface }]}>
        <Text style={{ fontSize: 26 }}>🏡</Text>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <T v="bold">Evini Geliştir</T>
          <T v="small">Tamamladığın işlerle yeni dekorasyonların kilidini aç!</T>
        </View>
        <Image source={MOKA_ASSETS.handyman} style={st.upgradeImg} resizeMode="contain" accessibilityIgnoresInvertColors />
      </Squish>

      <Card>
        {account ? (
          <T v="small" style={{ fontSize: 13.5 }}>
            Evin, rutinlerin ve ayarların hesabına yedekleniyor. Yeni bir telefonda giriş yapınca hepsi geri gelir.
          </T>
        ) : (
          <>
            <T style={{ fontSize: 14 }}>
              Verilerin şu an sadece bu telefonda. Hesap oluşturursan telefon değişse ya da uygulama silinse de evin kaybolmaz.
            </T>
            <Btn kind="primary" label="Hesap oluştur ya da giriş yap" onPress={() => router.push('/giris')} />
          </>
        )}
      </Card>

      <Card style={st.list}>
        <LinkRow label="🔔  Bildirimler ve sesler" onPress={() => router.push('/bildirimler')} />
        <LinkRow label="🏠  Ev planını düzenle" onPress={() => router.push('/plan')} />
        <LinkRow label="🏡  Evlerim ve evin görünümü" onPress={() => router.push('/evler')} />
        <LinkRow label="👨‍👩‍👧  Aile paylaşımı" onPress={() => router.push('/aile')} />
        <LinkRow label="🐾  Evim hakkında (kurulum soruları)" onPress={() => router.push('/evim')} />
        <LinkRow label="🔧  Ev bakımı ve faturalar" onPress={() => router.push('/bakim')} />
      </Card>

      <Card>
        <View style={st.row}>
          <T v="h2">Premium üyelik</T>
          <Pill k={premium.active ? 'ok' : 'neutral'} label={premium.active ? 'Etkin' : 'Yok'} />
        </View>
        {premium.active ? (
          <T style={{ fontSize: 14 }}>
            {premium.until
              ? `${premium.willRenew ? 'Yenilenme' : 'Bitiş'} tarihi: ${fmtDate(premium.until)}`
              : 'Üyeliğin etkin.'}
          </T>
        ) : (
          <>
            <T style={{ fontSize: 14 }}>
              Daha çok tarama, seri koruması, temalar, aile paylaşımı ve reklamsız kullanım.
            </T>
            <Btn kind="primary" label="Premium'a bak ⭐" onPress={() => router.push('/premium')} />
          </>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Btn label={busy === 'restore' ? 'Geri yükleniyor…' : 'Satın alımları geri yükle'} onPress={doRestore} disabled={!!busy} />
          {premium.active && <Btn kind="ghost" label="Aboneliği yönet" onPress={manage} />}
        </View>
        <T v="small">Ödemeyi App Store ya da Google Play alır; kart bilgin bize gelmez.</T>
        {!purchasesEnabled && (
          <T v="small">Geliştirme sürümü: mağaza anahtarları henüz girilmedi.</T>
        )}
      </Card>

      <Card bare style={st.list}>
        <LinkRow label="Gizlilik politikası" onPress={() => Linking.openURL(LEGAL.privacy)} />
        <LinkRow label="Kullanım koşulları" onPress={() => Linking.openURL(LEGAL.terms)} />
      </Card>

      <View style={{ gap: 10 }}>
        <Btn kind="ghost" label={busy === 'out' ? 'Çıkılıyor…' : 'Hesaptan çık'} onPress={doSignOut} disabled={!!busy} />
        <Pressable onPress={doDelete} disabled={!!busy} accessibilityRole="button" style={{ alignSelf: 'center', padding: 8 }}>
          <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 14, color: c.late }}>
            {busy === 'delete' ? 'Siliniyor…' : account ? 'Hesabımı sil' : 'Misafir hesabımı sil'}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function Stat({ emoji, n, label }: { emoji: string; n: number; label: string }) {
  const c = useColors();
  return (
    <View style={[st.stat, { backgroundColor: c.surface }]}>
      <Text style={{ fontSize: 24 }}>{emoji}</Text>
      <Text style={[st.statN, { color: c.ink }]}>{n}</Text>
      <Text style={[st.statL, { color: c.muted }]}>{label}</Text>
    </View>
  );
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={({ pressed }) => [st.link, pressed && { opacity: 0.6 }]}>
      <T v="bold" style={{ fontSize: 15, flex: 1 }}>{label}</T>
      <Text style={{ color: c.muted, fontSize: 18 }}>›</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: radius.tile, padding: 18, marginTop: -10 },
  avatar: { width: 78, height: 78, borderRadius: 39, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 84, height: 84, marginTop: 10 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  level: { borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 12 },
  levelT: { fontFamily: fonts.bodyBlack, fontSize: 12.5 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, alignItems: 'center', gap: 2, borderRadius: radius.tile, paddingVertical: 16, paddingHorizontal: 6 },
  statN: { fontFamily: fonts.displayBold, fontSize: 24, lineHeight: 28 },
  statL: { fontFamily: fonts.bodyBold, fontSize: 12, textAlign: 'center' },
  badges: { flexDirection: 'row', gap: 8 },
  badge: { flex: 1, alignItems: 'center', gap: 8, borderRadius: radius.tile, paddingVertical: 14, paddingHorizontal: 4 },
  badgeIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  badgeImg: { width: 58, height: 58, marginTop: 8 },
  badgeT: { fontFamily: fonts.bodyBlack, fontSize: 11.5, lineHeight: 14, textAlign: 'center' },
  upgrade: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.tile, paddingVertical: 14, paddingLeft: 18, paddingRight: 8, overflow: 'hidden' },
  upgradeImg: { width: 88, height: 88, marginVertical: -10 },
  list: { gap: 0, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  soon: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
