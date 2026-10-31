import { Alert, Platform } from 'react-native';

import { prefs } from '@/lib/supabase';

/**
 * Yapay zekâ rızası. Fotoğraf taraması ve Moka sohbeti, içeriği yanıt üretmek için Anthropic'e iletir
 * (bkz. docs/yasal/gizlilik.html). İlk kullanımda bir kez sorulur; Hesabım › Gizlilik ve yasal'dan geri çekilir.
 */
const KEY = 'consent.ai';
const LOC = 'consent.loc';

export const aiConsent = {
  get: () => prefs.get(KEY) === '1',
  set: (on: boolean) => prefs.set(KEY, on ? '1' : null),
};

/** Konum izni istemeden önce kullanıcı kapatabilir. Varsayılan açık: izni yine de işletim sistemi sorar. */
export const locationOk = {
  get: () => prefs.get(LOC) !== 'off',
  set: (on: boolean) => prefs.set(LOC, on ? null : 'off'),
};

const TEXT: Record<'scan' | 'chat', string> = {
  scan: 'Seçtiğin fotoğraf, içindekileri tanımak için yapay zekâ servisine (Anthropic) gönderilir. Biz fotoğrafı saklamayız. Kıyafet fotoğraflarında yüz ya da beden bilgisi çıkarılmaz.',
  chat: 'Yazdığın mesajlar ve evinin kısa özeti (oda ve iş adların, seviye, seri), cevap üretmek için yapay zekâ servisine (Anthropic) gönderilir. Biz mesajları saklamayız. Moka bir yapay zekâdır; tıbbi, psikolojik ya da hukuki tavsiye vermez. Acil durumda 112\'yi ara.',
};

/** Rıza yoksa sorar. Verilmişse hemen true. */
export function ensureAiConsent(kind: 'scan' | 'chat'): Promise<boolean> {
  if (aiConsent.get()) return Promise.resolve(true);
  const title = 'Yapay zekâ ile işlenecek';
  const body = `${TEXT[kind]}\n\nBu rıza Gizlilik Politikası'nda anlatıldığı gibi verilerinin yurt dışına aktarılmasını da kapsar. İstediğin zaman Ben › Gizlilik ve yasal'dan geri çekebilirsin.`;
  if (Platform.OS === 'web') {
    const ok = !!globalThis.confirm?.(`${title}\n\n${body}`);
    if (ok) aiConsent.set(true);
    return Promise.resolve(ok);
  }
  return new Promise(resolve => {
    Alert.alert(
      title,
      body,
      [
        { text: 'Vazgeç', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Kabul ediyorum', onPress: () => { aiConsent.set(true); resolve(true); } },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
