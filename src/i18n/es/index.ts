import { TMZ_ES } from '../tmz';
import { ES_1 } from './es1';
import { ES_2 } from './es2';
import { ES_3 } from './es3';
import { ES_4 } from './es4';

/** Türkçe metin → İspanyolca. Anahtarlar İngilizce sözlükle (../en) aynıdır; `{}` değişken yeridir. */
export const ES: Record<string, string> = { ...ES_1, ...ES_2, ...ES_3, ...ES_4, ...TMZ_ES };
