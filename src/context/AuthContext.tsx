import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Academy, Language } from '../types';
import { StorageService } from '../services/storage';
import { ApiService } from '../services/api';

interface AuthContextType {
  user: User | null;
  academy: Academy | null;
  language: Language;
  theme: 'light' | 'dark';
  accentColor: string;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginDirect: (user: User, academy: Academy) => void;
  logout: () => void;
  setLanguage: (lang: Language) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setAccentColor: (color: string) => void;
  switchAcademy: (academy: Academy) => void;
  updateAcademy: (academy: Academy) => void;
  academies: Academy[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [academy, setAcademy] = useState<Academy | null>(null);
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [language, setLanguageState] = useState<Language>(StorageService.getLanguage());
  const [theme, setThemeState] = useState<'light' | 'dark'>(StorageService.getTheme());
  const [accentColor, setAccentColorState] = useState<string>(StorageService.getAccentColor());

  // ── Restaura sessão ao iniciar ──────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const token = ApiService.getToken();
      const savedUser = StorageService.getCurrentUser();
      const savedAcademy = StorageService.getAcademy();

      if (token && savedUser) {
        setUser(savedUser);
        setAcademy(savedAcademy);

        // Fetch all academies if superuser
        if (savedUser.role === 'superuser') {
          try {
            const list = await ApiService.getAcademies();
            setAcademies(list);
            StorageService.saveAcademies(list);
          } catch (e) {
            console.error('Error fetching academies', e);
            // Fallback to storage
            setAcademies(StorageService.getAcademies());
          }
        }

        // Refresh active academy from DB to catch updates
        if (savedAcademy) {
          try {
            const freshAcademy = await ApiService.getAcademy(savedAcademy.id);
            setAcademy(freshAcademy);
            StorageService.saveAcademy(freshAcademy);
          } catch (e) {
            console.error('Error refreshing academy', e);
          }
        }
      } else {
        // Not logged in, but might have academies cached in storage
        setAcademies(StorageService.getAcademies());
      }

      setIsLoading(false);
    };
    init();
  }, []);

  // ── Login via API (novo fluxo) ─────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<void> => {
    const data = await ApiService.login(email, password);
    const loggedUser: User = data.user;
    const loggedAcademy: Academy = data.academy;

    setUser(loggedUser);
    setAcademy(loggedAcademy);

    // Fetch all academies if superuser
    if (loggedUser.role === 'superuser') {
      try {
        const list = await ApiService.getAcademies();
        setAcademies(list);
        StorageService.saveAcademies(list);
      } catch (e) {
        console.error('Error fetching academies on login', e);
        setAcademies(StorageService.getAcademies());
      }
    }

    // Persiste localmente para restaurar a sessão no próximo acesso
    StorageService.saveCurrentUser(loggedUser);
    if (loggedAcademy) StorageService.saveAcademy(loggedAcademy);
  };

  // ── Login direto para fluxos de cadastro (legacy) ──────────────────────────
  const loginDirect = (loggedUser: User, loggedAcademy: Academy) => {
    setUser(loggedUser);
    setAcademy(loggedAcademy);
    StorageService.saveCurrentUser(loggedUser);
    StorageService.saveAcademy(loggedAcademy);
  };

  const logout = () => {
    ApiService.clearToken();
    StorageService.clear();
    setAcademy(null);
    setUser(null);
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    StorageService.saveLanguage(lang);
  };

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    StorageService.saveTheme(newTheme);
  };

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
    StorageService.saveAccentColor(color);
  };

  const switchAcademy = (newAcademy: Academy) => {
    setAcademy(newAcademy);
    StorageService.saveAcademy(newAcademy);
    localStorage.setItem('oss_last_superuser_academy', newAcademy.id);
  };

  const updateAcademy = (updatedAcademy: Academy) => {
    setAcademy(updatedAcademy);
    StorageService.saveAcademy(updatedAcademy);
  };

  return (
    <AuthContext.Provider value={{
      user, academy, academies, language, theme, accentColor, isLoading,
      login, loginDirect, logout,
      setLanguage, setTheme, setAccentColor, switchAcademy, updateAcademy
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
