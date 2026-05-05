import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StorageService } from '../../services/storage';
import { User, Academy } from '../../types';
import { MOCK_ACADEMY, MOCK_USER, MOCK_STUDENTS, MOCK_CLASSES, MOCK_TEMPLATES, MOCK_ATTENDANCE } from '../../services/mockData';
import Input from '../../components/common/Input';
import { Mail, Lock, ArrowRight, Eye, EyeOff, Info, Award } from 'lucide-react';
import AuthLayout from './AuthLayout';

interface LoginFormProps {
  onLogin: (user: User, academy: Academy) => void;
  showNotification: (message: string, type: 'success' | 'error') => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, showNotification }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@oss.com');
  const [password, setPassword] = useState('oss123');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const users = StorageService.getUsers();
    let foundUser = users.find(u => u.email === email && u.password === password);

    if (!foundUser && email === 'admin@oss.com' && password === 'oss123') {
      if (users.length === 0) {
        StorageService.saveStudents(MOCK_STUDENTS);
        StorageService.saveTemplates(MOCK_TEMPLATES);
        StorageService.saveClasses(MOCK_CLASSES);
        StorageService.saveAttendance(MOCK_ATTENDANCE);
        StorageService.saveUsers([MOCK_USER]);
      }
      foundUser = MOCK_USER;
    }

    if (!foundUser) {
      showNotification("E-mail ou senha incorretos.", 'error');
      return;
    }

    if (foundUser.status === 'Pending' && foundUser.role !== 'admin' && foundUser.role !== 'superuser') {
      showNotification("Seu acesso ainda está pendente de aprovação. OSS!", 'error');
      return;
    }

    const academy = StorageService.getAcademyById(foundUser.academyId) || StorageService.getAcademy();
    onLogin(foundUser, academy || MOCK_ACADEMY);
    navigate('/');
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
          <button type="submit" className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 active:scale-95">
            Entrar no Tatame <ArrowRight size={20} />
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
