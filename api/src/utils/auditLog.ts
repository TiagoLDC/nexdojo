import { Request } from 'express';
import crypto from 'crypto';
import pool from '../db';

export interface AuditLogInput {
  action: string;
  entityType?: string;
  entityId?: string | string[] | null;
  academyId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  details?: Record<string, unknown> | null;
}

/**
 * Registra um evento sensível na trilha de auditoria (audit_log).
 * Nunca deve derrubar a requisição principal — se a gravação falhar, o erro só vai pro console.
 */
export async function logAudit(req: Request, input: AuditLogInput): Promise<void> {
  try {
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)?.split(',')[0]?.trim()
      || req.ip
      || null;

    await pool.execute(
      `INSERT INTO audit_log (id, academy_id, user_id, user_email, action, entity_type, entity_id, details, ip_address)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        crypto.randomUUID(),
        input.academyId ?? req.user?.academyId ?? null,
        input.userId ?? req.user?.userId ?? null,
        input.userEmail ?? null,
        input.action,
        input.entityType ?? null,
        Array.isArray(input.entityId) ? input.entityId.join(',') : (input.entityId ?? null),
        input.details ? JSON.stringify(input.details) : null,
        ip,
      ]
    );
  } catch (err) {
    console.error('[audit-log] Falha ao registrar evento de auditoria:', err);
  }
}
