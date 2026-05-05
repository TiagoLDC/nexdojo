
import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { maskSensitive as maskFn } from '../services/cep';

interface PrivacyValueProps {
  value: string;
  maskType?: 'cpf' | 'rg' | 'generic';
  className?: string;
  label?: string;
}

export const PrivacyValue: React.FC<PrivacyValueProps> = ({ value, maskType = 'generic', className = '', label }) => {
  const [isVisible, setIsVisible] = useState(false);

  if (!value) return null;

  const maskCPF = (cpf: string) => {
    const clean = cpf.replace(/\D/g, '');
    if (clean.length !== 11) return cpf;
    return `${clean.substring(0, 3)}.***.***-${clean.substring(9)}`;
  };

  const maskRG = (rg: string) => {
    if (!rg) return '';
    if (rg.length < 4) return rg;
    return `${rg.substring(0, 2)}***${rg.substring(rg.length - 2)}`;
  };

  const getMaskedValue = () => {
    if (maskType === 'cpf') return maskCPF(value);
    if (maskType === 'rg') return maskRG(value);
    return maskFn(value);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="font-medium">
        {isVisible ? value : getMaskedValue()}
      </span>
      <button 
        onClick={() => setIsVisible(!isVisible)}
        className="text-slate-400 hover:text-indigo-600 transition-colors p-1 rounded-md hover:bg-slate-100"
        title={isVisible ? "Ocultar" : "Mostrar"}
      >
        {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
};
