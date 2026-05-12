import { http, HttpResponse, delay } from 'msw';
import { db } from '../db';
import type { CreateClassTemplateDTO, UpdateClassTemplateDTO } from '@/types';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3005/api';

const paginate = <T>(items: T[], page: number, limit: number) => {
  const total = items.length;
  return { data: items.slice((page - 1) * limit, page * limit), total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const templatesHandlers = [
  http.get(`${API}/templates`, async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const academyId = url.searchParams.get('academyId') ?? '';
    const search = url.searchParams.get('search')?.toLowerCase() ?? '';
    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 50);

    let items = db.templates.getAll(academyId);
    if (search) items = items.filter((t) => t.name.toLowerCase().includes(search));

    return HttpResponse.json(paginate(items, page, limit));
  }),

  http.get(`${API}/templates/:id`, async ({ params }) => {
    await delay(100);
    const item = db.templates.getById(params.id as string);
    if (!item) return HttpResponse.json({ message: 'Turma não encontrada.' }, { status: 404 });
    return HttpResponse.json(item);
  }),

  http.post(`${API}/templates`, async ({ request }) => {
    await delay(200);
    const body = (await request.json()) as CreateClassTemplateDTO & { academyId: string };
    const item = db.templates.create({ ...body, schedules: body.schedules ?? [], assignedStudentIds: body.assignedStudentIds ?? [] });
    return HttpResponse.json(item, { status: 201 });
  }),

  http.put(`${API}/templates/:id`, async ({ params, request }) => {
    await delay(200);
    const body = (await request.json()) as UpdateClassTemplateDTO;
    const updated = db.templates.update(params.id as string, body);
    if (!updated) return HttpResponse.json({ message: 'Turma não encontrada.' }, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API}/templates/:id`, async ({ params }) => {
    await delay(200);
    const deleted = db.templates.delete(params.id as string);
    if (!deleted) return HttpResponse.json({ message: 'Turma não encontrada.' }, { status: 404 });
    return new HttpResponse(null, { status: 204 });
  }),
];
