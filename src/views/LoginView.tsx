import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { User, Academy } from '../types';
import { StorageService } from '../services/storage';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import LoginForm from './auth/LoginForm';
import ForgotPassword from './auth/ForgotPassword';
import SignupChoice from './auth/SignupChoice';
import SignupAcademy from './auth/SignupAcademy';
import SignupStudent from './auth/SignupStudent';

interface LoginViewProps {
  onLogin: (user: User, academy: Academy) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const location = useLocation();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isFromSharedLink, setIsFromSharedLink] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const academyIdFromUrl = params.get('academyId');
    if (academyIdFromUrl) {
      const found = StorageService.getAcademyById(academyIdFromUrl);
      if (found) {
        setIsFromSharedLink(true);
      }
    }
  }, [location]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const renderView = () => {
    switch (location.pathname) {
      case '/login':
        return <LoginForm onLogin={onLogin} showNotification={showNotification} />;
      case '/esqueci-senha':
        return <ForgotPassword showNotification={showNotification} />;
      case '/cadastro':
        return <SignupChoice isFromSharedLink={isFromSharedLink} />;
      case '/cadastro/academia':
        return <SignupAcademy onLogin={onLogin} showNotification={showNotification} />;
      case '/cadastro/aluno':
      case '/cadastro/instrutor': 
        return <SignupStudent showNotification={showNotification} />;
      default:
        return <LoginForm onLogin={onLogin} showNotification={showNotification} />;
    }
  };

  return (
    <div className="min-h-[100dvh] h-[100dvh] overflow-y-auto bg-slate-900 flex flex-col items-center justify-start py-8 px-4 transition-colors relative custom-scrollbar">
      {toast && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top duration-300 ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold text-sm tracking-tight">{toast.message}</span>
        </div>
      )}
      
      {renderView()}
    </div>
  );
};

export default LoginView;
