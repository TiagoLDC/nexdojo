/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import AttendanceView from '../../views/AttendanceView';

const AttendancePage: React.FC = () => {
  const { user, academy } = useAuthStore();
  if (!user || !academy) return null;
  return <AttendanceView user={user as any} academy={academy as any} />;
};

export default AttendancePage;
