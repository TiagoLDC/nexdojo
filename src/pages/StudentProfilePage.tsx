/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import StudentProfileView from '../../views/StudentProfileView';

const StudentProfilePage: React.FC = () => {
  const { user, academy } = useAuthStore();
  if (!user || !academy) return null;
  return <StudentProfileView user={user as any} academy={academy as any} />;
};

export default StudentProfilePage;
