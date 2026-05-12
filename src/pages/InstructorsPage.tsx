/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import InstructorsView from '../../views/InstructorsView';

const InstructorsPage: React.FC = () => {
  const { user, academy } = useAuthStore();
  if (!user || !academy) return null;
  return <InstructorsView user={user as any} academy={academy as any} />;
};

export default InstructorsPage;
