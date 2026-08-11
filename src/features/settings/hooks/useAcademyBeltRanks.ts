import { useEffect, useState } from 'react';
import { beltRankService, AcademyBeltRank } from '../services/beltRankService';
import type { Sport } from '@/types';

// Fonte única de faixas/graduação por academia, consumida por qualquer tela que precise
// saber a config (meses/aulas/aviso) da faixa atual de um aluno. Ver PLANO_GRADUACAO.md Fase 8.
export function useAcademyBeltRanks(academyId?: string) {
  const [sport, setSport] = useState<Sport | null>(null);
  const [beltRanks, setBeltRanks] = useState<AcademyBeltRank[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!academyId) return;
    setIsLoading(true);
    beltRankService.getAcademyBeltSettings(academyId)
      .then(res => {
        setSport(res.sport);
        setBeltRanks(res.beltRanks);
      })
      .catch(err => console.error('Erro ao carregar faixas e graduação:', err))
      .finally(() => setIsLoading(false));
  }, [academyId]);

  const getBeltConfig = (beltName: string) => beltRanks.find(b => b.name === beltName);

  return { sport, beltRanks, isLoading, getBeltConfig };
}
