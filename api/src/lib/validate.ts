import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const validate = (schema: z.ZodTypeAny) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message });
    }
    req.body = result.data;
    return next();
  };

// ── Schemas ──────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(1, 'Senha é obrigatória.'),
});

export const registerAcademySchema = z.object({
  name: z.string().min(1, 'Nome da academia é obrigatório.'),
  ownerName: z.string().min(1, 'Nome do responsável é obrigatório.'),
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres.'),
  phone: z.string().optional(),
  cep: z.string().optional(),
  address: z.string().optional(),
  addressNumber: z.string().optional(),
  logo: z.string().optional(),
});

export const registerStudentSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório.'),
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres.'),
  academyId: z.string().min(1, 'Academia é obrigatória.'),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  belt: z.string().optional(),
  stripes: z.number().optional(),
});

export const createStudentSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório.'),
  email: z.string().email('E-mail inválido.').optional().or(z.literal('')),
  belt: z.string().optional(),
  stripes: z.number().int().min(0).max(6).optional(),
  status: z.string().optional(),
}).passthrough();

export const updateStudentSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório.').optional(),
  email: z.string().email('E-mail inválido.').optional().or(z.literal('')),
  belt: z.string().optional(),
  stripes: z.number().int().min(0).max(6).optional(),
  status: z.string().optional(),
}).passthrough();
