import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Language } from '@/types';

interface SettingsStore {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      language: 'pt',
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'nexdojo-settings',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
