import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/common/Input';
import { Mail, Lock, ArrowRight, Eye, EyeOff, Info, Loader2 } from 'lucide-react';
import AuthLayout from './AuthLayout';
import { MOCK_ACADEMY } from '../../services/mockData';

interface LoginFormProps {
  showNotification: (message: string, type: 'success' | 'error') => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ showNotification }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@oss.com');
  const [password, setPassword] = useState('oss123');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      showNotification(err.message || 'E-mail ou senha incorretos.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout showLogo={true} academyName={MOCK_ACADEMY.name} academyLogo={MOCK_ACADEMY.logo}>
      <div className="max-w-md mx-auto space-y-6 w-full pb-10">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex items-start gap-3">
          <div className="bg-amber-500/20 p-2 rounded-xl"><Info className="text-amber-500" size={20} /></div>
          <div>
            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Modo Demonstração</p>
            <p className="text-xs text-slate-400 mt-1 italic">Utilize admin@oss.com / oss123</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="bg-white dark:bg-slate-900 rounded-[40px] p-8 md:p-10 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-300">
          <h2 className="text-2xl font-black text-slate-800 dark:text-white text-center tracking-tight">Acesse seu Portal</h2>
          <div className="space-y-4">
            <Input label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="professor@oss.com" icon={<Mail size={18} />} />
            <div className="relative">
              <Input label="Senha" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" icon={<Lock size={18} />} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-[38px] text-slate-400 hover:text-indigo-600 transition-colors">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-70 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            {isSubmitting ? <><Loader2 size={20} className="animate-spin" /> Entrando...</> : <>Entrar no Tatame <ArrowRight size={20} /></>}
          </button>
          <div className="pt-2 flex flex-col items-center gap-3">
            <button type="button" onClick={() => navigate('/esqueci-senha')} className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">Esqueci minha senha</button>
            <button type="button" onClick={() => navigate('/cadastro')} className="text-sm font-bold text-indigo-600 hover:text-indigo-400 transition-colors">Novo por aqui? Cadastre-se</button>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
};

export default LoginForm;
