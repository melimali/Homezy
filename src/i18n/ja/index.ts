import { JA_P1 } from './p1';
import { JA_P2 } from './p2';
import { JA_P3 } from './p3';
import { JA_P4 } from './p4';
import { JA_P5 } from './p5';

/** Türkçe metin → Japonca. Eksik anahtarlar runtime.ts içinde İngilizceye düşer. */
export const JA: Record<string, string> = { ...JA_P1, ...JA_P2, ...JA_P3, ...JA_P4, ...JA_P5 };
