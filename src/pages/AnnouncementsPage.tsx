/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import AnnouncementsView from '../../views/AnnouncementsView';

const AnnouncementsPage: React.FC = () => {
  const { user, academy } = useAuthStore();
  if (!user || !academy) return null;
  return <AnnouncementsView user={user as any} academy={academy as any} />;
};

export default AnnouncementsPage;
