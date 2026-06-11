import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export const PrivateRoute: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const lastAcademyAlias = useAuthStore((s) => s.lastAcademyAlias);
  const justLoggedOut = useAuthStore((s) => s.justLoggedOut);
  const location = useLocation();

  if (!isAuthenticated) {
    const loginPath = (justLoggedOut && lastAcademyAlias) ? `/login/${lastAcademyAlias}` : '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  return <Outlet />;
};
