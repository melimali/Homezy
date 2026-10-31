import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';

import { displayName, useAuth } from '@/auth/AuthProvider';
import { PremiumLock } from '@/components/PremiumLock';
import { useToast } from '@/components/Toast';
import { BackLink, Btn, Card, Field, Screen, SecHead, T, XBtn } from '@/components/ui';
import { FAMILY_MAX, GOAL_IDEAS, goalPct } from '@/domain/family';
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
  const { info, loading, sharedId, sharing, create, join, leave, kick, goals, addGoal, logGoal, removeGoal } = useFamily();
  const [adding, setAdding] = useState(false);
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
    const msg = `Homezy'de evimizi paylaşalım 🏡 Hesabım > Aile paylaşımı'na gir ve bu kodu yaz: ${k}`;
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
        <T v="h1">Aile paylaşımı 👨‍👩‍👧</T>
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
        <T v="eyebrow">Aile paylaşımı</T>
        <T v="h1">Evi birlikte çekip çevirin 👨‍👩‍👧</T>
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
              <T v="small">Bu kodu evdekilere gönder. Homezy{"'"}de Hesabım {'>'} Aile paylaşımı{"'"}ndan katılsınlar.</T>
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
                {m.owner && <T v="small">ev sahibi</T>}
                {info.role === 'owner' && !m.owner && (
                  <XBtn label={`${m.name} kişisini çıkar`} onPress={() => run(() => kick(m.id), `${m.name} aileden çıkarıldı.`)} />
                )}
              </View>
            ))}
            <T v="small">İşleri bölüşmek için oda ekranında bir işin yanındaki 👤 düğmesine dokun.</T>
          </Card>
          {info.active && (
            <Card>
              <SecHead title="Ortak hedefler 🎯" right={goals.length ? String(goals.length) : undefined} />
              {info.role === 'member' && (
                <T v="small">{info.ownerName} kişisinin Premium{"'"}u sayesinde senin de Premium avantajların açık ⭐</T>
              )}
              {goals.length === 0 && !adding && <T style={{ fontSize: 14 }}>Birlikte bir hedef koyun: kitap, spor, yemek… Herkes ilerlemesini ekler, çubuk birlikte dolar.</T>}
              {goals.map(g => (
                <View key={g.id} style={[styles.goal, { borderColor: c.line }]}>
                  <View style={styles.row}>
                    <Text style={{ fontSize: 24 }}>{g.done ? '🏆' : g.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <T v="bold">{g.title}</T>
                      <T v="small">{g.total}/{g.target} {g.unit} · %{goalPct(g)}</T>
                    </View>
                    {(g.createdBy === session.user.id || info.role === 'owner') && (
                      <XBtn label={`${g.title} hedefini sil`} onPress={() => run(() => removeGoal(g.id))} />
                    )}
                  </View>
                  <View style={[styles.bar, { backgroundColor: c.surface2 }]}>
                    <View style={[styles.fill, { width: `${goalPct(g)}%`, backgroundColor: g.done ? c.accent : c.hi }]} />
                  </View>
                  <T v="small">
                    {info.members.map(m => `${m.name.split(' ')[0]} ${g.byMember[m.id] ?? 0}`).join(' · ')}
                  </T>
                  {!g.done && (
                    <Btn label={`+1 ${g.unit} ekle`} kind="primary" disabled={busy} onPress={() => run(() => logGoal(g.id, 1), g.total + 1 >= g.target ? 'Hedef tamam, hepinize tebrikler! 🏆' : undefined)} />
                  )}
                </View>
              ))}
              {adding ? (
                <>
                  {GOAL_IDEAS.map(i => (
                    <Btn
                      key={i.title}
                      kind="ghost"
                      label={`${i.emoji} ${i.title} (${i.target} ${i.unit})`}
                      disabled={busy}
                      onPress={() => { setAdding(false); run(() => addGoal(i), 'Hedef eklendi 🎯'); }}
                    />
                  ))}
                  <Btn kind="ghost" label="Vazgeç" onPress={() => setAdding(false)} />
                </>
              ) : (
                <Btn kind="ghost" label="Yeni hedef" onPress={() => setAdding(true)} />
              )}
            </Card>
          )}
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
              <PremiumLock emoji="👨‍👩‍👧" title="Evini ailenle paylaş" text="Premium ile evini eşin, ev arkadaşın ya da çocuklarınla paylaş; kimin hangi işi yapacağını seç. Katılanların Premium olması gerekmez." />
            )}
          </Card>
          <Card>
            <SecHead title="Bir aileye katıl" />
            <T style={{ fontSize: 14 }}>Biri seni davet ettiyse kodu yaz. Paylaşılan ev açılır; kendi evin Evlerim{"'"}de saklı kalır.</T>
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
  goal: { gap: 8, paddingVertical: 10, borderTopWidth: 1.5 },
  bar: { height: 12, borderRadius: 6, overflow: 'hidden' },
  fill: { height: 12, borderRadius: 6 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
