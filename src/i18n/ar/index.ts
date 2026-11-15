import { AR_P1 } from './p1';
import { AR_P2 } from './p2';
import { AR_P3 } from './p3';
import { AR_P4 } from './p4';
import { AR_P5 } from './p5';
import { AR_P6 } from './p6';

/** Türkçe metin → Arapça. Eksik anahtarlar runtime.ts içinde İngilizceye düşer. */
export const AR: Record<string, string> = { ...AR_P1, ...AR_P2, ...AR_P3, ...AR_P4, ...AR_P5, ...AR_P6 };
