import React from 'react';
import { Award } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  showLogo?: boolean;
  academyName?: string;
  academyLogo?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, showLogo = false, academyName, academyLogo }) => {
  return (
    <div className="w-full max-w-5xl space-y-8 py-10">
      {showLogo && (
        <div className="text-center animate-in fade-in duration-700">
          <div className="inline-flex items-center justify-center w-28 h-28 bg-indigo-600 rounded-[32px] mb-6 shadow-2xl shadow-indigo-600/30 overflow-hidden ring-4 ring-slate-800/50">
            {academyLogo ? (
              <img src={academyLogo} alt="Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <Award className="text-white" size={40} />
            )}
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">{academyName}</h1>
          <p className="text-slate-400 mt-3 font-bold text-xs uppercase tracking-[0.3em] opacity-80">O LEGADO CONTINUA</p>
        </div>
      )}
      {children}
      <p className="text-center text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">{academyName} • O LEGADO CONTINUA</p>
    </div>
  );
};

export default AuthLayout;
