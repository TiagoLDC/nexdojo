import { getTranslation } from '@/lib/translations';
import { useSettingsStore } from '@/stores';

export const useTranslation = () => {
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  return {
    language,
    setLanguage,
    t: getTranslation(language),
  };
};
