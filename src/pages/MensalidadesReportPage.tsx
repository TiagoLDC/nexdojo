/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import MensalidadesReportView from '../../views/MensalidadesReportView';

const MensalidadesReportPage: React.FC = () => {
  const { user, academy } = useAuthStore();
  if (!user || !academy) return null;
  return <MensalidadesReportView user={user as any} academy={academy as any} />;
};

export default MensalidadesReportPage;
