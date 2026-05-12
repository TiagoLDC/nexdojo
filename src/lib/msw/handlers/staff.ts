import { http, HttpResponse, delay } from 'msw';
import { db } from '../db';
import type { CreateStaffDTO, UpdateStaffDTO, AddDocumentDTO } from '@/types';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3005/api';

const paginate = <T>(items: T[], page: number, limit: number) => {
  const total = items.length;
  return { data: items.slice((page - 1) * limit, page * limit), total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const staffHandlers = [
  http.get(`${API}/staff`, async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const academyId = url.searchParams.get('academyId') ?? '';
    const search = url.searchParams.get('search')?.toLowerCase() ?? '';
    const status = url.searchParams.get('status');
    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 50);

    let items = db.staff.getAll(academyId);
    if (search) items = items.filter((s) => s.name.toLowerCase().includes(search));
    if (status) items = items.filter((s) => s.status === status);

    return HttpResponse.json(paginate(items, page, limit));
  }),

  http.get(`${API}/staff/:id`, async ({ params }) => {
    await delay(100);
    const item = db.staff.getById(params.id as string);
    if (!item) return HttpResponse.json({ message: 'Colaborador não encontrado.' }, { status: 404 });
    return HttpResponse.json(item);
  }),

  http.post(`${API}/staff`, async ({ request }) => {
    await delay(200);
    const body = (await request.json()) as CreateStaffDTO & { academyId: string };
    const item = db.staff.create({ ...body, documents: [] });
    return HttpResponse.json(item, { status: 201 });
  }),

  http.put(`${API}/staff/:id`, async ({ params, request }) => {
    await delay(200);
    const body = (await request.json()) as UpdateStaffDTO;
    const updated = db.staff.update(params.id as string, body);
    if (!updated) return HttpResponse.json({ message: 'Colaborador não encontrado.' }, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API}/staff/:id`, async ({ params }) => {
    await delay(200);
    const deleted = db.staff.delete(params.id as string);
    if (!deleted) return HttpResponse.json({ message: 'Colaborador não encontrado.' }, { status: 404 });
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API}/staff/:id/documents`, async ({ params, request }) => {
    await delay(300);
    const body = (await request.json()) as AddDocumentDTO;
    const item = db.staff.getById(params.id as string);
    if (!item) return HttpResponse.json({ message: 'Colaborador não encontrado.' }, { status: 404 });
    const doc = { ...body, id: db.uid(), uploadedAt: db.now() };
    const updated = db.staff.update(params.id as string, { documents: [...(item.documents ?? []), doc] });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API}/staff/:id/documents/:docId`, async ({ params }) => {
    await delay(150);
    const item = db.staff.getById(params.id as string);
    if (!item) return HttpResponse.json({ message: 'Colaborador não encontrado.' }, { status: 404 });
    const updated = db.staff.update(params.id as string, {
      documents: (item.documents ?? []).filter((d) => d.id !== params.docId),
    });
    return HttpResponse.json(updated);
  }),
];
