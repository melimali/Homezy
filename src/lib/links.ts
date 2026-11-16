/**
 * Mağazaların istediği yasal sayfalar. Kaynak dosyalar docs/yasal/ altında; yayın adresi
 * Yayında: themeikai.com/homezy/<klasör> (kaynak: docs/yasal/site/). Mağaza formlarına yazılan adreslerle aynı olmalı.
 */
const BASE = 'https://themeikai.com/homezy';

/** Destek ve yasal talepler (KVKK / GDPR). Yasal talepler bu adrese gelir. */
export const SUPPORT_EMAIL = 'info@themeikai.com';

export const LEGAL = {
  privacy: `${BASE}/gizlilik`,
  terms: `${BASE}/kosullar`,
  privacyEn: `${BASE}/privacy`,
  termsEn: `${BASE}/terms`,
  deletion: `${BASE}/hesap-silme`,
};

/** Uygulama dili Türkçe ise Türkçe, değilse İngilizce sayfa. */
export function legalUrl(kind: 'privacy' | 'terms', lang?: string) {
  const tr = !lang || lang === 'tr';
  return kind === 'privacy' ? (tr ? LEGAL.privacy : LEGAL.privacyEn) : tr ? LEGAL.terms : LEGAL.termsEn;
}

/** Bağlantıyı güvenle açar; açılamazsa hata fırlatmaz, false döner (Sentry HOMEZY-1). */
export async function openLink(url: string): Promise<boolean> {
  try {
    const { Linking } = require('react-native') as typeof import('react-native');
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
