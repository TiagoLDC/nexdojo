/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import KimonoLoanView from '../../views/KimonoLoanView';

const KimonoLoansPage: React.FC = () => {
  const { user, academy } = useAuthStore();
  if (!user || !academy) return null;
  if (!academy.kimonoLoanEnabled) return <Navigate to="/" replace />;
  return <KimonoLoanView user={user as any} academy={academy as any} />;
};

export default KimonoLoansPage;
