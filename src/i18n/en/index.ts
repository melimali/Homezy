import { EN_A } from './a';
import { EN_B } from './b';
import { EN_C } from './c';
import { EN_D } from './d';
import { EN_E } from './e';
import { EN_F } from './f';
import { EN_G } from './g';
import { EN_H } from './h';
import { EN_I } from './i';
import { EN_J } from './j';
import { EN_K } from './k';
import { EN_L } from './l';
import { EN_M } from './m';
import { EN_N } from './n';
import { EN_O } from './o';
import { EN_P } from './p';
import { EN_Q } from './q';

/** Türkçe metin → İngilizce. `{}` değişken yeridir (sırayla). a.ts önce gelir, b.ts yalnızca eksikleri tamamlar. */
export const EN: Record<string, string> = { ...EN_M, ...EN_K, ...EN_J, ...EN_B, ...EN_C, ...EN_D, ...EN_E, ...EN_F, ...EN_G, ...EN_H, ...EN_I, ...EN_A, ...EN_L, ...EN_N, ...EN_O, ...EN_P, ...EN_Q };
