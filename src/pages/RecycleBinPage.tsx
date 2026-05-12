/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import RecycleBinView from '../../views/RecycleBinView';

const RecycleBinPage: React.FC = () => {
  const { user, academy } = useAuthStore();
  if (!user || !academy) return null;
  return <RecycleBinView user={user as any} academy={academy as any} />;
};

export default RecycleBinPage;
