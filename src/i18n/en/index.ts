import { EN_A } from './a';
import { EN_B } from './b';
import { EN_C } from './c';
import { EN_D } from './d';

/** Türkçe metin → İngilizce. `{}` değişken yeridir (sırayla). a.ts önce gelir, b.ts yalnızca eksikleri tamamlar. */
export const EN: Record<string, string> = { ...EN_B, ...EN_C, ...EN_D, ...EN_A };
