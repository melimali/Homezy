import { EN_A } from './a';
import { EN_B } from './b';

/** Türkçe metin → İngilizce. `{}` değişken yeridir (sırayla). a.ts önce gelir, b.ts yalnızca eksikleri tamamlar. */
export const EN: Record<string, string> = { ...EN_B, ...EN_A };
