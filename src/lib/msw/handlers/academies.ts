import { http, HttpResponse, delay } from 'msw';
import { db } from '../db';
import type { UpdateAcademyDTO } from '@/types';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3005/api';

export const academiesHandlers = [
  http.get(`${API}/academies`, async () => {
    await delay(100);
    return HttpResponse.json(db.academies.getAll());
  }),

  http.get(`${API}/academies/:id`, async ({ params }) => {
    await delay(100);
    const item = db.academies.getById(params.id as string);
    if (!item) return HttpResponse.json({ message: 'Academia não encontrada.' }, { status: 404 });
    return HttpResponse.json(item);
  }),

  http.put(`${API}/academies/:id`, async ({ params, request }) => {
    await delay(200);
    const body = (await request.json()) as UpdateAcademyDTO;
    const updated = db.academies.update(params.id as string, body);
    if (!updated) return HttpResponse.json({ message: 'Academia não encontrada.' }, { status: 404 });
    return HttpResponse.json(updated);
  }),
];
