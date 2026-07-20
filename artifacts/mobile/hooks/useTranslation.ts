import { useApp } from '@/contexts/AppContext';
import { tr, type Lang } from '@/constants/translations';

export function useTranslation() {
  const { storeSettings } = useApp();
  const lang = (storeSettings?.language ?? 'en') as Lang;
  const isRTL = lang === 'ar';

  const translate = (key: string, vars?: Record<string, string | number>) => tr(key, lang, vars);

  return { t: translate, lang, isRTL };
}
