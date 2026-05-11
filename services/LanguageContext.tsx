
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '../types';
import { StorageService } from './storage';
import { getTranslation } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: any;
  showNotification: (message: string, type?: 'success' | 'error' | 'delete' | 'info') => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(StorageService.getLanguage());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'delete' | 'info' } | null>(null);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    StorageService.saveLanguage(lang);
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'delete' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const t = getTranslation(language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, showNotification }}>
      {children}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top duration-300 ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 
          toast.type === 'error' ? 'bg-red-600 text-white' :
          toast.type === 'delete' ? 'bg-slate-800 text-white' : 'bg-blue-600 text-white'
        }`}>
          <span className="font-bold text-sm tracking-tight text-center">{toast.message}</span>
        </div>
      )}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
