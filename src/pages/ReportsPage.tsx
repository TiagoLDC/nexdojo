/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import ReportsView from '../../views/ReportsView';

const ReportsPage: React.FC = () => {
  const { user, academy } = useAuthStore();
  if (!user || !academy) return null;
  return <ReportsView user={user as any} academy={academy as any} />;
};

export default ReportsPage;
