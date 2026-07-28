/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore, getActiveProfile } from '@/stores/profileStore';
import { Spinner } from '@/components/ui';
import DashboardView from '../../views/DashboardView';

const DashboardPage: React.FC = () => {
  const { user, academy } = useAuthStore();
  const { profiles, activeProfileId, profilesLoaded } = useProfileStore();
  if (!user) return null;

  // Responsável "puro" (role literal 'guardian') depende do GET /auth/profiles (assíncrono, feito
  // no AppLayout) para saber se tem um dependente ativo. Decidir o redirect antes dessa resposta
  // chegar mandava a conta pra /profile mesmo quando ela tinha uma dashboard de dependente pra ver.
  if (user.role === 'guardian' && !profilesLoaded) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <Spinner size="lg" className="text-indigo-500" />
      </div>
    );
  }

  const activeProfile = getActiveProfile(profiles, activeProfileId);
  const isViewingDependentProfile = activeProfile?.kind === 'guardian' && activeProfile.entityType === 'student';
  // Responsável "puro" sem nenhum dependente para exibir não tem dashboard geral — vai para o
  // perfil. Havendo um dependente ativo (o caso normal, já que é o único perfil disponível para
  // essa conta), o DashboardView renderiza a dashboard dele.
  if (user.role === 'guardian' && !isViewingDependentProfile) return <Navigate to="/profile" replace />;
  return <DashboardView user={user as any} academy={academy as any} />;
};

export default DashboardPage;
