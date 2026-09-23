import { Router, Request, Response, NextFunction } from 'express';
import { PoolConnection } from 'mysql2/promise';
import pool from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getAcademyId } from '../utils/academyScope';
import { logAudit } from '../utils/auditLog';
import { withTransaction } from '../utils/withTransaction';
import { resolveBeltRank } from '../utils/beltRanks';

const router = Router();

/**
 * students.belt_rank_id e instructors.belt_rank_id são NOT NULL com FK para belt_ranks desde a
 * migração de graduação (PLANO_GRADUACAO.md, Fase 3). O INSERT da restauração nunca preencheu a
 * coluna, então todo restore de aluno/instrutor morria em 500 — erro 1364 ("doesn't have a
 * default value") em strict mode, ou 1452 (FK com string vazia) fora dele.
 *
 * Ordem de preferência: o id gravado na lixeira (se a faixa ainda existir), o id resolvido pelo
 * nome da faixa dentro do esporte da academia e, por último, a primeira faixa do esporte — vale
 * mais o cadastro voltar com a faixa a acertar na tela do que a restauração falhar.
 */
async function resolveBeltRankIdForRestore(
  academyId: string,
  savedBeltRankId: string | null | undefined,
  beltName: string | null | undefined
): Promise<string | null> {
  if (savedBeltRankId) {
    const [rows] = await pool.execute<any[]>('SELECT id FROM belt_ranks WHERE id = ?', [savedBeltRankId]);
    if (rows[0]) return savedBeltRankId;
  }

  const resolved = await resolveBeltRank(academyId, beltName ?? 'Branca');
  if (resolved) return resolved.id;

  const [fallbackRows] = await pool.execute<any[]>(
    `SELECT br.id FROM belt_ranks br
       JOIN academies a ON a.sport_id = br.sport_id
      WHERE a.id = ?
      ORDER BY br.order_index ASC
      LIMIT 1`,
    [academyId]
  );
  return fallbackRows[0]?.id ?? null;
}

// Referências opcionais (plano do aluno, faixas do histórico de graduação) podem ter sido
// excluídas enquanto o cadastro estava na lixeira. Reaproveitar o id cru derrubaria o INSERT na
// FK, então o valor só volta se a linha ainda existir.
async function keepIfExists(
  conn: PoolConnection,
  table: 'academy_plans' | 'belt_ranks',
  id: string | null | undefined
): Promise<string | null> {
  if (!id) return null;
  const [rows] = await conn.execute<any[]>(`SELECT id FROM ${table} WHERE id = ?`, [id]);
  return rows[0] ? id : null;
}

// GET /api/recycle-bin
router.get('/', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  const { type } = req.query;
  let where = 'WHERE academy_id = ?';
  const params: any[] = [academyId];
  if (type) { where += ' AND type = ?'; params.push(type); }

  try {
    const [rawRows] = await pool.execute<any[]>(
      `SELECT id, academy_id, type, deleted_at, JSON_UNQUOTE(JSON_EXTRACT(original_data, '$.name')) AS name
       FROM recycle_bin ${where} ORDER BY deleted_at DESC`,
      params
    );
    const rows = (rawRows as any[]).map(row => ({
      id: row.id,
      academyId: row.academy_id,
      type: row.type,
      deletedAt: row.deleted_at,
      originalData: { name: row.name },
    }));
    res.json({ data: rows, total: rows.length });
  } catch (err) {
    next(err);
  }
});

