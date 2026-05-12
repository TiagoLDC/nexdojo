import { api } from '@/lib/api';
import type { CalendarEvent, PaginatedResponse, SearchParams, CreateCalendarEventDTO } from '@/types';

export const calendarService = {
  getEvents: (academyId: string, params?: SearchParams) =>
    api
      .get<PaginatedResponse<CalendarEvent>>('/calendar', { params: { academyId, ...params } })
      .then((r) => r.data),

  createEvent: (academyId: string, data: CreateCalendarEventDTO) =>
    api.post<CalendarEvent>('/calendar', { ...data, academyId }).then((r) => r.data),

  deleteEvent: (id: string) =>
    api.delete<void>(`/calendar/${id}`).then((r) => r.data),
};
