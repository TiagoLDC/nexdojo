import { http, HttpResponse, delay } from 'msw';
import { db } from '../db';
import type { CreateInstructorDTO, UpdateInstructorDTO, GraduateStudentDTO, AddDocumentDTO } from '@/types';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3005/api';

const paginate = <T>(items: T[], page: number, limit: number) => {
  const total = items.length;
  return { data: items.slice((page - 1) * limit, page * limit), total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const instructorsHandlers = [
  http.get(`${API}/instructors`, async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const academyId = url.searchParams.get('academyId') ?? '';
    const search = url.searchParams.get('search')?.toLowerCase() ?? '';
    const status = url.searchParams.get('status');
    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 50);

    let items = db.instructors.getAll(academyId);
    if (search) items = items.filter((i) => i.name.toLowerCase().includes(search));
    if (status) items = items.filter((i) => i.status === status);

    return HttpResponse.json(paginate(items, page, limit));
  }),

  http.get(`${API}/instructors/:id`, async ({ params }) => {
    await delay(100);
    const item = db.instructors.getById(params.id as string);
    if (!item) return HttpResponse.json({ message: 'Instrutor não encontrado.' }, { status: 404 });
    return HttpResponse.json(item);
  }),

  http.post(`${API}/instructors`, async ({ request }) => {
    await delay(200);
    const body = (await request.json()) as CreateInstructorDTO & { academyId: string };
    const item = db.instructors.create({ ...body, documents: [], graduationHistory: [] });
    return HttpResponse.json(item, { status: 201 });
  }),

  http.put(`${API}/instructors/:id`, async ({ params, request }) => {
    await delay(200);
    const body = (await request.json()) as UpdateInstructorDTO;
    const updated = db.instructors.update(params.id as string, body);
    if (!updated) return HttpResponse.json({ message: 'Instrutor não encontrado.' }, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API}/instructors/:id`, async ({ params }) => {
    await delay(200);
    const deleted = db.instructors.delete(params.id as string);
    if (!deleted) return HttpResponse.json({ message: 'Instrutor não encontrado.' }, { status: 404 });
    db.recycleBin.add({ academyId: deleted.academyId, type: 'instructor', originalData: deleted });
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API}/instructors/:id/graduate`, async ({ params, request }) => {
    await delay(200);
    const { newBelt, newStripes, date, instructorId, notes } = (await request.json()) as GraduateStudentDTO;
    const item = db.instructors.getById(params.id as string);
    if (!item) return HttpResponse.json({ message: 'Instrutor não encontrado.' }, { status: 404 });
    const historyItem = { id: db.uid(), previousBelt: item.belt, newBelt, previousStripes: item.stripes, newStripes, date, instructorId, notes };
    const updated = db.instructors.update(params.id as string, {
      belt: newBelt, stripes: newStripes, lastGraduationDate: date,
      graduationHistory: [...(item.graduationHistory ?? []), historyItem],
    });
    return HttpResponse.json(updated);
  }),

  http.post(`${API}/instructors/:id/documents`, async ({ params, request }) => {
    await delay(300);
    const body = (await request.json()) as AddDocumentDTO;
    const item = db.instructors.getById(params.id as string);
    if (!item) return HttpResponse.json({ message: 'Instrutor não encontrado.' }, { status: 404 });
    const doc = { ...body, id: db.uid(), uploadedAt: db.now() };
    const updated = db.instructors.update(params.id as string, { documents: [...(item.documents ?? []), doc] });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API}/instructors/:id/documents/:docId`, async ({ params }) => {
    await delay(150);
    const item = db.instructors.getById(params.id as string);
    if (!item) return HttpResponse.json({ message: 'Instrutor não encontrado.' }, { status: 404 });
    const updated = db.instructors.update(params.id as string, {
      documents: (item.documents ?? []).filter((d) => d.id !== params.docId),
    });
    return HttpResponse.json(updated);
  }),
];
