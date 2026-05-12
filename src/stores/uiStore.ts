import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { COLOR_PALETTES } from '@/utils/constants';

const applyTheme = (theme: 'light' | 'dark') => {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    document.body.style.backgroundColor = '#020617';
  } else {
    document.documentElement.classList.remove('dark');
    document.body.style.backgroundColor = '#f8fafc';
  }
};

const applyAccentColor = (color: string) => {
  const palette = COLOR_PALETTES[color] ?? COLOR_PALETTES['indigo'];
  document.documentElement.style.setProperty('--primary-accent-color', palette.base);
  Object.entries(palette.shades).forEach(([shade, value]) => {
    document.documentElement.style.setProperty(`--primary-accent-${shade}`, value);
  });
};

export type ToastType = 'success' | 'error' | 'delete' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface UIStore {
  theme: 'light' | 'dark';
  accentColor: string;
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  toast: Toast | null;

  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setAccentColor: (color: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
  initDisplay: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      theme: 'light',
      accentColor: 'indigo',
      sidebarCollapsed: false,
      mobileMenuOpen: false,
      toast: null,

      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },

      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        applyTheme(next);
        set({ theme: next });
      },

      setAccentColor: (color) => {
        applyAccentColor(color);
        set({ accentColor: color });
      },

      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),

      showToast: (message, type = 'success') => {
        const id = Math.random().toString(36).slice(2);
        set({ toast: { id, message, type } });
        setTimeout(() => {
          if (get().toast?.id === id) set({ toast: null });
        }, 3000);
      },

      hideToast: () => set({ toast: null }),

      initDisplay: () => {
        const { theme, accentColor } = get();
        applyTheme(theme);
        applyAccentColor(accentColor);
      },
    }),
    {
      name: 'nexdojo-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ theme: state.theme, accentColor: state.accentColor }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
          applyAccentColor(state.accentColor);
        }
      },
    },
  ),
);
