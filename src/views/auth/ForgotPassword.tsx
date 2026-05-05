import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../../components/common/Input';
import { Mail, Send, ChevronLeft } from 'lucide-react';
import AuthLayout from './AuthLayout';
import { MOCK_ACADEMY } from '../../services/mockData';

interface ForgotPasswordProps {
  showNotification: (message: string, type: 'success' | 'error') => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ showNotification }) => {
  const navigate = useNavigate();
  const [forgotEmail, setForgotEmail] = useState('');

  return (
    <AuthLayout showLogo={true} academyName={MOCK_ACADEMY.name} academyLogo={MOCK_ACADEMY.logo}>
      <div className="max-w-md mx-auto space-y-6 animate-in fade-in zoom-in duration-300">
        <button onClick={() => navigate('/login')} className="text-white flex items-center gap-2 mb-4 hover:text-indigo-400 transition-colors font-bold text-xs uppercase tracking-[0.2em]">
          <ChevronLeft size={18} /> Voltar ao Login
        </button>
        <div className="bg-white dark:bg-slate-900 rounded-[40px] p-8 md:p-10 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Recuperar Senha</h2>
            <p className="text-sm text-slate-400 font-medium leading-relaxed">Insira seu e-mail cadastrado para receber as instruções de recuperação.</p>
          </div>
          <Input label="E-mail Cadastrado" type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="professor@oss.com" icon={<Mail size={18} />} />
          <button 
            onClick={() => {
              if (!forgotEmail) { showNotification("Insira seu e-mail.", 'error'); return; }
              showNotification("E-mail de recuperação enviado!", 'success');
              navigate('/login');
            }} 
            className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            Enviar Instruções <Send size={20} />
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;
