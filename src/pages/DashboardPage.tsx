/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardView from '../../views/DashboardView';

const DashboardPage: React.FC = () => {
  const { user, academy } = useAuthStore();
  if (!user) return null;
  // Responsável "puro" (role literal 'guardian', sem ficha própria) não tem dashboard geral —
  // vai direto para o perfil do dependente. Contas com ficha própria (student, instructor, etc.)
  // que estejam gerenciando um dependente continuam em "/": o DashboardView já renderiza a
  // dashboard do dependente nesse caso (ver `isViewingDependentProfile`).
  if (user.role === 'guardian') return <Navigate to="/profile" replace />;
  return <DashboardView user={user as any} academy={academy as any} />;
};

export default DashboardPage;
