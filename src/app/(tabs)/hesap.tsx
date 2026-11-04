import { type BadgeArt } from '@/constants/badges';
import { useFocusEffect, type Href } from 'expo-router';
import { useRouter } from '@/lib/nav';
import { useCallback, useRef, useState, type ComponentRef } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { displayName, useAuth } from '@/auth/AuthProvider';
import { BenTour, type TourStep } from '@/components/BenTour';
import { Appear, Squish } from '@/components/motion';
import { Bar, Btn, IconBtn, Screen, Sheet, T, TitleBar } from '@/components/ui';
import { MOKA_ASSETS } from '@/constants/moka';
import { useStep } from '@/lib/firstRun';
import { useToast } from '@/components/Toast';
import { LANGUAGES } from '@/i18n/translations';
import { useTranslation } from '@/i18n/i18n';
import { homeScore, emptyState } from '@/domain/logic';
import { addDays, dayKey, MAX_LEVEL, nextStage, progressOf, STAGES } from '@/domain/play';
import { useNow } from '@/hooks/useNow';
import { extrasUnlocked } from '@/lib/events';
import { legalUrl } from '@/lib/links';
import { purchasesEnabled, usePurchases } from '@/purchases/PurchasesProvider';
import { isOwner } from '@/auth/owner';
import { useStore } from '@/store/AppStore';
import { flush } from '@/sync/cloud';
import { prefs } from '@/lib/supabase';
import { pinMiniWidget, pinTodayWidget, widgetAvailable } from '@/widget/widget';
import { fonts, radius, useColors } from '@/theme';
import { appAlert } from '@/components/AppAlert';

