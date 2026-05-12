import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppLayout } from '@/components/layout';

export const AppLayoutRoute: React.FC = () => (
  <AppLayout>
    <Outlet />
  </AppLayout>
);
