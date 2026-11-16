import { TMZ_PT } from '../tmz';
import { PT_1 } from './pt1';
import { PT_2 } from './pt2';
import { PT_3 } from './pt3';
import { PT_4 } from './pt4';

export const PT: Record<string, string> = { ...PT_1, ...PT_2, ...PT_3, ...PT_4, ...TMZ_PT };
