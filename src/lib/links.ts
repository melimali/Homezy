/**
 * Mağazaların istediği yasal sayfalar. Kaynak dosyalar docs/yasal/ altında; yayın adresi
 * (GitHub Pages: Settings › Pages › main /docs) belli olunca BASE'i güncelle. Mağaza formlarına yazılan adreslerle aynı olmalı.
 */
const BASE = 'https://melimali.github.io/layfapp/yasal';

/** Destek ve yasal talepler (KVKK / GDPR). YAYINDAN ÖNCE gerçek adresle değiştir (docs/yasal/README.md). */
export const SUPPORT_EMAIL = 'info@themeikai.com';

export const LEGAL = {
  privacy: `${BASE}/gizlilik.html`,
  terms: `${BASE}/kosullar.html`,
  privacyEn: `${BASE}/privacy.html`,
  termsEn: `${BASE}/terms.html`,
  deletion: `${BASE}/hesap-silme.html`,
};

/** Uygulama dili Türkçe ise Türkçe, değilse İngilizce sayfa. */
export function legalUrl(kind: 'privacy' | 'terms', lang?: string) {
  const tr = !lang || lang === 'tr';
  return kind === 'privacy' ? (tr ? LEGAL.privacy : LEGAL.privacyEn) : tr ? LEGAL.terms : LEGAL.termsEn;
}
