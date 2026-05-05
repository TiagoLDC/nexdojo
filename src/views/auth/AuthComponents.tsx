import React from 'react';

export const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2 mb-4">
    <div className="text-indigo-600 dark:text-indigo-400">{icon}</div>
    <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{title}</h3>
  </div>
);

export const ChoiceCard: React.FC<{ icon: React.ReactNode; title: string; desc: string; onClick: () => void }> = ({ icon, title, desc, onClick }) => (
  <button onClick={onClick} className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 text-left hover:scale-105 hover:shadow-2xl transition-all group border-b-8 border-b-transparent hover:border-b-indigo-500">
    <div className="bg-indigo-50 dark:bg-indigo-900/20 w-16 h-16 rounded-2xl flex items-center justify-center text-indigo-600 mb-8 group-hover:bg-indigo-600 group-hover:text-white transition-colors">{icon}</div>
    <h3 className="font-black text-slate-800 dark:text-white text-xl tracking-tighter mb-2">{title}</h3>
    <p className="text-sm text-slate-400 dark:text-slate-500 font-medium leading-relaxed">{desc}</p>
  </button>
);
