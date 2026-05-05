import React from 'react';
import { X as XIcon, UserCheck } from 'lucide-react';
import { User } from '../../types';
import { DetailItem } from './DashboardComponents';

interface PendingUserModalProps {
  selectedPending: { user: User; details: any };
  onClose: () => void;
  onApprove: (user: User) => void;
  onReject: (user: User) => void;
}

export const PendingUserModal: React.FC<PendingUserModalProps> = ({ 
  selectedPending, 
  onClose, 
  onApprove, 
  onReject 
}) => {
  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[40px] p-8 animate-in zoom-in duration-300 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar relative">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-red-500 transition-colors">
          <XIcon size={24} />
        </button>
        
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg">
            <UserCheck size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase italic leading-none">Análise de Cadastro</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Valide antes de liberar o acesso</p>
          </div>
        </div>

        {selectedPending.details ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailItem label="Nome" value={selectedPending.details.name} />
              <DetailItem label="WhatsApp" value={selectedPending.details.phone} />
              <DetailItem label="Graduação" value={`${selectedPending.details.belt} ${selectedPending.details.stripes}º G`} />
              <DetailItem label="Nascimento" value={new Date(selectedPending.details.birthDate).toLocaleDateString()} />
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={() => onApprove(selectedPending.user)}
                className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all text-xs uppercase tracking-widest"
              >
                Confirmar Aluno
              </button>
              <button 
                onClick={() => onReject(selectedPending.user)}
                className="flex-1 bg-red-50 text-red-600 font-black py-4 rounded-2xl hover:bg-red-100 active:scale-95 transition-all text-xs uppercase tracking-widest"
              >
                Rejeitar
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-slate-400">Processando dados...</div>
        )}
      </div>
    </div>
  );
};
