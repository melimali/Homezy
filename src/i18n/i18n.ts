import { useStore } from '@/store/AppStore';
import { DICTIONARY, type Lang } from './translations';

export function useTranslation() {
  const { state } = useStore();
  const code = state?.settings?.language ?? 'tr';
  // Desteklenen diller Türkçe, İngilizce ve Korece; diğer her şey İngilizce görünür.
  const lang: Lang = code === 'tr' ? 'tr' : code === 'ko' ? 'ko' : 'en';

  const t = (key: string): string => DICTIONARY[lang]?.[key] ?? DICTIONARY['tr']?.[key] ?? key;

  return { t, lang };
}
