/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import StudentsView from '../../views/StudentsView';

const StudentsPage: React.FC = () => {
  const { user, academy } = useAuthStore();
  if (!user || !academy) return null;
  return <StudentsView user={user as any} academy={academy as any} />;
};

export default StudentsPage;
