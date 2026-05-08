/**
 * ApiService — Camada de comunicação com a API Backend NexDojo
 * Substitui progressivamente o StorageService para dados persistidos no MySQL.
 *
 * A URL base é definida via variável de ambiente VITE_API_URL.
 * Localmente aponta para http://localhost:3005
 * No QAS aponta para https://qas.nexdojo.com.br/api (via proxy nginx)
 */

const BASE_URL = import.meta.env.VITE_API_URL || '';

// ── Token JWT ───────────────────────────────────────────────────────────────
const TOKEN_KEY = 'nexdojo_jwt_token';

export const ApiService = {
  // ── Token helpers ──────────────────────────────────────────────────────────
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),

  // ── Request helper ─────────────────────────────────────────────────────────
  request: async <T>(path: string, options: RequestInit = {}): Promise<T> => {
    const token = ApiService.getToken();
    const academyStr = localStorage.getItem('oss_academy');
    let academyId = null;
    if (academyStr) {
      try {
        const academy = JSON.parse(academyStr);
        academyId = academy?.id;
      } catch (e) {}
    }
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(academyId ? { 'x-academy-id': academyId } : {}),
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro desconhecido.' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    return res.json() as Promise<T>;
  },

  // ── AUTH ───────────────────────────────────────────────────────────────────
  login: async (email: string, password: string) => {
    const data = await ApiService.request<{ token: string; user: any; academy: any }>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    );
    ApiService.setToken(data.token);
    return data;
  },

  registerAcademy: async (payload: {
    name: string; ownerName: string; email: string; password: string;
    phone?: string; cep?: string; address?: string; addressNumber?: string; logo?: string;
  }) => {
    const data = await ApiService.request<{ token: string; user: any; academy: any }>(
      '/api/auth/register-academy',
      { method: 'POST', body: JSON.stringify(payload) }
    );
    ApiService.setToken(data.token);
    return data;
  },

  registerStudent: async (payload: {
    name: string; email: string; password: string; academyId: string;
    birthDate?: string; gender?: string;
  }) => {
    return ApiService.request<{ message: string; studentId: string }>(
      '/api/auth/register-student',
      { method: 'POST', body: JSON.stringify(payload) }
    );
  },

  // ── STUDENTS ───────────────────────────────────────────────────────────────
  getStudents: async () => {
    return ApiService.request<any[]>('/api/students');
  },

  getStudentById: async (id: string) => {
    return ApiService.request<any>(`/api/students/${id}`);
  },

  createStudent: async (student: any) => {
    return ApiService.request<any>('/api/students', {
      method: 'POST',
      body: JSON.stringify(student),
    });
  },

  updateStudent: async (id: string, student: any) => {
    return ApiService.request<any>(`/api/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(student),
    });
  },

  deleteStudent: async (id: string) => {
    return ApiService.request<{ message: string }>(`/api/students/${id}`, {
      method: 'DELETE',
    });
  },

  graduateStudent: async (id: string, newBelt: string, newStripes: number, notes?: string) => {
    return ApiService.request<any>(`/api/students/${id}/graduate`, {
      method: 'POST',
      body: JSON.stringify({ newBelt, newStripes, notes }),
    });
  },

  getGraduationHistory: async (studentId: string) => {
    return ApiService.request<any[]>(`/api/students/${studentId}/graduation-history`);
  },

  // ── RECYCLE BIN ───────────────────────────────────────────────────────────
  getRecycleBin: async () => {
    return ApiService.request<any[]>('/api/recycle-bin');
  },

  restoreRecycleBinItem: async (type: string, id: string) => {
    return ApiService.request<any>(`/api/recycle-bin/${type}/${id}/restore`, { method: 'POST' });
  },

  permanentDeleteRecycleBinItem: async (type: string, id: string) => {
    return ApiService.request<any>(`/api/recycle-bin/${type}/${id}`, { method: 'DELETE' });
  },

  // ── ACADEMIES ──────────────────────────────────────────────────────────────
  getAcademies: async () => {
    return ApiService.request<any[]>('/api/academies');
  },

  getAcademy: async (id: string) => {

    return ApiService.request<any>(`/api/academies/${id}`);
  },

  updateAcademy: async (id: string, data: any) => {
    return ApiService.request<any>(`/api/academies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getAcademyUsers: async (academyId: string) => {
    return ApiService.request<any[]>(`/api/academies/${academyId}/users`);
  },

  updateUserStatus: async (academyId: string, userId: string, status: string) => {
    return ApiService.request<any>(`/api/academies/${academyId}/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  // ── TEMPLATES ──────────────────────────────────────────────────────────────
  getTemplates: async () => ApiService.request<any[]>('/api/templates'),
  createTemplate: async (data: any) => ApiService.request<any>('/api/templates', { method: 'POST', body: JSON.stringify(data) }),
  updateTemplate: async (id: string, data: any) => ApiService.request<any>(`/api/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTemplate: async (id: string) => ApiService.request<any>(`/api/templates/${id}`, { method: 'DELETE' }),

  // ── FINANCES ───────────────────────────────────────────────────────────────
  getFinances: async () => ApiService.request<any[]>('/api/finances'),
  createTransaction: async (data: any) => ApiService.request<any>('/api/finances', { method: 'POST', body: JSON.stringify(data) }),
  deleteTransaction: async (id: string) => ApiService.request<any>(`/api/finances/${id}`, { method: 'DELETE' }),

  // ── ATTENDANCE ─────────────────────────────────────────────────────────────
  getAttendance: async () => ApiService.request<any[]>('/api/attendance'),
  saveAttendanceBulk: async (records: any[], classId: string) => ApiService.request<any>('/api/attendance/bulk', { 
    method: 'POST', 
    body: JSON.stringify({ records, classId }) 
  }),

  // ── CLASSES ────────────────────────────────────────────────────────────────
  getClasses: async () => ApiService.request<any[]>('/api/classes'),
  createClass: async (data: any) => ApiService.request<any>('/api/classes', { method: 'POST', body: JSON.stringify(data) }),
  
  // ── INSTRUCTORS ───────────────────────────────────────────────────────────
  getInstructors: async () => ApiService.request<any[]>('/api/instructors'),
  createInstructor: async (data: any) => ApiService.request<any>('/api/instructors', { method: 'POST', body: JSON.stringify(data) }),
  updateInstructor: async (id: string, data: any) => ApiService.request<any>(`/api/instructors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInstructor: async (id: string) => ApiService.request<any>(`/api/instructors/${id}`, { method: 'DELETE' }),

  // ── STAFF ─────────────────────────────────────────────────────────────────
  getStaff: async () => ApiService.request<any[]>('/api/staff'),
  createStaff: async (data: any) => ApiService.request<any>('/api/staff', { method: 'POST', body: JSON.stringify(data) }),
  updateStaff: async (id: string, data: any) => ApiService.request<any>(`/api/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStaff: async (id: string) => ApiService.request<any>(`/api/staff/${id}`, { method: 'DELETE' }),
};


export default ApiService;
