import { useStore } from '@/store/AppStore';
import { DICTIONARY, type Lang } from './translations';

export function useTranslation() {
  const { state } = useStore();
  const lang: Lang = state?.settings?.language ?? 'tr';

  const t = (key: string): string => {
    return DICTIONARY[lang]?.[key] ?? DICTIONARY['tr']?.[key] ?? key;
  };

  return { t, lang };
}
