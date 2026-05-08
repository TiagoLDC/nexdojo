import React from 'react';
import { Academy } from '../../types';
import { StorageService } from '../../services/storage';

interface PrintHeaderProps {
  title: string;
  academy?: Academy | null;
}

const PrintHeader: React.FC<PrintHeaderProps> = ({ title, academy: academyProp }) => {
  const academy = academyProp ?? StorageService.getAcademy();
  return (
    <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">{academy?.name || 'Academia'}</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{academy?.address || ''}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-black text-indigo-600 uppercase italic leading-none">{title}</h2>
          <p className="text-[10px] font-bold text-slate-400 mt-1">{new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
        </div>
      </div>
    </div>
  );
};

export default PrintHeader;
