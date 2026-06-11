import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setApiToken, setUnauthorizedHandler } from '@/lib/api';
import type { User, Academy } from '@/types';

interface AuthStore {
  user: User | null;
  token: string | null;
  academy: Academy | null;
  isAuthenticated: boolean;
  lastAcademyAlias: string | null;
  justLoggedOut: boolean;
  login: (user: User, token: string, academy: Academy | null) => void;
  logout: () => void;
  setAcademy: (academy: Academy) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      academy: null,
      isAuthenticated: false,
      lastAcademyAlias: null,
      justLoggedOut: false,

      login: (user, token, academy) => {
        setApiToken(token);
        set({
          user, token, academy, isAuthenticated: true, justLoggedOut: false,
          ...(academy?.alias ? { lastAcademyAlias: academy.alias } : {}),
        });
      },

      logout: () => {
        setApiToken(null);
        // justLoggedOut enables alias redirect only on explicit logout, not direct navigation
        set({ user: null, token: null, academy: null, isAuthenticated: false, justLoggedOut: true });
      },

      setAcademy: (academy) => {
        set({ academy, ...(academy.alias ? { lastAcademyAlias: academy.alias } : {}) });
        if (get().user?.role === 'superuser') {
          localStorage.setItem('nexdojo_last_academy', academy.id);
        }
      },
    }),
    {
      name: 'nexdojo-auth',
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setApiToken(state.token);
        }
        if (state) {
          state.justLoggedOut = false;
        }
        setUnauthorizedHandler(() => {
          useAuthStore.getState().logout();
        });
      },
    },
  ),
);
