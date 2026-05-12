import { http, HttpResponse, delay } from 'msw';
import { db } from '../db';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3005/api';

export const recycleBinHandlers = [
  http.get(`${API}/recycle-bin`, async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const academyId = url.searchParams.get('academyId') ?? '';
    return HttpResponse.json(db.recycleBin.getAll(academyId));
  }),

  http.post(`${API}/recycle-bin/:id/restore`, async ({ params }) => {
    await delay(200);
    const entry = db.recycleBin.remove(params.id as string);
    if (!entry) return HttpResponse.json({ message: 'Item não encontrado na lixeira.' }, { status: 404 });

    if (entry.type === 'student') {
      db.students.create(entry.originalData as Parameters<typeof db.students.create>[0]);
    } else if (entry.type === 'instructor') {
      db.instructors.create(entry.originalData as Parameters<typeof db.instructors.create>[0]);
    }

    return HttpResponse.json({ message: 'Item restaurado com sucesso.' });
  }),

  http.delete(`${API}/recycle-bin/:id`, async ({ params }) => {
    await delay(150);
    const entry = db.recycleBin.remove(params.id as string);
    if (!entry) return HttpResponse.json({ message: 'Item não encontrado na lixeira.' }, { status: 404 });
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${API}/recycle-bin`, async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const academyId = url.searchParams.get('academyId') ?? '';
    db.recycleBin.empty(academyId);
    return new HttpResponse(null, { status: 204 });
  }),
];
