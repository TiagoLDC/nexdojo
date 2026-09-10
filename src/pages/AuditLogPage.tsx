/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import AuditLogView from '../../views/AuditLogView';

const AuditLogPage: React.FC = () => {
  const { user, academy } = useAuthStore();
  if (!user || !academy) return null;
  return <AuditLogView user={user as any} academy={academy as any} />;
};

export default AuditLogPage;