// POST /api/recycle-bin/:id/restore — restaurar item
router.post('/:id/restore', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  try {
    const [binRows] = await pool.execute<any[]>(
      'SELECT * FROM recycle_bin WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!binRows[0]) { res.status(404).json({ error: 'Item não encontrado na lixeira' }); return; }

    const item = binRows[0] as any;
    const data = JSON.parse(item.original_data);

    const TARGET_BY_TYPE: Record<string, { table: string; label: string; hasEmail: boolean }> = {
      student:    { table: 'students',        label: 'aluno',       hasEmail: true  },
      instructor: { table: 'instructors',     label: 'instrutor',   hasEmail: true  },
      staff:      { table: 'staff',           label: 'colaborador', hasEmail: true  },
      template:   { table: 'class_templates', label: 'template',    hasEmail: false },
    };
    const target = TARGET_BY_TYPE[item.type];
    if (!target) {
      res.status(400).json({ error: `Tipo de item desconhecido: ${item.type}` });
      return;
    }

    const [conflictRows] = await pool.execute<any[]>(
      `SELECT id FROM ${target.table} WHERE id = ?`,
      [data.id]
    );
    if ((conflictRows as any[]).length) {
      res.status(409).json({ error: `Já existe um ${target.label} com esse ID (possível duplicata)` });
      return;
    }

    // UNIQUE (academy_id, email): se o e-mail foi reaproveitado em outro cadastro depois da
    // exclusão, o INSERT estoura ER_DUP_ENTRY e vira um 500 sem explicação nenhuma na tela.
    if (target.hasEmail && data.email) {
      const [emailRows] = await pool.execute<any[]>(
        `SELECT id FROM ${target.table} WHERE academy_id = ? AND email = ?`,
        [academyId, data.email]
      );
      if ((emailRows as any[]).length) {
        res.status(409).json({
          error: `Já existe outro ${target.label} com o e-mail ${data.email} nesta academia. Altere o e-mail do cadastro atual antes de restaurar.`,
        });
        return;
      }
    }

    const beltRankId = (item.type === 'student' || item.type === 'instructor')
      ? await resolveBeltRankIdForRestore(academyId, data.belt_rank_id, data.belt)
      : null;

    // Tudo numa transação: sem ela, uma falha no meio (um documento, um horário do template)
    // deixava o cadastro pela metade no banco E o item ainda na lixeira — e a tentativa seguinte
    // de restaurar batia no conflito de ID, sem caminho de volta pela interface.
    await withTransaction(async (conn) => {
      if (item.type === 'student') {
        const { documents, graduationHistory, ...student } = data;
        const planId = await keepIfExists(conn, 'academy_plans', student.plan_id);

        await conn.execute(
          `INSERT INTO students (
            id, academy_id, user_id, name, email, phone, belt, belt_rank_id, stripes, birth_date, gender, photo,
            cpf, rg, weight, height, blood_type, emergency_contact, emergency_phone,
            cep, address, address_number, guardian_name, guardian_phone, guardian_email,
            guardian_cpf, guardian_rg, guardian_relation, guardian_profession, guardian_invite_token,
            medical_notes, total_classes, total_hours, classes_since_graduation, hours_since_graduation,
            last_attendance, absent_count,
            status, join_date, last_graduation_date, plan_id, next_payment_date, absence_limit,
            has_loaned_kimono, kimono_loan_date
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            student.id, student.academy_id, student.user_id ?? null, student.name, student.email ?? null,
            student.phone ?? null, student.belt ?? 'Branca', beltRankId, student.stripes ?? 0,
            student.birth_date ?? null, student.gender ?? null, student.photo ?? null,
            student.cpf ?? null, student.rg ?? null, student.weight ?? null, student.height ?? null,
            student.blood_type ?? null, student.emergency_contact ?? null, student.emergency_phone ?? null,
            student.cep ?? null, student.address ?? null, student.address_number ?? null,
            student.guardian_name ?? null, student.guardian_phone ?? null, student.guardian_email ?? null,
            student.guardian_cpf ?? null, student.guardian_rg ?? null, student.guardian_relation ?? null,
            student.guardian_profession ?? null, student.guardian_invite_token ?? null,
            student.medical_notes ?? null,
            student.total_classes ?? 0, student.total_hours ?? 0,
            student.classes_since_graduation ?? 0, student.hours_since_graduation ?? 0,
            student.last_attendance ?? null, student.absent_count ?? 0,
            student.status ?? 'Active', student.join_date ?? null, student.last_graduation_date ?? null,
            planId, student.next_payment_date ?? null, student.absence_limit ?? null,
            student.has_loaned_kimono ?? 0, student.kimono_loan_date ?? null,
          ]
        );

        if (Array.isArray(documents) && documents.length) {
          for (const doc of documents) {
            await conn.execute(
              'INSERT INTO student_documents (id, student_id, name, url) VALUES (?,?,?,?)',
              [doc.id ?? crypto.randomUUID(), student.id, doc.name ?? null, doc.url ?? null]
            );
          }
        }

        if (Array.isArray(graduationHistory) && graduationHistory.length) {
          for (const gh of graduationHistory) {
            await conn.execute(
              `INSERT INTO graduation_history
                 (id, student_id, previous_belt, previous_belt_rank_id, new_belt, belt_rank_id,
                  previous_stripes, new_stripes, date, instructor_id, notes)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
              [
                gh.id ?? crypto.randomUUID(), student.id,
                gh.previous_belt ?? null, await keepIfExists(conn, 'belt_ranks', gh.previous_belt_rank_id),
                gh.new_belt ?? null, await keepIfExists(conn, 'belt_ranks', gh.belt_rank_id),
                gh.previous_stripes ?? null, gh.new_stripes ?? null,
                gh.date ?? null, gh.instructor_id ?? null, gh.notes ?? null,
              ]
            );
          }
        }

        // Reverte o bloqueio aplicado no DELETE (só reativa quem foi bloqueado por causa
        // dessa exclusão, nunca uma conta bloqueada manualmente por outro motivo).
        if (student.user_id) {
          await conn.execute(
            `UPDATE users SET status = 'Active' WHERE id = ? AND academy_id = ? AND status = 'Blocked'`,
            [student.user_id, student.academy_id]
          );
        }

      } else if (item.type === 'instructor') {
        await conn.execute(
          `INSERT INTO instructors (
            id, academy_id, user_id, name, email, phone, belt, belt_rank_id, stripes, birth_date, gender, photo,
            cpf, rg, weight, height, blood_type, marital_status, emergency_contact, emergency_phone,
            cep, address, address_number, specialties, medical_notes, status, join_date,
            last_graduation_date, has_loaned_kimono, kimono_loan_date
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            data.id, data.academy_id, data.user_id ?? null, data.name, data.email ?? null,
            data.phone ?? null, data.belt ?? 'Branca', beltRankId, data.stripes ?? 0,
            data.birth_date ?? null, data.gender ?? null, data.photo ?? null,
            data.cpf ?? null, data.rg ?? null, data.weight ?? null, data.height ?? null,
            data.blood_type ?? null, data.marital_status ?? null,
            data.emergency_contact ?? null, data.emergency_phone ?? null,
            data.cep ?? null, data.address ?? null, data.address_number ?? null,
            data.specialties ?? null, data.medical_notes ?? null,
            data.status ?? 'Active', data.join_date ?? null,
            data.last_graduation_date ?? null,
            data.has_loaned_kimono ?? 0, data.kimono_loan_date ?? null,
          ]
        );

        if (data.user_id) {
          await conn.execute(
            `UPDATE users SET status = 'Active' WHERE id = ? AND academy_id = ? AND status = 'Blocked'`,
            [data.user_id, data.academy_id]
          );
        }

      } else if (item.type === 'template') {
        const { schedules, assignedStudentIds, ...template } = data;

        await conn.execute(
          'INSERT INTO class_templates (id, academy_id, name, duration_minutes, absence_limit) VALUES (?,?,?,?,?)',
          [template.id, template.academy_id, template.name, template.duration_minutes, template.absence_limit ?? null]
        );

        if (Array.isArray(schedules) && schedules.length) {
          for (const s of schedules) {
            await conn.execute(
              'INSERT INTO class_template_schedules (id, template_id, day_of_week, start_time, end_time) VALUES (?,?,?,?,?)',
              [s.id ?? crypto.randomUUID(), template.id, s.day_of_week, s.start_time, s.end_time]
            );
          }
        }

        if (Array.isArray(assignedStudentIds) && assignedStudentIds.length) {
          for (const sid of assignedStudentIds) {
            const [studentExists] = await conn.execute<any[]>('SELECT id FROM students WHERE id = ?', [sid]);
            if ((studentExists as any[]).length) {
              await conn.execute(
                'INSERT IGNORE INTO class_template_assigned_students (template_id, student_id) VALUES (?,?)',
                [template.id, sid]
              );
            }
          }
        }

      } else if (item.type === 'staff') {
        await conn.execute(
          `INSERT INTO staff (
            id, academy_id, user_id, name, email, phone, whatsapp, invite_token, photo,
            birth_date, gender, position, cpf, rg,
            cep, address, address_number, address_neighborhood, address_city, address_state,
            medical_notes, status, join_date
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            data.id, data.academy_id, data.user_id ?? null,
            data.name, data.email ?? null, data.phone ?? null, data.whatsapp ?? null,
            data.invite_token ?? null, data.photo ?? null,
            data.birth_date ?? null, data.gender ?? null, data.position ?? null,
            data.cpf ?? null, data.rg ?? null,
            data.cep ?? null, data.address ?? null, data.address_number ?? null,
            data.address_neighborhood ?? null, data.address_city ?? null, data.address_state ?? null,
            data.medical_notes ?? null, data.status ?? 'Active', data.join_date ?? null,
          ]
        );

        if (data.user_id) {
          await conn.execute(
            `UPDATE users SET status = 'Active' WHERE id = ? AND academy_id = ? AND status = 'Blocked'`,
            [data.user_id, data.academy_id]
          );
        }
      }

      await conn.execute('DELETE FROM recycle_bin WHERE id = ?', [req.params.id]);
    });

    await logAudit(req, {
      action: `${item.type}.restore`,
      entityType: item.type,
      entityId: data.id,
      details: { name: data.name },
    });

    res.json({ message: 'Item restaurado com sucesso' });
  } catch (err: any) {
    // Sem isso, colisão de índice único vira o 500 genérico do errorHandler e o admin fica sem
    // saber o que impede a restauração.
    if (err?.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Já existe um cadastro com dados únicos deste item (e-mail ou token de convite). Ajuste o cadastro existente antes de restaurar.' });
      return;
    }
    next(err);
  }
});

// DELETE /api/recycle-bin/:id — excluir permanentemente
router.delete('/:id', requireAuth, requireRole('admin', 'superuser'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const academyId = getAcademyId(req, res);
  if (!academyId) return;

  try {
    const [rows] = await pool.execute<any[]>(
      'SELECT * FROM recycle_bin WHERE id = ? AND academy_id = ?',
      [req.params.id, academyId]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Item não encontrado na lixeira' }); return; }

    const item = rows[0] as any;
    const data = JSON.parse(item.original_data);

    await pool.execute('DELETE FROM recycle_bin WHERE id = ?', [req.params.id]);

    await logAudit(req, {
      action: `${item.type}.purge`,
      entityType: item.type,
      entityId: data.id,
      details: { name: data.name },
    });

    res.json({ message: 'Item excluído permanentemente' });
  } catch (err) {
    next(err);
  }
});

export default router;
