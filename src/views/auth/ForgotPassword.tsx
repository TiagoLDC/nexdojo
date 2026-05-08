import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import AuthLayout from './AuthLayout';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();

  return (
    <AuthLayout showLogo={true} academyName="NexDojo" academyLogo="https://images.unsplash.com/photo-1552072092-7f9b8d63efcb?q=80&w=400&h=400&auto=format&fit=crop">
      <div className="max-w-md mx-auto space-y-6 animate-in fade-in zoom-in duration-300">
        <button onClick={() => navigate('/login')} className="text-white flex items-center gap-2 mb-4 hover:text-indigo-400 transition-colors font-bold text-xs uppercase tracking-[0.2em]">
          <ChevronLeft size={18} /> Voltar ao Login
        </button>
        <div className="bg-white dark:bg-slate-900 rounded-[40px] p-8 md:p-10 shadow-2xl space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center text-indigo-600">
              <ShieldCheck size={32} />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Recuperar Senha</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Para redefinir sua senha, entre em contato com o administrador da sua academia. Ele poderá gerar um novo acesso para você.
            </p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;
