import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export const PrivateRoute: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const lastAcademyAlias = useAuthStore((s) => s.lastAcademyAlias);
  const location = useLocation();

  if (!isAuthenticated) {
    const loginPath = lastAcademyAlias ? `/login/${lastAcademyAlias}` : '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  return <Outlet />;
};
