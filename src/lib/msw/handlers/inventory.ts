import { http, HttpResponse, delay } from 'msw';
import { db } from '../db';
import type { CreateProductDTO, UpdateProductDTO } from '@/types';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3005/api';

const paginate = <T>(items: T[], page: number, limit: number) => {
  const total = items.length;
  return { data: items.slice((page - 1) * limit, page * limit), total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const inventoryHandlers = [
  http.get(`${API}/inventory/products`, async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const academyId = url.searchParams.get('academyId') ?? '';
    const search = url.searchParams.get('search')?.toLowerCase() ?? '';
    const category = url.searchParams.get('category');
    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 50);

    let items = db.products.getAll(academyId);
    if (search) items = items.filter((p) => p.name.toLowerCase().includes(search));
    if (category) items = items.filter((p) => p.category === category);

    return HttpResponse.json(paginate(items, page, limit));
  }),

  http.get(`${API}/inventory/products/:id`, async ({ params }) => {
    await delay(100);
    const item = db.products.getById(params.id as string);
    if (!item) return HttpResponse.json({ message: 'Produto não encontrado.' }, { status: 404 });
    return HttpResponse.json(item);
  }),

  http.post(`${API}/inventory/products`, async ({ request }) => {
    await delay(200);
    const body = (await request.json()) as CreateProductDTO & { academyId: string };
    const item = db.products.create(body);
    return HttpResponse.json(item, { status: 201 });
  }),

  http.put(`${API}/inventory/products/:id`, async ({ params, request }) => {
    await delay(200);
    const body = (await request.json()) as UpdateProductDTO;
    const updated = db.products.update(params.id as string, body);
    if (!updated) return HttpResponse.json({ message: 'Produto não encontrado.' }, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API}/inventory/products/:id`, async ({ params }) => {
    await delay(200);
    const item = db.products.getById(params.id as string);
    if (!item) return HttpResponse.json({ message: 'Produto não encontrado.' }, { status: 404 });
    db.products.delete(params.id as string);
    return new HttpResponse(null, { status: 204 });
  }),
];
