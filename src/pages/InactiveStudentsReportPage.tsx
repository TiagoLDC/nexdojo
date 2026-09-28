/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import InactiveStudentsReportView from '../../views/InactiveStudentsReportView';

const InactiveStudentsReportPage: React.FC = () => {
  const { user, academy } = useAuthStore();
  if (!user || !academy) return null;
  return <InactiveStudentsReportView user={user as any} academy={academy as any} />;
};

export default InactiveStudentsReportPage;
