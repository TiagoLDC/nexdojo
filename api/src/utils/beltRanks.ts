import pool from '../db';

export type ResolvedBeltRank = {
  id: string;
  degreeCount: number;
};

/**
 * Resolve a linha de belt_ranks correspondente a um nome de faixa (ex: "Azul"), dentro
 * do esporte da academia informada. Usado para popular belt_rank_id em paralelo ao campo
 * `belt` (ENUM) já existente — ver PLANO_GRADUACAO.md Fase 3 (dual-write, sem remover `belt`).
 *
 * Retorna null se a academia ainda não tem sport_id (backfill pendente) ou se o nome não
 * corresponder a nenhuma faixa do template — nesses casos o chamador deve seguir usando
 * só o campo `belt` normalmente (fallback silencioso, não bloqueia a operação).
 */
export async function resolveBeltRank(academyId: string, beltName: string | null | undefined): Promise<ResolvedBeltRank | null> {
  if (!beltName) return null;

  const [academyRows] = await pool.execute<any[]>('SELECT sport_id FROM academies WHERE id = ?', [academyId]);
  const sportId = academyRows[0]?.sport_id;
  if (!sportId) return null;

  const [rankRows] = await pool.execute<any[]>(
    'SELECT id, degree_count FROM belt_ranks WHERE sport_id = ? AND name = ?',
    [sportId, beltName]
  );
  if (!rankRows[0]) return null;

  return { id: rankRows[0].id, degreeCount: rankRows[0].degree_count };
}
