import type { ImageSourcePropType } from 'react-native';

/**
 * Moka'nın 8 mimiği (`assets/moka/mimik/`, `scripts/slice-mimik.py` ile ChatGPT sayfasından kesildi).
 * Hepsi aynı ölçekte, alta hizalı kareler: biri öbürünün üstüne konunca Moka yerinde kalır.
 */
export type Mimik = 'neutral' | 'happy' | 'cheer' | 'wow' | 'sad' | 'sleepy' | 'wink' | 'talk';

export const MIMIK: Record<Mimik, ImageSourcePropType> = {
  neutral: require('../../assets/moka/mimik/1.png'),
  happy: require('../../assets/moka/mimik/2.png'),
  cheer: require('../../assets/moka/mimik/3.png'),
  wow: require('../../assets/moka/mimik/4.png'),
  sad: require('../../assets/moka/mimik/5.png'),
  sleepy: require('../../assets/moka/mimik/6.png'),
  wink: require('../../assets/moka/mimik/7.png'),
  talk: require('../../assets/moka/mimik/8.png'),
};

/** Sohbet cevabının tonundan mimik (kelime ve emojilere bakar; internet gerekmez). */
export function mimikOf(text: string): Exclude<Mimik, 'wink' | 'talk'> {
  const t = text.toLocaleLowerCase('tr');
  if (/maalesef|üzgün|olmadı|hata|yapamadım|üzül/.test(t)) return 'sad';
  if (/uyku|dinlen|yorgun|gece|tatlı rüya|esni/.test(t)) return 'sleepy';
  if (/harika|süper|bravo|tebrik|🎉|🥳|yaşasın|muhteşem/.test(t)) return 'cheer';
  if (/vay|inanılmaz|gerçekten mi|😮|😲|şaşırdım/.test(t)) return 'wow';
  return 'happy';
}
