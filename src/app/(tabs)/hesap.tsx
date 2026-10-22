import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { displayName, useAuth } from '@/auth/AuthProvider';
import { Btn, Card, Pill, Screen, T } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { seed } from '@/domain/logic';
import { LEGAL } from '@/lib/links';
import { purchasesEnabled, usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import { flush } from '@/sync/cloud';
import { fonts, useColors } from '@/theme';

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
    <Screen>
      <T v="h1">Hesabım</T>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={[st.avatar, { backgroundColor: c.accent }]}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 24, color: c.onAccent }}>{name.slice(0, 1).toLocaleUpperCase('tr-TR')}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T v="h2" numberOfLines={1}>{name}</T>
            <T v="small" numberOfLines={1}>{account ? user?.email : 'Hesapsız kullanıyorsun'}</T>
          </View>
        </View>
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
              Premium ile günde 2 fotoğraf taraması, ayda 3 seri dondurma, 1,5 kat puan, birden fazla ev, temalar, aile paylaşımı ve reklamsız kullanım.
            </T>
            <Btn kind="primary" label="Premium'a bak ⭐" onPress={() => router.push('/premium')} />
          </>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Btn label={busy === 'restore' ? 'Geri yükleniyor…' : 'Satın alımları geri yükle'} onPress={doRestore} disabled={!!busy} />
          {premium.active && <Btn kind="ghost" label="Aboneliği yönet" onPress={manage} />}
        </View>
        <T v="small">
          Ödemeyi App Store ya da Google Play alır. Kart bilgilerin Layfapp{"'"}a ya da sunucularımıza hiç gelmez.
          Daha önce aldığın üyelik başka bir telefonda ya da yeniden kurulumda {'"'}Satın alımları geri yükle{'"'} ile döner.
        </T>
        {!purchasesEnabled && (
          <T v="small">Geliştirme sürümü: mağaza anahtarları henüz girilmedi.</T>
        )}
      </Card>

      <Card style={{ gap: 4 }}>
        <LinkRow label="🔔  Bildirimler ve sabah özeti" onPress={() => router.push('/bildirimler')} />
        <LinkRow label="🏠  Ev planını düzenle" onPress={() => router.push('/plan')} />
        <LinkRow label="🏡  Evlerim ve evin görünümü" onPress={() => router.push('/evler')} />
        <LinkRow label="👨‍👩‍👧  Aile paylaşımı" onPress={() => router.push('/aile')} />
        <LinkRow label="🐾  Evim hakkında (kurulum soruları)" onPress={() => router.push('/evim')} />
        <LinkRow label="🔧  Ev bakımı, faturalar, garantiler" onPress={() => router.push('/bakim')} />
      </Card>

      <Card style={{ gap: 4 }}>
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

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={({ pressed }) => [st.link, pressed && { opacity: 0.6 }]}>
      <T v="bold" style={{ fontSize: 14 }}>{label}</T>
      <Text style={{ color: c.muted, fontSize: 18 }}>›</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  soon: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
