import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, Award, ChevronLeft } from 'lucide-react';
import { ChoiceCard } from './AuthComponents';
import AuthLayout from './AuthLayout';
import { MOCK_ACADEMY } from '../../services/mockData';

interface SignupChoiceProps {
  isFromSharedLink: boolean;
}

const SignupChoice: React.FC<SignupChoiceProps> = ({ isFromSharedLink }) => {
  const navigate = useNavigate();

  return (
    <AuthLayout showLogo={true} academyName={MOCK_ACADEMY.name} academyLogo={MOCK_ACADEMY.logo}>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <button onClick={() => navigate('/login')} className="text-white flex items-center gap-2 mb-4 hover:text-indigo-400 transition-colors font-bold text-xs uppercase tracking-[0.2em]">
          <ChevronLeft size={18} /> Voltar ao Login
        </button>
        <div className={`grid grid-cols-1 ${isFromSharedLink ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-4`}>
          {!isFromSharedLink && <ChoiceCard icon={<Trophy size={28} />} title="Nova Academia" desc="Para professores e gestores." onClick={() => navigate('/cadastro/academia')} />}
          <ChoiceCard icon={<Users size={28} />} title="Sou Aluno" desc="Fazer matrícula agora." onClick={() => navigate('/cadastro/aluno')} />
          <ChoiceCard icon={<Award size={28} />} title="Sou Instrutor" desc="Ficha técnica do mestre." onClick={() => navigate('/cadastro/instrutor')} />
        </div>
      </div>
    </AuthLayout>
  );
};

export default SignupChoice;
