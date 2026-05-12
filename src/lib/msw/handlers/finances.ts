import { http, HttpResponse, delay } from 'msw';
import { db } from '../db';
import type { CreateTransactionDTO, UpdateTransactionDTO } from '@/types';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3005/api';

const paginate = <T>(items: T[], page: number, limit: number) => {
  const total = items.length;
  return { data: items.slice((page - 1) * limit, page * limit), total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const financesHandlers = [
  http.get(`${API}/finance/transactions`, async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const academyId = url.searchParams.get('academyId') ?? '';
    const search = url.searchParams.get('search')?.toLowerCase() ?? '';
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 50);

    let items = db.transactions.getAll(academyId).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    if (search) items = items.filter((t) => t.description.toLowerCase().includes(search));
    if (type) items = items.filter((t) => t.type === type);
    if (status) items = items.filter((t) => t.status === status);
    if (dateFrom) items = items.filter((t) => t.date >= dateFrom);
    if (dateTo) items = items.filter((t) => t.date <= dateTo);

    return HttpResponse.json(paginate(items, page, limit));
  }),

  http.get(`${API}/finance/transactions/:id`, async ({ params }) => {
    await delay(100);
    const item = db.transactions.getById(params.id as string);
    if (!item) return HttpResponse.json({ message: 'Transação não encontrada.' }, { status: 404 });
    return HttpResponse.json(item);
  }),

  http.post(`${API}/finance/transactions`, async ({ request }) => {
    await delay(200);
    const body = (await request.json()) as CreateTransactionDTO & { academyId: string };
    const item = db.transactions.create(body);
    return HttpResponse.json(item, { status: 201 });
  }),

  http.put(`${API}/finance/transactions/:id`, async ({ params, request }) => {
    await delay(200);
    const body = (await request.json()) as UpdateTransactionDTO;
    const updated = db.transactions.update(params.id as string, body);
    if (!updated) return HttpResponse.json({ message: 'Transação não encontrada.' }, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API}/finance/transactions/:id`, async ({ params }) => {
    await delay(200);
    const item = db.transactions.getById(params.id as string);
    if (!item) return HttpResponse.json({ message: 'Transação não encontrada.' }, { status: 404 });
    db.transactions.delete(params.id as string);
    return new HttpResponse(null, { status: 204 });
  }),
];
