import { http, HttpResponse, delay } from 'msw';
import { db } from '../db';
import type { CreateStudentDTO, UpdateStudentDTO, GraduateStudentDTO, AddDocumentDTO } from '@/types';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3005/api';

const paginate = <T>(items: T[], page: number, limit: number) => {
  const total = items.length;
  const data = items.slice((page - 1) * limit, page * limit);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const studentsHandlers = [
  http.get(`${API}/students`, async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const academyId = url.searchParams.get('academyId') ?? '';
    const search = url.searchParams.get('search')?.toLowerCase() ?? '';
    const belt = url.searchParams.get('belt');
    const status = url.searchParams.get('status');
    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 50);

    let items = db.students.getAll(academyId);
    if (search) items = items.filter((s) => s.name.toLowerCase().includes(search) || s.email?.toLowerCase().includes(search));
    if (belt) items = items.filter((s) => s.belt === belt);
    if (status) items = items.filter((s) => s.status === status);

    return HttpResponse.json(paginate(items, page, limit));
  }),

  http.get(`${API}/students/:id`, async ({ params }) => {
    await delay(100);
    const student = db.students.getById(params.id as string);
    if (!student) return HttpResponse.json({ message: 'Aluno não encontrado.' }, { status: 404 });
    return HttpResponse.json(student);
  }),

  http.post(`${API}/students`, async ({ request }) => {
    await delay(200);
    const body = (await request.json()) as CreateStudentDTO & { academyId: string };
    const student = db.students.create({
      ...body,
      totalClasses: 0,
      totalHours: 0,
      absentCount: 0,
      documents: [],
      graduationHistory: [],
    });
    return HttpResponse.json(student, { status: 201 });
  }),

  http.put(`${API}/students/:id`, async ({ params, request }) => {
    await delay(200);
    const body = (await request.json()) as UpdateStudentDTO;
    const updated = db.students.update(params.id as string, body);
    if (!updated) return HttpResponse.json({ message: 'Aluno não encontrado.' }, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API}/students/:id`, async ({ params }) => {
    await delay(200);
    const deleted = db.students.delete(params.id as string);
    if (!deleted) return HttpResponse.json({ message: 'Aluno não encontrado.' }, { status: 404 });
    db.recycleBin.add({ academyId: deleted.academyId, type: 'student', originalData: deleted });
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API}/students/:id/graduate`, async ({ params, request }) => {
    await delay(200);
    const { newBelt, newStripes, date, instructorId, notes } = (await request.json()) as GraduateStudentDTO;
    const student = db.students.getById(params.id as string);
    if (!student) return HttpResponse.json({ message: 'Aluno não encontrado.' }, { status: 404 });

    const historyItem = {
      id: db.uid(),
      previousBelt: student.belt,
      newBelt,
      previousStripes: student.stripes,
      newStripes,
      date,
      instructorId,
      notes,
    };

    const updated = db.students.update(params.id as string, {
      belt: newBelt,
      stripes: newStripes,
      lastGraduationDate: date,
      graduationHistory: [...(student.graduationHistory ?? []), historyItem],
    });
    return HttpResponse.json(updated);
  }),

  http.post(`${API}/students/:id/documents`, async ({ params, request }) => {
    await delay(300);
    const body = (await request.json()) as AddDocumentDTO;
    const student = db.students.getById(params.id as string);
    if (!student) return HttpResponse.json({ message: 'Aluno não encontrado.' }, { status: 404 });

    const doc = { ...body, id: db.uid(), uploadedAt: db.now() };
    const updated = db.students.update(params.id as string, {
      documents: [...(student.documents ?? []), doc],
    });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API}/students/:id/documents/:docId`, async ({ params }) => {
    await delay(150);
    const student = db.students.getById(params.id as string);
    if (!student) return HttpResponse.json({ message: 'Aluno não encontrado.' }, { status: 404 });

    const updated = db.students.update(params.id as string, {
      documents: (student.documents ?? []).filter((d) => d.id !== params.docId),
    });
    return HttpResponse.json(updated);
  }),
];
