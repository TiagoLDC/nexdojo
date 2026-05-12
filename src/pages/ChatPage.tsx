/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import ChatView from '../../views/ChatView';

const ChatPage: React.FC = () => {
  const { user, academy } = useAuthStore();
  if (!user || !academy) return null;
  return <ChatView user={user as any} academy={academy as any} />;
};

export default ChatPage;
