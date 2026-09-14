/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import AbsenceJustificationsView from '../../views/AbsenceJustificationsView';

const AbsenceJustificationsPage: React.FC = () => {
  const { user, academy } = useAuthStore();
  if (!user || !academy) return null;
  return <AbsenceJustificationsView user={user as any} academy={academy as any} />;
};

export default AbsenceJustificationsPage;
