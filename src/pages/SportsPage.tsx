import React from 'react';

import { useAuthStore } from '@/stores/authStore';
import SportsView from '../../views/SportsView';

const SportsPage: React.FC = () => {
  const { user } = useAuthStore();

  if (!user) return null;

  return <SportsView user={user as any} />;
};

export default SportsPage;
