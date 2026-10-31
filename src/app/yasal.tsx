import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Linking, Platform, Share, StyleSheet, Switch, Text, View } from 'react-native';

import { useToast } from '@/components/Toast';
import { BackLink, Btn, Card, Screen, T } from '@/components/ui';
import { aiConsent, locationOk } from '@/lib/consent';
import { LEGAL, legalUrl } from '@/lib/links';
import { useStore } from '@/store/AppStore';
import { fonts, useColors } from '@/theme';

/** Üçüncü taraf bileşenler ve lisansları. Yeni paket eklenince bu listeyi de güncelle (docs/yasal/README.md). */
const CREDITS: { name: string; what: string; license: string }[] = [
  { name: 'Expo, React Native, React', what: 'Uygulama altyapısı', license: 'MIT' },
  { name: 'Supabase JS', what: 'Hesap ve yedek', license: 'MIT' },
  { name: 'RevenueCat (react-native-purchases)', what: 'Abonelik', license: 'MIT' },
  { name: 'react-native-google-mobile-ads', what: 'Reklam (ücretsiz plan)', license: 'Apache-2.0' },
  { name: 'react-native-svg, react-native-view-shot, react-native-safe-area-context, react-native-screens, react-native-android-widget', what: 'Arayüz', license: 'MIT' },
  { name: 'Baloo 2 (Ek Type)', what: 'Başlık yazı tipi', license: 'SIL OFL 1.1' },
  { name: 'Nunito (Vernon Adams, Jacques Le Bailly)', what: 'Metin yazı tipi', license: 'SIL OFL 1.1' },
  { name: 'Pixabay', what: 'Müzik ve ortam sesleri', license: 'Pixabay İçerik Lisansı' },
  { name: 'Open-Meteo.com', what: 'Hava durumu verisi', license: 'CC BY 4.0' },
  { name: 'Anthropic Claude', what: 'Fotoğraf taraması ve Moka sohbeti (yapay zekâ)', license: 'Anthropic ticari şartları' },
];

/** Gizlilik ve yasal: bağlantılar, rıza ayarları, veri dışa aktarma, yapay zekâ bilgilendirmesi, lisanslar. */
export default function Yasal() {
  const c = useColors();
  const toast = useToast();
  const { state } = useStore();
  const lang = state.settings.language;
  const [ai, setAi] = useState(aiConsent.get());
  const [loc, setLoc] = useState(locationOk.get());
  const [busy, setBusy] = useState(false);

  const exportData = async () => {
    setBusy(true);
    try {
      const json = JSON.stringify({ app: 'Homezy', exportedAt: new Date().toISOString(), data: state }, null, 2);
      if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
        await Share.share({ message: json });
      } else {
        const dir = new Directory(Paths.cache, 'export');
        if (!dir.exists) dir.create({ intermediates: true });
        const file = new File(dir, 'homezy-verilerim.json');
        if (file.exists) file.delete();
        file.create();
        file.write(json);
        await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Verilerimi dışa aktar' });
        file.delete();
      }
    } catch {
      toast('Veriler dışa aktarılamadı. Tekrar dene.');
    }
    setBusy(false);
  };

  const link = (label: string, url: string) => (
    <Btn kind="soft" label={label} onPress={() => Linking.openURL(url)} block />
  );

  return (
    <Screen header={false}>
      <BackLink />
      <T v="h1">Gizlilik ve yasal</T>

      <Card>
        <T v="h3">Belgeler</T>
        {link('Gizlilik Politikası', legalUrl('privacy', lang))}
        {link('Kullanım Koşulları', legalUrl('terms', lang))}
        {link('Hesap ve veri silme sayfası', LEGAL.deletion)}
      </Card>

      <Card>
        <T v="h3">İzinlerin</T>
        <Row
          label="Yapay zekâ ile işleme"
          sub="Fotoğraf taraması ve Moka sohbeti, içeriği yanıt üretmek için Anthropic'e gönderir. Kapatırsan bu özellikler tekrar sorar."
          value={ai}
          onChange={v => { aiConsent.set(v); setAi(v); }}
        />
        <Row
          label="Konumla gökyüzü"
          sub="Yaklaşık konum sadece evin gökyüzünün hava durumu için kullanılır, saklanmaz."
          value={loc}
          onChange={v => { locationOk.set(v); setLoc(v); }}
        />
        <T v="tiny">Bildirim, kamera ve konum izinlerini telefonunun ayarlarından da değiştirebilirsin.</T>
        <Btn kind="ghost" small label="Telefon ayarlarını aç" onPress={() => Linking.openSettings()} />
      </Card>

      <Card>
        <T v="h3">Verilerin</T>
        <T v="small">Ev verilerini (odalar, rutinler, gardırop, stok, puan, günlük, ayarlar) JSON dosyası olarak alabilirsin.</T>
        <Btn kind="soft" label={busy ? 'Hazırlanıyor…' : 'Verilerimi dışa aktar'} onPress={exportData} disabled={busy} block />
        <T v="tiny">Hesabını ve bulut verilerini silmek için Ben sekmesinin en altındaki “Hesabımı sil”i kullan.</T>
      </Card>

      <Card>
        <T v="h3">Yapay zekâ hakkında</T>
        <T v="small">Moka ve fotoğraf taraması yapay zekâ ile çalışır; cevapları hatalı olabilir. Moka tıbbi, psikolojik, hukuki ya da finansal tavsiye vermez ve bir uzmanın yerini tutmaz. Kendine zarar verme düşüncen ya da acil bir durum varsa Moka’ya değil hemen 112’yi (başka ülkedeysen oradaki acil numarayı) ara ya da bir uzmandan yardım iste. Homezy 13 yaş ve üzeri içindir.</T>
      </Card>

      <Card>
        <T v="h3">Lisanslar ve teşekkürler</T>
        {CREDITS.map(x => (
          <View key={x.name} style={{ gap: 1 }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: c.ink }}>{x.name}</Text>
            <T v="tiny">{x.what} · {x.license}</T>
          </View>
        ))}
        <T v="tiny">Hava durumu verisi: Open-Meteo.com (CC BY 4.0). Tüm paketlerin tam lisans metinleri ilgili projelerin sayfalarında bulunur.</T>
      </Card>
    </Screen>
  );
}

function Row({ label, sub, value, onChange }: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  const c = useColors();
  return (
    <View style={st.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: c.ink }}>{label}</Text>
        <T v="tiny">{sub}</T>
      </View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label} trackColor={{ true: c.hi }} />
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
