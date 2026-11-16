import { TMZ_KO } from '../tmz';
import { KO_1 } from './ko1';
import { KO_2 } from './ko2';
import { KO_3 } from './ko3';
import { KO_4 } from './ko4';

/** Türkçe metin → Korece. Anahtarlar İngilizce sözlükle (../en) aynıdır; `{}` değişken yeridir. */
export const KO: Record<string, string> = { ...KO_1, ...KO_2, ...KO_3, ...KO_4, ...TMZ_KO };
