import { http, HttpResponse, delay } from 'msw';
import { db } from '../db';
import type { CreateCalendarEventDTO } from '@/types';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3005/api';

export const calendarHandlers = [
  http.get(`${API}/calendar`, async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const academyId = url.searchParams.get('academyId') ?? '';
    const items = db.calendar.getAll(academyId).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    return HttpResponse.json(items);
  }),

  http.post(`${API}/calendar`, async ({ request }) => {
    await delay(200);
    const body = (await request.json()) as CreateCalendarEventDTO & { academyId: string };
    const item = db.calendar.create(body);
    return HttpResponse.json(item, { status: 201 });
  }),

  http.delete(`${API}/calendar/:id`, async ({ params }) => {
    await delay(150);
    db.calendar.delete(params.id as string);
    return new HttpResponse(null, { status: 204 });
  }),
];
