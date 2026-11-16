import type { ImageSourcePropType } from 'react-native';

import { MIMIK_FUR, SEATED_FUR } from './moka-fur-assets';

/**
 * Moka'nın 8 mimiği (`assets/moka/mimik/`, `scripts/slice-mimik.py` ile ChatGPT sayfasından kesildi).
 * Hepsi aynı ölçekte, alta hizalı kareler: biri öbürünün üstüne konunca Moka yerinde kalır.
 */
export type Mimik = 'neutral' | 'happy' | 'cheer' | 'wow' | 'sad' | 'sleepy' | 'wink' | 'talk';

export const MIMIK: Record<Mimik, ImageSourcePropType> = {
  neutral: require('../../assets/moka/mimik/1.webp'),
  happy: require('../../assets/moka/mimik/2.webp'),
  cheer: require('../../assets/moka/mimik/3.webp'),
  wow: require('../../assets/moka/mimik/4.webp'),
  sad: require('../../assets/moka/mimik/5.webp'),
  sleepy: require('../../assets/moka/mimik/6.webp'),
  wink: require('../../assets/moka/mimik/7.webp'),
  talk: require('../../assets/moka/mimik/8.webp'),
};

/** Kürk rengine göre mimikler (scripts/make-moka-fur.py); bilinmeyen renk ya da varsayılan için özgün mimikler. */
export function mimikFor(fur?: string | null): Record<Mimik, ImageSourcePropType> {
  const f = fur ? MIMIK_FUR[fur] : undefined;
  return f ?? MIMIK;
}

/** Yastıkta oturan tam boy Moka, aynı 8 mimikle (yüzler `scripts/make-moka-seated-face.py` ile oturan gövdeye giydirildi). */
export const SEATED: Record<Mimik, ImageSourcePropType> = {
  neutral: require('../../assets/moka/seated/1.webp'),
  happy: require('../../assets/moka/seated/2.webp'),
  cheer: require('../../assets/moka/seated/3.webp'),
  wow: require('../../assets/moka/seated/4.webp'),
  sad: require('../../assets/moka/seated/5.webp'),
  sleepy: require('../../assets/moka/seated/6.webp'),
  wink: require('../../assets/moka/seated/7.webp'),
  talk: require('../../assets/moka/seated/8.webp'),
};

export function seatedFor(fur?: string | null): Record<Mimik, ImageSourcePropType> {
  const f = fur ? SEATED_FUR[fur] : undefined;
  return f ?? SEATED;
}

/** Sohbet cevabının tonundan mimik (kelime ve emojilere bakar; internet gerekmez). */
export function mimikOf(text: string): Exclude<Mimik, 'wink' | 'talk'> {
  const t = text.toLocaleLowerCase('tr');
  if (/maalesef|üzgün|olmadı|hata|yapamadım|üzül/.test(t)) return 'sad';
  if (/uyku|dinlen|yorgun|gece|tatlı rüya|esni/.test(t)) return 'sleepy';
  if (/harika|süper|bravo|tebrik|🎉|🥳|yaşasın|muhteşem/.test(t)) return 'cheer';
  if (/vay|inanılmaz|gerçekten mi|😮|😲|şaşırdım/.test(t)) return 'wow';
  return 'happy';
}
