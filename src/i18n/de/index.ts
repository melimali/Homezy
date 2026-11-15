import { DE_P1 } from './p1';
import { DE_P2 } from './p2';
import { DE_P3 } from './p3';
import { DE_P4 } from './p4';
import { DE_P5 } from './p5';
import { DE_P6 } from './p6';

/** Türkçe metin → Almanca. Eksik anahtarlar runtime.ts içinde İngilizceye düşer. */
export const DE: Record<string, string> = { ...DE_P1, ...DE_P2, ...DE_P3, ...DE_P4, ...DE_P5, ...DE_P6 };
