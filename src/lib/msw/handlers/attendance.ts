import { http, HttpResponse, delay } from 'msw';
import { db } from '../db';
import type { CreateClassSessionDTO } from '@/types';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3005/api';

const paginate = <T>(items: T[], page: number, limit: number) => {
  const total = items.length;
  return { data: items.slice((page - 1) * limit, page * limit), total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const attendanceHandlers = [
  http.get(`${API}/attendance/sessions`, async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const academyId = url.searchParams.get('academyId') ?? '';
    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 20);

    const items = db.sessions.getAll(academyId).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    return HttpResponse.json(paginate(items, page, limit));
  }),

  http.get(`${API}/attendance/sessions/:id`, async ({ params }) => {
    await delay(100);
    const session = db.sessions.getById(params.id as string);
    if (!session) return HttpResponse.json({ message: 'Sessão não encontrada.' }, { status: 404 });
    return HttpResponse.json(session);
  }),

  http.post(`${API}/attendance/sessions`, async ({ request }) => {
    await delay(200);
    const body = (await request.json()) as CreateClassSessionDTO & { academyId: string };
    const session = db.sessions.create(body);
    return HttpResponse.json(session, { status: 201 });
  }),

  http.post(`${API}/attendance/sessions/:id/attend`, async ({ params, request }) => {
    await delay(100);
    const { studentId } = (await request.json()) as { studentId: string };
    const session = db.sessions.getById(params.id as string);
    if (!session) return HttpResponse.json({ message: 'Sessão não encontrada.' }, { status: 404 });
    if (session.attendanceIds.includes(studentId)) return HttpResponse.json(session);

    const updated = db.sessions.update(params.id as string, {
      attendanceIds: [...session.attendanceIds, studentId],
    });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API}/attendance/sessions/:id/attend/:studentId`, async ({ params }) => {
    await delay(100);
    const session = db.sessions.getById(params.id as string);
    if (!session) return HttpResponse.json({ message: 'Sessão não encontrada.' }, { status: 404 });

    const updated = db.sessions.update(params.id as string, {
      attendanceIds: session.attendanceIds.filter((sid) => sid !== params.studentId),
    });
    return HttpResponse.json(updated);
  }),

  http.post(`${API}/attendance/sessions/:id/finalize`, async ({ params }) => {
    await delay(300);
    const session = db.sessions.getById(params.id as string);
    if (!session) return HttpResponse.json({ message: 'Sessão não encontrada.' }, { status: 404 });

    // Create attendance records and update student stats
    for (const studentId of session.attendanceIds) {
      db.attendance.create({
        academyId: session.academyId,
        studentId,
        classId: session.id,
        date: session.date,
        durationMinutes: session.durationMinutes,
      });
      const student = db.students.getById(studentId);
      if (student) {
        const addedHours = session.durationMinutes / 60;
        db.students.update(studentId, {
          totalClasses: student.totalClasses + 1,
          totalHours: Math.round((student.totalHours + addedHours) * 10) / 10,
          lastAttendance: session.date,
        });
      }
    }

    const updated = db.sessions.update(params.id as string, { status: 'Finalized' });
    return HttpResponse.json(updated);
  }),

  http.get(`${API}/attendance/records`, async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const academyId = url.searchParams.get('academyId') ?? '';
    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 50);

    const items = db.attendance.getAll(academyId);
    return HttpResponse.json(paginate(items, page, limit));
  }),
];
