/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore, getActiveProfile } from '@/stores/profileStore';
import DashboardView from '../../views/DashboardView';

const DashboardPage: React.FC = () => {
  const { user, academy } = useAuthStore();
  const { profiles, activeProfileId } = useProfileStore();
  if (!user) return null;
  const activeProfile = getActiveProfile(profiles, activeProfileId);
  // Responsável "puro" (sem ficha própria) não tem dashboard geral — vai direto para o perfil do
  // dependente. Vale tanto para role literal 'guardian' quanto para qualquer conta (ex.: instrutor)
  // sem ficha de aluno própria que esteja gerenciando um dependente-aluno no momento.
  const noOwnDashboard = user.role === 'guardian' || (activeProfile?.kind === 'guardian' && user.role !== 'student');
  if (noOwnDashboard) return <Navigate to="/profile" replace />;
  return <DashboardView user={user as any} academy={academy as any} />;
};

export default DashboardPage;
