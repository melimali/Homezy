import { useBusy } from '@/components/BusyOverlay';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { Appear, Squish } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { BackLink, Btn, Card, Screen, T } from '@/components/ui';
import { useTranslation } from '@/i18n/i18n';
import { lbJoin, lbLeave, lbTop, type LbBoard, type LbData, type LbPeriod, type LbRow } from '@/leaderboard/leaderboard';
import { useNickname } from '@/profile/useName';
import { radius, useColors } from '@/theme';

/** Global ev sıralaması: tek "ev puanı" (eşyalar + Moka bahçesi + ev temizliği). Katılmak isteğe bağlı. */
export default function Siralama() {
  const c = useColors();
  const { t } = useTranslation();
  const toast = useToast();
  const { status } = useAuth();
  const nick0 = useNickname();
  const [board, setBoard] = useState<LbBoard>('ev');
  const [period, setPeriod] = useState<LbPeriod>('hafta');
  const [data, setData] = useState<LbData | null>(null);
  const [loading, setLoading] = useState(true);
  useBusy(loading);
  const [nick, setNick] = useState(nick0 ?? '');
  const [busy, setBusy] = useState(false);
  useBusy(!!busy);
  const account = status === 'account';

  const [tick, setTick] = useState(0);
  const load = () => setTick(n => n + 1);
  useEffect(() => {
    if (!account) return;
    let off = false;
    lbTop(period, board).then(d => { if (!off) { setData(d); setLoading(false); } });
    return () => void (off = true);
  }, [account, period, board, tick]);

  const join = async () => {
    setBusy(true);
    const err = await lbJoin(nick);
    setBusy(false);
    if (err === 'nick') return toast(t('Takma ad 2-16 harf olmalı; e-posta ya da bağlantı olmaz.'));
    if (err) return toast(t('Katılınamadı, sonra tekrar dene.'));
    toast(t('Sıralamaya katıldın 🏆'));
    load();
  };
  const leave = async () => {
    setBusy(true);
    const ok = await lbLeave();
    setBusy(false);
    toast(ok ? t('Sıralamadan çıktın, verilerin silindi.') : t('Çıkılamadı, sonra tekrar dene.'));
    if (ok) load();
  };

  return (
    <Screen header={false}>
      <BackLink />
      <T v="h1">{t('Ev sıralaması 🏆')}</T>
      <View style={st.tabs}>
        {(['ev', 'moka'] as const).map(b => (
          <Squish key={b} onPress={() => { setBoard(b); setLoading(true); }} accessibilityRole="button" accessibilityState={{ selected: board === b }}
            style={[st.tab, { backgroundColor: board === b ? c.accent : c.surface2 }]}>
            <T v="bold" style={{ color: board === b ? c.onAccent : c.ink }}>{b === 'ev' ? t('Ev puanı') : t('Moka Şampiyonları')}</T>
          </Squish>
        ))}
      </View>
      <T v="tiny">{board === 'ev' ? t('Ev puanı = eve aldığın eşyalar + Moka bahçesi + ev temizliği') : t('Moka seviyene göre: en çok exp toplayan Moka şampiyon olur 👑')}</T>

      {!account && (
        <Card><T v="small">{t('Sıralamaya katılmak için hesap aç ya da giriş yap. Misafirler katılamaz.')}</T></Card>
      )}

      {account && data && !data.joined && (
        <Card>
          <T v="bold">{t('Katılmak ister misin?')}</T>
          <T v="small">{t('Sadece takma adın, ev puanın ve seviyen görünür. Gerçek adın, konumun ve ev planın paylaşılmaz. İstediğin zaman çıkabilirsin.')}</T>
          <TextInput
            value={nick} onChangeText={setNick} maxLength={16} placeholder={t('Takma ad')} placeholderTextColor={c.muted}
            style={[st.input, { backgroundColor: c.surface2, color: c.ink }]} accessibilityLabel={t('Takma ad')}
          />
          <Btn kind="primary" label={t('Katıl')} block disabled={busy || nick.trim().length < 2} onPress={join} />
        </Card>
      )}

      {account && data?.joined && (
        <>
          <View style={st.tabs}>
            {board === 'ev' && (['hafta', 'hepsi'] as const).map(p => (
              <Squish key={p} onPress={() => setPeriod(p)} accessibilityRole="button" accessibilityState={{ selected: period === p }}
                style={[st.tab, { backgroundColor: period === p ? c.accent : c.surface2 }]}>
                <T v="bold" style={{ color: period === p ? c.onAccent : c.ink }}>{p === 'hafta' ? t('Bu hafta') : t('Tüm zamanlar')}</T>
              </Squish>
            ))}
          </View>
          {data.me ? (
            <Card><T v="bold">{`#${data.me.rank} · ${board === 'moka' ? `${t('Moka sv.')} ${data.me.score}` : `${data.me.score} ${t('puan')}`}`}</T><T v="tiny">{brk(data.me, board)}</T></Card>
          ) : (
            <Card><T v="small">{t('Listeye girmek için en az 3 gün iş yapman gerekir.')}</T></Card>
          )}
          {data.top.map((r, i) => (
            <Appear key={r.rank} index={Math.min(i, 8)} style={[st.row, { backgroundColor: r.me ? c.sageSoft : c.surface }]}>
              <T v="bold" style={{ width: 36 }}>{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : `#${r.rank}`}</T>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T v="bold" numberOfLines={1}>{r.nick}</T>
                <T v="tiny" numberOfLines={1}>{`${t('Sv.')} ${r.level} · 🔥 ${r.streak} · ${brk(r, board)}`}</T>
              </View>
              <T v="bold">{board === 'moka' ? `${t('Moka sv.')} ${r.score}` : r.score}</T>
            </Appear>
          ))}
          {loading && <T v="tiny">{t('Yükleniyor…')}</T>}
          <Btn kind="ghost" label={t('Sıralamadan çık')} block disabled={busy} onPress={leave} />
        </>
      )}
      {account && !data && !loading && <Card><T v="small">{t('Sıralama yüklenemedi. İnterneti kontrol et.')}</T></Card>}
    </Screen>
  );
}

const brk = (r: LbRow, b: LbBoard) => b === 'moka' ? `${r.xp ?? 0} exp` : `🪑 ${r.items} · 🌸 ${r.garden} · ✨ ${r.clean}`;

const st = StyleSheet.create({
  input: { borderRadius: radius.tile, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  tabs: { flexDirection: 'row', gap: 10 },
  tab: { flex: 1, borderRadius: radius.pill ?? 999, paddingVertical: 10, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.tile, padding: 12 },
});
