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
  const isViewingDependentProfile = activeProfile?.kind === 'guardian' && activeProfile.entityType === 'student';
  // Responsável "puro" (role literal 'guardian', sem ficha própria) sem nenhum dependente para
  // exibir não tem dashboard geral — vai para o perfil. Havendo um dependente ativo (o caso normal,
  // já que é o único perfil disponível para essa conta), o DashboardView renderiza a dashboard dele.
  if (user.role === 'guardian' && !isViewingDependentProfile) return <Navigate to="/profile" replace />;
  return <DashboardView user={user as any} academy={academy as any} />;
};

export default DashboardPage;
