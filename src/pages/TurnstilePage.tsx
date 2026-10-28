/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import TurnstileView from '../../views/TurnstileView';

const TurnstilePage: React.FC = () => {
  const { user, academy } = useAuthStore();
  if (!user || !academy) return null;
  // Módulo desligado em Configurações → Módulos: a página não existe para esta academia.
  if (!(academy as any).turnstileEnabled) return <Navigate to="/" replace />;
  return <TurnstileView user={user as any} academy={academy as any} />;
};

export default TurnstilePage;
