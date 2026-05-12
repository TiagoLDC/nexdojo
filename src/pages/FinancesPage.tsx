/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import FinancesView from '../../views/FinancesView';

const FinancesPage: React.FC = () => {
  const { user, academy } = useAuthStore();
  if (!user || !academy) return null;
  return <FinancesView user={user as any} academy={academy as any} />;
};

export default FinancesPage;
