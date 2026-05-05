import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const useTheme = () => {
  const { theme, accentColor } = useAuth();

  useEffect(() => {
    const colorPalettes: Record<string, { base: string; shades: Record<number, string> }> = {
      branco: {
        base: '#94a3b8',
        shades: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' }
      },
      azul: {
        base: '#2563eb',
        shades: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554' }
      },
      roxo: {
        base: '#9333ea',
        shades: { 50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe', 400: '#c084fc', 500: '#a855f7', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87', 950: '#3b0764' }
      },
      marrom: {
        base: '#5c4033',
        shades: { 50: '#fdfcfb', 100: '#f7f2ef', 200: '#efdfd6', 300: '#dec0b0', 400: '#bd927b', 500: '#9b6e5d', 700: '#7a5142', 800: '#5c4033', 900: '#4a332a', 950: '#2d1f19' }
      },
      preto: {
        base: '#0f172a',
        shades: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' }
      },
      cinza: {
        base: '#64748b',
        shades: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' }
      },
      amarelo: {
        base: '#eab308',
        shades: { 50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047', 400: '#facc15', 500: '#eab308', 700: '#a16207', 800: '#854d0e', 900: '#713f12', 950: '#422006' }
      },
      laranja: {
        base: '#f97316',
        shades: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12', 950: '#431407' }
      },
      verde: {
        base: '#10b981',
        shades: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22' }
      },
      indigo: {
        base: '#4f46e5',
        shades: { 50: '#f5f3ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 700: '#4338ca', 800: '#3730a3', 900: '#1e1b4b', 950: '#0f172a' }
      }
    };

    const palette = colorPalettes[accentColor] || colorPalettes.indigo;
    document.documentElement.style.setProperty('--primary-accent-color', palette.base);
    Object.entries(palette.shades).forEach(([shade, value]) => {
      document.documentElement.style.setProperty(`--primary-accent-${shade}`, value);
    });
  }, [accentColor]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#020617';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f8fafc';
    }
  }, [theme]);
};
