/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import DashboardView from '../../views/DashboardView';

const DashboardPage: React.FC = () => {
  const { user, academy } = useAuthStore();
  if (!user) return null;
  return <DashboardView user={user as any} academy={academy as any} />;
};

export default DashboardPage;
