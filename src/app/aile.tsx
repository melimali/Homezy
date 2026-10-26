import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';

import { displayName, useAuth } from '@/auth/AuthProvider';
import { PremiumLock } from '@/components/PremiumLock';
import { useToast } from '@/components/Toast';
import { BackLink, Btn, Card, Field, Screen, SecHead, T, XBtn } from '@/components/ui';
import { FAMILY_MAX } from '@/domain/family';
import { switchHome } from '@/domain/homes';
import { useFamily } from '@/family/FamilyProvider';
import { cloudEnabled } from '@/lib/supabase';
import { usePurchases } from '@/purchases/PurchasesProvider';
import { useStore } from '@/store/AppStore';
import { fonts, radius, useColors } from '@/theme';

/**
 * Aile paylaşımı: evini eşinle, ev arkadaşınla ya da çocuklarınla paylaş, işleri bölüş.
 * Paylaşmak Premium; koda katılmak herkese açık.
 */
export default function Aile() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const { session, user } = useAuth();
  const { premium } = usePurchases();
  const { state: S, update } = useStore();
  const { info, loading, sharedId, sharing, create, join, leave, kick } = useFamily();
  const [code, setCode] = useState('');
  const [name, setName] = useState(displayName(user));
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);

  const run = async (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, done?: string) => {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (!r.ok) return toast(r.error);
    if (done) toast(done);
  };

  const shareCode = async (k: string) => {
    const msg = `Safehouse: Daily Ops'ta sığınağımızı paylaşalım 🛡️ Hesabım > Hayatta kalan ekibi'ne gir ve bu kodu yaz: ${k}`;
    try {
      await Share.share({ message: msg });
    } catch {
      await Clipboard.setStringAsync(k);
      toast('Kod kopyalandı.');
    }
  };

  if (!cloudEnabled || !session)
    return (
      <Screen header={false}>
        <BackLink />
        <T v="h1">Hayatta kalan ekibi 👨‍👩‍👧</T>
        <Card>
          <T>Aile paylaşımı için önce hesap oluştur ya da giriş yap.</T>
          <Btn kind="primary" label="Hesap oluştur ya da giriş yap" onPress={() => router.push('/giris')} />
        </Card>
      </Screen>
    );

  return (
    <Screen header={false}>
      <BackLink />
      <View>
        <T v="eyebrow">Hayatta kalan ekibi</T>
        <T v="h1">Sığınağı birlikte savunun 👨‍👩‍👧</T>
        <T v="lead">Odalar, rutinler, gardırop ve alışveriş listesi ortak olur. Puanın, serin ve günlüğün sende kalır.</T>
      </View>

      {info ? (
        <>
          {!info.active && (
            <Card style={{ backgroundColor: c.lateSoft }}>
              <T v="bold">Paylaşım durdu</T>
              <T style={{ fontSize: 14 }}>
                {info.role === 'owner'
                  ? 'Premium üyeliğin bittiği için evin artık paylaşılmıyor. Herkesin telefonundaki kopya duruyor; Premium dönünce paylaşım kaldığı yerden sürer.'
                  : `${info.ownerName} kişisinin Premium üyeliği bittiği için paylaşım durdu. Evin kopyası telefonunda duruyor.`}
              </T>
            </Card>
          )}
          {info.role === 'owner' && info.code && (
            <Card>
              <SecHead title="Davet kodu" />
              <Text style={[styles.code, { color: c.ink, backgroundColor: c.surface2 }]} selectable>{info.code}</Text>
              <T v="small">Bu kodu ekibine gönder. Safehouse{"'"}ta Hesabım {'>'} Hayatta kalan ekibi{"'"}nden katılsınlar.</T>
              <Btn kind="primary" label="Kodu gönder" onPress={() => shareCode(info.code!)} />
            </Card>
          )}
          <Card>
            <SecHead title="Evdekiler" right={`${info.members.length}/${FAMILY_MAX}`} />
            {info.members.map((m, i) => (
              <View key={m.id} style={[styles.row, i > 0 && { borderTopWidth: 1.5, borderTopColor: c.line }]}>
                <View style={[styles.avatar, { backgroundColor: m.owner ? c.accent : c.hi }]}>
                  <Text style={{ fontFamily: fonts.displayBold, color: c.onAccent }}>{m.name.slice(0, 1).toLocaleUpperCase('tr-TR')}</Text>
                </View>
                <T v="bold" style={{ flex: 1 }}>{m.name}{m.id === session.user.id ? ' (sen)' : ''}</T>
                {m.owner && <T v="small">sığınak lideri</T>}
                {info.role === 'owner' && !m.owner && (
                  <XBtn label={`${m.name} kişisini çıkar`} onPress={() => run(() => kick(m.id), `${m.name} aileden çıkarıldı.`)} />
                )}
              </View>
            ))}
            <T v="small">İşleri bölüşmek için oda ekranında bir işin yanındaki 👤 düğmesine dokun.</T>
          </Card>
          {!sharing && sharedId && (S.others.some(h => h.id === sharedId)) && (
            <Btn kind="primary" label="Paylaşılan eve geç 🏡" onPress={() => { update(D => switchHome(D, sharedId)); router.navigate('/'); }} />
          )}
          <Btn
            kind={armed ? 'danger' : 'ghost'}
            label={armed ? 'Emin misin? Tekrar dokun' : info.role === 'owner' ? 'Paylaşımı kapat' : 'Aileden ayrıl'}
            disabled={busy}
            onPress={() => {
              if (!armed) return setArmed(true);
              setArmed(false);
              run(leave, info.role === 'owner' ? 'Paylaşım kapatıldı. Evin sende kalıyor.' : 'Aileden ayrıldın.');
            }}
          />
        </>
      ) : (
        <>
          <Card>
            <SecHead title="Evimi paylaş" />
            {premium.active ? (
              <>
                <T style={{ fontSize: 14 }}>Açık olan evin ({S.homeName}) paylaşılır. Bir davet kodu alırsın; en fazla {FAMILY_MAX} kişi.</T>
                <Btn kind="primary" label={busy ? 'Hazırlanıyor…' : 'Davet kodu oluştur'} disabled={busy || loading || !S.setup} onPress={() => run(create, 'Ailen hazır! Kodu evdekilere gönder.')} />
              </>
            ) : (
              <PremiumLock emoji="👨‍👩‍👧" title="Sığınağını ekibinle paylaş" text="Premium ile sığınağını eşin, ev arkadaşın ya da çocuklarınla paylaş; kimin hangi görevi yapacağını seç. Katılanların Premium olması gerekmez." />
            )}
          </Card>
          <Card>
            <SecHead title="Bir aileye katıl" />
            <T style={{ fontSize: 14 }}>Biri seni davet ettiyse kodu yaz. Paylaşılan sığınak açılır; kendi sığınağın Sığınaklarım{"'"}da saklı kalır.</T>
            <Field value={code} onChangeText={v => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} placeholder="Davet kodu, ör. K7M2QX" autoCapitalize="characters" />
            <Field value={name} onChangeText={setName} placeholder="Adın" maxLength={30} />
            <Btn label={busy ? 'Katılıyor…' : 'Katıl'} kind="primary" disabled={busy || code.length < 6} onPress={() => run(() => join(code, name), 'Aileye katıldın 🎉')} />
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  code: { fontFamily: fonts.displayBold, fontSize: 34, letterSpacing: 6, textAlign: 'center', paddingVertical: 10, borderRadius: radius.card - 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
