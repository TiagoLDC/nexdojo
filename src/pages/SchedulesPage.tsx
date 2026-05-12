/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import SchedulesView from '../../views/SchedulesView';

const SchedulesPage: React.FC = () => {
  const { user, academy } = useAuthStore();
  if (!user) return null;
  return <SchedulesView user={user as any} academy={academy as any} />;
};

export default SchedulesPage;
