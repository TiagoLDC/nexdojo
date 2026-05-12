/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTranslation } from '../../services/LanguageContext';
import SettingsView from '../../views/SettingsView';
import type { Language } from '../../types';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, academy, logout, setAcademy } = useAuthStore();
  const { theme, toggleTheme, accentColor, setAccentColor } = useUIStore();
  const { setLanguage: setZustandLanguage } = useSettingsStore();
  const { language, setLanguage } = useTranslation();

  if (!user || !academy) return null;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setZustandLanguage(lang);
  };

  return (
    <SettingsView
      user={user as any}
      academy={academy as any}
      onLogout={handleLogout}
      theme={theme}
      onToggleTheme={toggleTheme}
      language={language}
      onLanguageChange={handleLanguageChange}
      onUpdateAcademy={(updated) => setAcademy(updated as any)}
      accentColor={accentColor}
      onAccentColorChange={setAccentColor}
    />
  );
};

export default SettingsPage;
