/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import InventoryView from '../../views/InventoryView';

const InventoryPage: React.FC = () => {
  const { user, academy } = useAuthStore();
  if (!user || !academy) return null;
  return <InventoryView user={user as any} academy={academy as any} />;
};

export default InventoryPage;
