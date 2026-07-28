import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore, getActiveProfile, getEffectiveRoles } from '@/stores/profileStore';
import type { UserRole } from '@/types';

interface RoleGuardProps {
  roles: UserRole[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ roles }) => {
  const user = useAuthStore((s) => s.user);
  const { profiles, activeProfileId } = useProfileStore();
  const activeProfile = getActiveProfile(profiles, activeProfileId);
  const effectiveRoles = user ? getEffectiveRoles(user.role, activeProfile) : [];

  if (!user || !effectiveRoles.some((r) => roles.includes(r as UserRole))) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
