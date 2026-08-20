/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore, getActiveProfile } from '@/stores/profileStore';
import { Spinner } from '@/components/ui';
import DashboardViewNovo from '../../views/DashboardViewNovo';

// Versão em teste do dashboard (layout compacto) — comparar com a rota "/" enquanto o
// usuário decide se substitui o dashboard atual. Ver views/DashboardViewNovo.tsx.
const DashboardPageNovo: React.FC = () => {
  const { user, academy } = useAuthStore();
  const { profiles, activeProfileId, profilesLoaded } = useProfileStore();
  if (!user) return null;

  if (user.role === 'guardian' && !profilesLoaded) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <Spinner size="lg" className="text-indigo-500" />
      </div>
    );
  }

  const activeProfile = getActiveProfile(profiles, activeProfileId);
  const isViewingDependentProfile = activeProfile?.kind === 'guardian' && activeProfile.entityType === 'student';
  if (user.role === 'guardian' && !isViewingDependentProfile) return <Navigate to="/profile" replace />;
  return <DashboardViewNovo user={user as any} academy={academy as any} />;
};

export default DashboardPageNovo;
