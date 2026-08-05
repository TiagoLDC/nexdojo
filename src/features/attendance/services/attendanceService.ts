import { api } from '@/lib/api';
import type {
  ClassSession,
  AttendanceRecord,
  PaginatedResponse,
  SearchParams,
  CreateClassSessionDTO,
} from '@/types';

export const attendanceService = {
  getSessions: (academyId: string, params?: SearchParams) =>
    api
      .get<PaginatedResponse<ClassSession>>('/sessions', {
        params: { academyId, ...params },
      })
      .then((r) => r.data),

  createSession: (academyId: string, data: CreateClassSessionDTO) =>
    api.post<ClassSession>('/sessions', { ...data, academyId }).then((r) => r.data),

  updateSession: (id: string, data: Partial<ClassSession>) =>
    api.put<ClassSession>(`/sessions/${id}`, data).then((r) => r.data),

  getRecords: (academyId: string, params?: SearchParams) =>
    api
      .get<PaginatedResponse<AttendanceRecord>>('/attendance', {
        params: { academyId, ...params },
      })
      .then((r) => r.data),

  createRecord: (academyId: string, data: { studentId: string; classId?: string; date: string; durationMinutes?: number; overrideAge?: boolean }) =>
    api.post<AttendanceRecord>('/attendance', { ...data, academyId }).then((r) => r.data),

  deleteRecord: (id: string) =>
    api.delete<{ message: string }>(`/attendance/${id}`).then((r) => r.data),

  qrCheckin: (qrCode: string, studentId?: string) =>
    api.post<AttendanceRecord>('/attendance/qr-checkin', { qrCode, studentId }).then((r) => r.data),
};
