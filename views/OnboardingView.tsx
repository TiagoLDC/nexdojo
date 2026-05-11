
import React, { useState } from 'react';
import { Academy, User } from '../types';
import { Trophy, ArrowRight, ShieldCheck } from 'lucide-react';

interface OnboardingViewProps {
  onComplete: (academy: Academy, user: User) => void;
}

const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [academyName, setAcademyName] = useState('');
  const [academyLogo, setAcademyLogo] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setAcademyLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
    if (step < 2) setStep(step + 1);
    else {
      const academyId = Math.random().toString(36).substr(2, 9);
      const userId = Math.random().toString(36).substr(2, 9);
      
      const newAcademy: Academy = {
        id: academyId,
        name: academyName,
        logo: academyLogo,
        ownerName: userName,
        email: email
      };

      // Added missing email property
      const newUser: User = {
        id: userId,
        academyId: academyId,
        role: 'admin',
        name: userName,
        email: email,
        status: 'Active'
      };

      onComplete(newAcademy, newUser);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-24 h-24 bg-indigo-600 rounded-[32px] mb-6 shadow-2xl shadow-indigo-600/30 overflow-hidden ring-4 ring-slate-800/50 flex items-center justify-center">
            {academyLogo ? (
              <img 
                src={academyLogo} 
                alt="Logo Preview" 
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <Trophy size={48} className="text-white opacity-80" />
            )}
          </div>
          <h1 className="text-3xl font-black tracking-tight uppercase italic leading-none">{academyName || 'NexDojo'}</h1>
          <p className="text-slate-400 mt-3 font-bold text-xs uppercase tracking-[0.3em] opacity-80">A evolução do seu tatame começa aqui.</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-3xl border border-slate-700 shadow-xl">
          {step === 1 ? (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold">Boas-vindas!</h2>
                <p className="text-slate-400 text-sm">Vamos configurar sua academia.</p>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 mb-4">
                  <label className="w-24 h-24 rounded-2xl bg-slate-900 border-2 border-dashed border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 transition-colors">
                    {academyLogo ? (
                      <img src={academyLogo} className="w-full h-full object-contain p-2" />
                    ) : (
                      <>
                        <Trophy size={24} className="text-slate-600" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase mt-1">Logo</span>
                      </>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  </label>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Toque para enviar logotipo</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Nome da Academia</label>
                  <input 
                    type="text" 
                    value={academyName}
                    onChange={(e) => setAcademyName(e.target.value)}
                    placeholder="Ex: CT CASA DO PAI"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold">Seu Perfil</h2>
                <p className="text-slate-400 text-sm">Quase lá, Professor(a).</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Seu Nome Completo</label>
                  <input 
                    type="text" 
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Ex: Hélio Gracie"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase mb-1">E-mail de Acesso</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@academia.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          <button 
            onClick={handleNext}
            disabled={step === 1 ? !academyName : (!userName || !email)}
            className="w-full mt-8 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
          >
            {step === 1 ? 'Próximo' : 'Finalizar Cadastro'}
            <ArrowRight size={20} />
          </button>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-slate-500 text-sm">
          <ShieldCheck size={16} />
          <span>Seus dados estão protegidos</span>
        </div>
      </div>
    </div>
  );
};

export default OnboardingView;