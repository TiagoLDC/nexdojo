type FieldRule = {
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'date';
  enum?: string[];
  maxLength?: number;
  min?: number;
  max?: number;
};

type Rules = Record<string, FieldRule>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida um objeto contra um conjunto de regras.
 * Retorna array de strings de erro; array vazio = válido.
 *
 * Uso:
 *   const errors = validate(req.body, { name: { required: true }, email: { type: 'email' } });
 *   if (errors.length) return res.status(400).json({ error: errors[0] });
 */
export function validate(data: Record<string, unknown>, rules: Rules): string[] {
  const errors: string[] = [];

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];
    const isEmpty = value === undefined || value === null || value === '';

    if (rule.required && isEmpty) {
      errors.push(`${field} é obrigatório`);
      continue;
    }

    if (isEmpty) continue;

    const str = String(value);

    if (rule.type === 'email' && !EMAIL_RE.test(str)) {
      errors.push(`${field} deve ser um e-mail válido`);
    }

    if (rule.type === 'string' && typeof value !== 'string') {
      errors.push(`${field} deve ser uma string`);
    }

    if (rule.type === 'number' && typeof value !== 'number') {
      errors.push(`${field} deve ser um número`);
    }

    if (rule.type === 'date' && isNaN(new Date(str).getTime())) {
      errors.push(`${field} deve ser uma data válida (YYYY-MM-DD)`);
    }

    if (rule.enum && !rule.enum.includes(str)) {
      errors.push(`${field} deve ser um de: ${rule.enum.join(', ')}`);
    }

    if (rule.maxLength !== undefined && str.length > rule.maxLength) {
      errors.push(`${field} deve ter no máximo ${rule.maxLength} caracteres`);
    }

    if (rule.min !== undefined && Number(value) < rule.min) {
      errors.push(`${field} deve ser no mínimo ${rule.min}`);
    }

    if (rule.max !== undefined && Number(value) > rule.max) {
      errors.push(`${field} deve ser no máximo ${rule.max}`);
    }
  }

  return errors;
}
