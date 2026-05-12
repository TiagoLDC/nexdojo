import { http, HttpResponse, delay } from 'msw';
import { db } from '../db';
import type { SenderRole } from '@/types';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3005/api';

export const chatHandlers = [
  http.get(`${API}/chat`, async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const academyId = url.searchParams.get('academyId') ?? '';
    const items = db.chat.getAll(academyId).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    return HttpResponse.json(items);
  }),

  http.post(`${API}/chat`, async ({ request }) => {
    await delay(150);
    const body = (await request.json()) as {
      academyId: string;
      senderId: string;
      senderName: string;
      senderRole: SenderRole;
      content: string;
    };
    const item = db.chat.create(body);
    return HttpResponse.json(item, { status: 201 });
  }),

  http.delete(`${API}/chat/:id`, async ({ params }) => {
    await delay(100);
    db.chat.delete(params.id as string);
    return new HttpResponse(null, { status: 204 });
  }),
];
