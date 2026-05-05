import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Academy, Language } from '../types';
import { StorageService } from '../services/storage';
import { MOCK_ACADEMY } from '../services/mockData';

interface AuthContextType {
  user: User | null;
  academy: Academy | null;
  language: Language;
  theme: 'light' | 'dark';
  accentColor: string;
  login: (user: User, academy: Academy) => void;
  logout: () => void;
  setLanguage: (lang: Language) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setAccentColor: (color: string) => void;
  switchAcademy: (academy: Academy) => void;
  updateAcademy: (academy: Academy) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(StorageService.getCurrentUser());
  const [academy, setAcademy] = useState<Academy | null>(() => {
    const currentUser = StorageService.getCurrentUser();
    if (!currentUser) return null;
    if (currentUser.role === 'superuser') {
      const savedAcadId = localStorage.getItem('oss_last_superuser_academy');
      if (savedAcadId) {
        const found = StorageService.getAcademyById(savedAcadId);
        if (found) return found;
      }
      return StorageService.getAcademy() || StorageService.getAcademies()[0] || null;
    }
    return StorageService.getAcademyById(currentUser.academyId);
  });
  
  const [language, setLanguageState] = useState<Language>(StorageService.getLanguage());
  const [theme, setThemeState] = useState<'light' | 'dark'>(StorageService.getTheme());
  const [accentColor, setAccentColorState] = useState<string>(StorageService.getAccentColor());

  const login = (loggedUser: User, currentAcademy: Academy) => {
    setUser(loggedUser);
    
    let academyToSet = currentAcademy;
    if (loggedUser.role === 'superuser') {
      const allAcademies = StorageService.getAcademies();
      const savedAcadId = localStorage.getItem('oss_last_superuser_academy');
      academyToSet = allAcademies.find(a => a.id === savedAcadId) || allAcademies[0] || MOCK_ACADEMY;
    }

    setAcademy(academyToSet);
    StorageService.saveCurrentUser(loggedUser);
    StorageService.saveAcademy(academyToSet);
  };

  const logout = () => {
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
      user, academy, language, theme, accentColor,
      login, logout, setLanguage, setTheme, setAccentColor, switchAcademy, updateAcademy 
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
