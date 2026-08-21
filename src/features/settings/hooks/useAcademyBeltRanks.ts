import { useEffect, useState } from 'react';
import { beltRankService } from '../services/beltRankService';
import type { Sport, BeltRank, AcademyBeltSetting } from '@/types';
import { resolveBeltRankConfig, type BeltRankConfig } from '../../../../services/graduation';

// Fonte única de faixas/graduação por academia, consumida por qualquer tela que precise
// saber a config (meses/aulas/aviso) da faixa atual de um aluno. Ver PLANO_GRADUACAO.md Fase 8.
export function useAcademyBeltRanks(academyId?: string) {
  const [sport, setSport] = useState<Sport | null>(null);
  const [beltRanks, setBeltRanks] = useState<BeltRank[]>([]);
  const [beltSettings, setBeltSettings] = useState<AcademyBeltSetting[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!academyId) return;
    setIsLoading(true);
    beltRankService.getAcademyBeltSettings(academyId)
      .then(res => {
        setSport(res.sport);
        setBeltRanks(res.beltRanks);
        setBeltSettings(res.beltSettings);
      })
      .catch(err => console.error('Erro ao carregar faixas e graduação:', err))
      .finally(() => setIsLoading(false));
  }, [academyId]);

  // Path legado: só o nome da faixa — resolve no template, usado pelos pontos que só
  // precisam de cor (colorKey), sem elegibilidade (não têm idade/grau do aluno disponíveis).
  function getBeltConfig(beltName: string): BeltRank | undefined;
  // Path completo: aluno inteiro — resolve a linha de critério certa (idade/grau), usado
  // pelos pontos que calculam elegibilidade de graduação.
  function getBeltConfig(student: { belt: string; birthDate?: string; stripes?: number }): BeltRankConfig | undefined;
  function getBeltConfig(arg: string | { belt: string; birthDate?: string; stripes?: number }) {
    if (typeof arg === 'string') {
      return beltRanks.find(b => b.name === arg);
    }
    return resolveBeltRankConfig(beltRanks, beltSettings, sport?.youthMaxAge, arg);
  }

  return { sport, beltRanks, beltSettings, isLoading, getBeltConfig };
}
