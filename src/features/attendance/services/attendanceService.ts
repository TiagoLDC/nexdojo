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
      .get<PaginatedResponse<ClassSession>>('/attendance/sessions', {
        params: { academyId, ...params },
      })
      .then((r) => r.data),

  getSessionById: (id: string) =>
    api.get<ClassSession>(`/attendance/sessions/${id}`).then((r) => r.data),

  createSession: (academyId: string, data: CreateClassSessionDTO) =>
    api.post<ClassSession>('/attendance/sessions', { ...data, academyId }).then((r) => r.data),

  markAttendance: (sessionId: string, studentId: string) =>
    api
      .post<ClassSession>(`/attendance/sessions/${sessionId}/attend`, { studentId })
      .then((r) => r.data),

  removeAttendance: (sessionId: string, studentId: string) =>
    api
      .delete<ClassSession>(`/attendance/sessions/${sessionId}/attend/${studentId}`)
      .then((r) => r.data),

  finalizeSession: (sessionId: string) =>
    api.post<ClassSession>(`/attendance/sessions/${sessionId}/finalize`).then((r) => r.data),

  getRecords: (academyId: string, params?: SearchParams) =>
    api
      .get<PaginatedResponse<AttendanceRecord>>('/attendance/records', {
        params: { academyId, ...params },
      })
      .then((r) => r.data),
};
