/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import UsersView from '../../views/UsersView';

const UsersPage: React.FC = () => {
  const { user, academy } = useAuthStore();
  if (!user || !academy) return null;
  return <UsersView user={user as any} academy={academy as any} />;
};

export default UsersPage;
