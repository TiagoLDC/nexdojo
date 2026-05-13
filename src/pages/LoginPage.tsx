/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import LoginView from '../../views/LoginView';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleLogin = (user: any, token: string, academy: any) => {
    login(user, token, academy);
    navigate('/', { replace: true });
  };

  return <LoginView onLogin={handleLogin} />;
};

export default LoginPage;
