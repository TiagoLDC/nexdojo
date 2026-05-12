import { http, HttpResponse, delay } from 'msw';
import { db } from '../db';
import { SEED_PASSWORDS } from '../seed';
import type { LoginCredentials } from '@/types';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3005/api';

export const authHandlers = [
  http.post(`${API}/auth/login`, async ({ request }) => {
    await delay(300);
    const { email, password } = (await request.json()) as LoginCredentials;

    const user = db.users.getByEmail(email);
    if (!user || SEED_PASSWORDS[email] !== password) {
      return HttpResponse.json({ message: 'Credenciais inválidas.' }, { status: 401 });
    }

    const academy =
      user.role === 'superuser'
        ? db.academies.getAll()[0] ?? null
        : db.academies.getById(user.academyId);

    return HttpResponse.json({
      user,
      token: `mock-token-${user.id}-${Date.now()}`,
      academy,
    });
  }),

  http.post(`${API}/auth/logout`, async () => {
    await delay(100);
    return HttpResponse.json({ message: 'Logout realizado.' });
  }),

  http.get(`${API}/auth/me`, async ({ request }) => {
    await delay(100);
    const authHeader = request.headers.get('Authorization') ?? '';
    const tokenParts = authHeader.replace('Bearer mock-token-', '').split('-');
    const userId = tokenParts[0];
    const user = db.users.getById(userId);
    if (!user) return HttpResponse.json({ message: 'Não autenticado.' }, { status: 401 });
    return HttpResponse.json(user);
  }),
];
