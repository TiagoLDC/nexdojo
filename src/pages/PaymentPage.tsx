/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import PaymentView from '../../views/PaymentView';

const PaymentPage: React.FC = () => {
  const { user, academy } = useAuthStore();
  if (!user || !academy) return null;
  return <PaymentView user={user as any} academy={academy as any} />;
};

export default PaymentPage;