/** Onay penceresi; web önizlemesinde Alert düğmeleri çalışmadığı için tarayıcı penceresi. */
function confirm(title: string, text: string, ok: string, onOk: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${text}`)) onOk();
    return;
  }
  appAlert(title, text, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: ok, style: 'destructive', onPress: onOk },
  ]);
}

type Tgt = ComponentRef<typeof View>;
const TOUR_KEY = 'tour.ben';
const TOUR: TourStep[] = [
  { key: 'profil', pose: 'happy', text: 'Selam, ben Moka! Burası senin sayfan: seviyen, serin ve rozetlerin burada.' },
  { key: 'ilac', pose: 'happy', text: 'İlaçlarını buradan takip edersin. Hatırlatma gelir, içince işaretlersin.' },
  { key: 'gunluk', pose: 'reading', text: 'Günlük: bugün nasıldı? Birkaç satır yaz, ruh halini seç.' },
  { key: 'buyume', pose: 'laptop', text: 'Kendini geliştir: sana göre kitap, film ve öğrenme önerileri.' },
  { key: 'saglik', pose: 'love', text: 'Sağlık: ilaç, alışkanlık, ruh hali ve spor hep burada.' },
  { key: 'plan', pose: 'cheers', text: 'Gelişim planın ve ev planın: evini çiz, odaları, dolabı ve bakımı yönet. Ev kartında.' },
  { key: 'hesap', pose: 'sipping', text: 'Hesap: yedekleme, Premium ve giriş işlemleri burada.' },
  { key: 'ayar', pose: 'wink', text: 'Ayarlar: bildirim saati, dil ve gizlilik. Bu turu burada tekrar açabilirsin. Hadi başlayalım!' },
];

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
  const [cat, setCat] = useState<string | null>(null);
  const [tour, setTour] = useState(false);
  const scrollY = useRef(0);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const [tg] = useState<{ current: Record<string, Tgt | null> }>(() => ({ current: {} }));
  const mark = (k: string) => ({ ref: (v: Tgt | null) => { tg.current[k] = v; }, collapsable: false as const });
  // Tur, Ben sekmesi ilk kez açıldığında ve sırası gelince başlar; "Turu tekrar göster" doğrudan açar.
  const [tourWanted, setTourWanted] = useState(false);
  useFocusEffect(
    useCallback(() => {
      if (prefs.get(TOUR_KEY) === '1') return;
      const id = setTimeout(() => setTourWanted(true), 900);
      return () => {
        clearTimeout(id);
        setTourWanted(false);
      };
    }, []),
  );
  const tourTurn = useStep('tour', tourWanted);
  const endTour = () => { prefs.set(TOUR_KEY, '1'); setTour(false); setTourWanted(false); };
  const account = status === 'account';
  const name = account ? displayName(user) : t('guest');
  const now = useNow();
  const extras = extrasUnlocked(state.play.days.length, now);
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
        replace(emptyState());
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
        replace(emptyState());
        toast('Hesabın silindi.');
      },
    );

  const accountPanel = (
    <View style={{ gap: 12 }}>
      {purchasesEnabled && (
        <View style={[st.card, { backgroundColor: c.surface2 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ gap: 2, flex: 1 }}>
              <T v="h3">Homezy Premium</T>
              <T v="small">{premium.active ? 'Sınırsız ev, özel temalar ve fazlası açık' : 'Tüm özellikleri aç'}</T>
            </View>
            <Text style={{ fontSize: 32 }}>👑</Text>
          </View>
          {premium.active ? (
            <Btn label={t('manageSub')} kind="soft" onPress={() => manage()} block />
          ) : (
            <Btn label={t('goPremium')} kind="primary" onPress={() => { setCat(null); router.push('/premium'); }} block />
          )}
          {!premium.active && (
            <Squish onPress={doRestore} disabled={busy === 'restore'} accessibilityRole="button" accessibilityLabel={t('restorePurchases')} style={{ alignSelf: 'center', padding: 4 }}>
              <T v="small" style={{ textDecorationLine: 'underline' }}>{busy === 'restore' ? 'Kontrol ediliyor…' : t('restorePurchases')}</T>
            </Squish>
          )}
        </View>
      )}

      <View style={[st.card, { backgroundColor: c.surface2 }]}>
        <T v="h3">{t('cloudBackup')}</T>
        <T v="small">
          {account
            ? `Hesabın güvende (${user?.email}). Giriş yaptığın her cihazda evin seninle.`
            : 'Şu an misafir olarak kullanıyorsun. Hesaba geç, evin ve serin kaybolmasın.'}
        </T>
        {account ? (
          <Btn label="Şifre / Bilgi değiştir" kind="soft" onPress={() => { setCat(null); router.push('/giris'); }} block />
        ) : (
          <Btn label="Hesap aç veya giriş yap" kind="primary" onPress={() => { setCat(null); router.push('/giris'); }} block />
        )}
      </View>

      {isOwner(user) && (
        <View style={[st.card, { backgroundColor: c.surface2 }]}>
          <T v="h3">Seviye atla (sadece sahip)</T>
          <T v="small">{`Ev seviyesi: ${hp.level} / ${MAX_LEVEL}${state.play.debugLevel != null ? ' (elle)' : ''}`}</T>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn label="− Seviye" kind="soft" onPress={() => update(D => void (D.play.debugLevel = Math.max(0, hp.level - 1)))} style={{ flex: 1 }} />
            <Btn label="+ Seviye" kind="primary" onPress={() => update(D => void (D.play.debugLevel = Math.min(MAX_LEVEL, hp.level + 1)))} style={{ flex: 1 }} />
          </View>
          <Btn label="Gerçek seviyeye dön" kind="soft" onPress={() => update(D => void (D.play.debugLevel = null))} block />
        </View>
      )}

      <View style={[st.card, { backgroundColor: c.surface2 }]}>
        <T v="h3">{t('about')}</T>
        <View style={st.legal}>
          <Squish onPress={() => Linking.openURL(legalUrl('terms', state.settings.language))} accessibilityRole="link" accessibilityLabel={t('terms')}>
            <T v="small" style={{ textDecorationLine: 'underline' }}>{t('terms')}</T>
          </Squish>
          <Text style={{ color: c.muted }}>•</Text>
          <Squish onPress={() => Linking.openURL(legalUrl('privacy', state.settings.language))} accessibilityRole="link" accessibilityLabel={t('privacy')}>
            <T v="small" style={{ textDecorationLine: 'underline' }}>{t('privacy')}</T>
          </Squish>
        </View>
        <T v="tiny" style={{ textAlign: 'center', opacity: 0.6 }}>
          Müzik ve ortam sesleri: Pixabay (Pixabay İçerik Lisansı). Hava durumu: Open-Meteo.com. Konum yalnızca gökyüzü için kullanılır, saklanmaz. Tüm lisanslar: Gizlilik ve yasal.
        </T>
        <T v="tiny" style={{ textAlign: 'center', opacity: 0.6 }}>Homezy · v1.0.0</T>
      </View>

      <View style={{ gap: 8 }}>
        <Pressable onPress={doSignOut} disabled={busy != null} accessibilityRole="button" accessibilityLabel={t('signOut')} style={({ pressed }) => [st.dangerBtn, { backgroundColor: c.surface2 }, pressed && { opacity: 0.7 }]}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, color: c.late }}>{busy === 'out' ? 'Çıkılıyor…' : t('signOut')}</Text>
        </Pressable>
        <Pressable onPress={doDelete} disabled={busy != null} accessibilityRole="button" accessibilityLabel={t('deleteAccount')} style={({ pressed }) => [st.dangerBtn, { backgroundColor: c.surface2 }, pressed && { opacity: 0.7 }]}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14.5, color: c.late }}>{busy === 'delete' ? 'Siliniyor…' : t('deleteAccount')}</Text>
        </Pressable>
      </View>
    </View>
  );


  const go = (x: Item) => { setCat(null); if (x.onPress) x.onPress(); else if (x.href) router.push(x.href); };
  const earned = badges.filter(b => b.on).length;
  const lockedItem: Item = { emoji: '🔒', label: 'Odak, Spor, Hikâye', sub: '3. günden sonra açılır', tint: c.lavenderSoft, onPress: () => toast('Odak, Spor ve Evimin hikâyesi 3. günden sonra açılır 🌱') };

  const cats: { key: string; emoji: string; title: string; tint: string; sub: string; items: Item[] }[] = [
    { key: 'saglik', emoji: '💚', title: 'Sağlık', tint: c.sageSoft, sub: 'İlaç, alışkanlık, ruh hali', items: [
      { emoji: '💊', label: 'İlaçlarım', sub: 'Hatırlatma ve günlük kayıt', tint: c.sageSoft, href: '/ilac' as Href },
      { emoji: '🌿', label: 'Alışkanlıklar', sub: 'Paketler, su, uyku', tint: c.sageSoft, href: '/aliskanlik' },
      { emoji: '😊', label: 'Ruh hali', sub: 'Bugün nasılsın?', tint: c.roseSoft, href: '/ruhhali' as Href },
      ...(extras ? [{ emoji: '🏃', label: 'Spor', sub: 'Hareket ve antrenman', tint: c.peachSoft, href: '/spor' as Href }] : [lockedItem]),
    ] },
    { key: 'gelisim', emoji: '🌱', title: 'Gelişim', tint: c.lavenderSoft, sub: `${earned} / ${badges.length} rozet`, items: [
      { emoji: '📚', label: 'Kendini geliştir', sub: 'Kitap, film, öğrenme önerileri', tint: c.lavenderSoft, href: '/buyume' as Href },
      { emoji: '📔', label: 'Günlük', sub: 'Bugün nasıldı?', tint: c.roseSoft, href: '/gunluk' },
      { emoji: '🏆', label: 'Rozetler', sub: `${earned} / ${badges.length} kazanıldı`, tint: c.peachSoft, href: '/rozetler' as Href },
      ...(extras ? [
        { emoji: '🍅', label: 'Odak', sub: 'Pomodoro, ders çalışma', tint: c.lavenderSoft, href: '/odak' as Href },
        { emoji: '🎬', label: 'Evimin hikâyesi', sub: 'Baştan bugüne', tint: c.lavenderSoft, href: '/hikaye' as Href },
      ] : []),
    ] },
    { key: 'ev', emoji: '🏠', title: 'Ev', tint: c.peachSoft, sub: 'Plan, dolap, bakım', items: [
      { emoji: '🗺️', label: 'Ev planı', sub: 'Odaları çiz, düzenle', tint: c.sageSoft, href: '/plan' },
      { emoji: '🎨', label: 'Evini kendine benzet', sub: 'Zemin, duvar, pencere, eşya', tint: c.peachSoft, href: '/dekor' },
      { emoji: '👕', label: 'Gardırop', sub: 'Kıyafetler, çamaşır, kombin', tint: c.roseSoft, href: '/dolap' as Href },
      { emoji: '🧊', label: 'Buzdolabı', sub: 'Ürünler, eksikler, tarifler', tint: c.sageSoft, href: '/buzdolabi' as Href },
      { emoji: '🔧', label: 'Ev bakımı', sub: 'Faturalar, garantiler, mevsimlik işler', tint: c.peachSoft, href: '/bakim' },
      { emoji: '🏡', label: 'Evimin özellikleri', sub: 'Evcil hayvan, halı, kombi…', tint: c.lavenderSoft, href: '/evim' },
      { emoji: '🏘️', label: 'Evlerim', sub: `${1 + state.others.length} ev`, tint: c.sageSoft, href: '/evler' },
      { emoji: '👨‍👩‍👧', label: 'Aile evi', sub: 'Evini paylaş', tint: c.roseSoft, href: '/aile' },
      ...(widgetAvailable() ? [
        { emoji: '📌', label: 'Mini widget', sub: 'Su, ilaç, market ve görev tek küçük kutuda', tint: c.sageSoft, onPress: () => { pinMiniWidget().then(ok => toast(ok ? 'Ana ekrana eklemek için onay penceresine dokun.' : 'Eklenemedi. Ana ekranı basılı tut > Araçlar > Homezy · Mini.')); } },
        { emoji: '📋', label: "Bugün widget'ı", sub: 'Bugünün işleri ana ekranında', tint: c.sageSoft, onPress: () => { pinTodayWidget().then(ok => toast(ok ? 'Ana ekrana eklemek için onay penceresine dokun.' : 'Eklenemedi. Ana ekranı basılı tut > Araçlar > Homezy · Bugün.')); } },
      ] : []),
    ] },
    { key: 'moka', emoji: '🐦', title: 'Moka', tint: c.roseSoft, sub: 'Sohbet, bahçe, mağaza', items: [
      { emoji: '💬', label: 'Moka ile sohbet', sub: 'İş ekle, not al, sohbet et', tint: c.peachSoft, href: '/moka' },
      { emoji: '🌷', label: "Moka'nın bahçesi", sub: 'Çiçek yetiştir', tint: c.sageSoft, href: '/bahce' },
      { emoji: '🛍️', label: 'Mağaza', sub: `${state.play.points} puanın var`, tint: c.peachSoft, href: '/magaza' },
      { emoji: '🧡', label: 'Seni tanıyalım', sub: 'Yaşam tarzı ve yemek soruları', tint: c.lavenderSoft, href: '/taniyalim' },
    ] },
    { key: 'hesap', emoji: '👤', title: 'Hesap', tint: c.lavenderSoft, sub: premium.active ? 'Premium ✓' : account ? 'Yedek açık' : 'Misafir', items: [] },
    { key: 'ayar', emoji: '⚙️', title: 'Ayarlar', tint: c.sageSoft, sub: 'Bildirim, dil, gizlilik', items: [
      { emoji: '🔔', label: 'Bildirimler ve ayarlar', sub: 'Sabah özeti, ses, tema', tint: c.lavenderSoft, href: '/bildirimler' },
      { emoji: '🧭', label: 'Turu tekrar göster', sub: 'Ben sayfasının tanıtımı', tint: c.peachSoft, onPress: () => setTimeout(() => setTour(true), 300) },
      { emoji: '🌍', label: t('language'), sub: LANGUAGES.find(l => l.code === (state.settings.language ?? 'tr'))?.label ?? '', tint: c.sageSoft, onPress: () => setLangOpen(true) },
      { emoji: '🔒', label: 'Gizlilik ve yasal', sub: 'İzinler, veri dışa aktarma, lisanslar', tint: c.roseSoft, href: '/yasal' },
    ] },
  ];
  const open = cats.find(x => x.key === cat);
  const pins: Item[] = [
    { emoji: '📔', label: 'Günlük', sub: '', tint: c.roseSoft, href: '/gunluk' },
    { emoji: '💊', label: 'İlaçlarım', sub: '', tint: c.sageSoft, href: '/ilac' as Href },
    { emoji: '📚', label: 'Kendini geliştir', sub: '', tint: c.lavenderSoft, href: '/buyume' as Href },
    { emoji: '🛍️', label: 'Mağaza', sub: '', tint: c.peachSoft, href: '/magaza' },
  ];

  return (
    <Screen header={false} tab tone="lavender" scrollRef={scroller} onScrollY={y => { scrollY.current = y; }}>
      <TitleBar title={t('profile')} right={<IconBtn icon="⚙️" label={t('settings')} onPress={() => setCat('ayar')} />} />

      <View {...mark('profil')}>
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
          <T v="tiny">{`🔥 ${hp.streak} ${t('gün seri')} · 🏆 ${earned}/${badges.length}`}</T>
        </View>
      </Appear>
      </View>

      <Appear index={2} style={st.pins}>
        {pins.map(x => (
          <View key={x.label} {...mark(PIN_KEY[x.label] ?? x.label)} style={st.pin}>
          <Squish onPress={() => go(x)} accessibilityRole="button" accessibilityLabel={x.label} style={st.pinIn}>
            <View style={[st.pinIcon, { backgroundColor: x.tint }]}><Text style={{ fontSize: 24 }}>{x.emoji}</Text></View>
            <T v="tiny" numberOfLines={1} style={{ textAlign: 'center' }}>{x.label}</T>
          </Squish>
          </View>
        ))}
      </Appear>

      <Appear index={3} style={st.grid}>
        {cats.map(x => (
          <View key={x.key} {...mark(TILE_KEY[x.key] ?? x.key)} style={st.tileWrap}>
          <Squish onPress={() => setCat(x.key)} accessibilityRole="button" accessibilityLabel={x.title} style={[st.tile, { backgroundColor: c.surface }]}>
            <View style={[st.tileIcon, { backgroundColor: x.tint }]}><Text style={{ fontSize: 28 }}>{x.emoji}</Text></View>
            <T v="h3" numberOfLines={1}>{x.title}</T>
            <T v="tiny" numberOfLines={1}>{x.sub}</T>
          </Squish>
          </View>
        ))}
      </Appear>

      {(tour || tourTurn) && (
        <BenTour steps={TOUR} targets={tg} onDone={endTour} getY={() => scrollY.current} scrollTo={y => scroller.current?.scrollTo({ y: Math.max(0, y), animated: true })} />
      )}

      <Sheet open={!!open} onClose={() => setCat(null)} scroll>
        {open && (
          <View style={{ gap: 12, paddingVertical: 6 }}>
            <T v="h2">{`${open.emoji} ${open.title}`}</T>
            {open.key === 'hesap' ? accountPanel : (
              <View style={[st.group, { backgroundColor: c.surface2 }]}>
                {open.items.map((x, i) => (
                  <Squish key={x.label} onPress={() => go(x)} accessibilityRole="button" accessibilityLabel={x.label} style={[st.row, i > 0 && { borderTopWidth: 1, borderTopColor: c.line }]}>
                    <View style={[st.rowIcon, { backgroundColor: x.tint }]}><Text style={{ fontSize: 20 }}>{x.emoji}</Text></View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T v="bold" numberOfLines={1} style={{ fontSize: 15 }}>{x.label}</T>
                      {!!x.sub && <T v="tiny" numberOfLines={1}>{x.sub}</T>}
                    </View>
                    <Text style={[st.chev, { color: c.muted }]}>›</Text>
                  </Squish>
                ))}
              </View>
            )}
            <Btn label={t('close')} kind="soft" onPress={() => setCat(null)} block />
          </View>
        )}
      </Sheet>

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
                  disabled={!!l.soon}
                  onPress={() => {
                    if (l.soon) return;
                    update(D => void (D.settings.language = l.code));
                    setLangOpen(false);
                    toast(`${l.flag} ${l.label} seçildi.`);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={l.label}
                  style={[
                    st.langRow,
                    { backgroundColor: selected ? c.accentSoft : c.surface2, borderColor: selected ? c.hi : c.line, opacity: l.soon ? 0.55 : 1 },
                  ]}
                >
                  <Text style={{ fontSize: 22 }}>{l.flag}</Text>
                  <Text style={[st.langText, { color: c.ink }]}>{l.label}</Text>
                  {l.soon && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: c.muted }}>{l.soon}</Text>}
                  {selected && <Text style={{ fontFamily: fonts.bodyBlack, color: c.ok }}>✓</Text>}
                </Pressable>
              );
            })}
          </View>
          <Btn label={t('close')} onPress={() => setLangOpen(false)} block style={{ marginTop: 6 }} />
        </View>
      </Sheet>
    </Screen>
  );
}

type Item = { emoji: string; label: string; sub: string; tint: string; href?: Href; onPress?: () => void };

const PIN_KEY: Record<string, string> = { 'İlaçlarım': 'ilac', 'Günlük': 'gunluk', 'Kendini geliştir': 'buyume' };
const TILE_KEY: Record<string, string> = { saglik: 'saglik', ev: 'plan', hesap: 'hesap', ayar: 'ayar' };

const st = StyleSheet.create({
  pinIn: { alignItems: 'center', gap: 6 },
  tileWrap: { width: '48.5%' },
  pins: { flexDirection: 'row', gap: 8 },
  pin: { flex: 1, alignItems: 'center', gap: 6 },
  pinIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { borderRadius: radius.card, padding: 14, gap: 4 },
  tileIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
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
