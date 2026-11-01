// Web yakalamada çeviri yaması çalışmadığı için İngilizce ekranlar DOM'da bu işlevle çevrilir.
import { setLang, tx } from '@/i18n/runtime';
setLang('en');
(globalThis as unknown as { __tx: (s: string) => string }).__tx = tx;
