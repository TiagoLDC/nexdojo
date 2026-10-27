import { api } from '@/lib/api';

// As chaves chegam em camelCase porque o interceptor de src/lib/api.ts converte a resposta.

export type TurnstilePersonType = 'student' | 'instructor' | 'staff';

export interface TurnstileSettings {
  graceDays: number;
  alertMinutes: number;
}

export interface TurnstileDeviceStatus {
  key: string;
  name: string;
  online: boolean;
  lastError: string | null;
  usersOnDevice: number | null;
  lastSyncAt: string | null;
}

export interface TurnstileCredential {
  id: string;
  username: string;
  label: string | null;
  active: boolean;
  createdAt: string;
  lastSeenAt: string | null;
  lastIp: string | null;
  lastStatus: { appVersion: string | null; machineName: string | null; devices: TurnstileDeviceStatus[] } | null;
}

export interface TurnstilePersonDevice {
  deviceKey: string;
  deviceName: string | null;
  state: 'synced' | 'no_photo' | 'photo_rejected' | 'error';
  message: string | null;
  updatedAt: string;
}

export interface TurnstilePerson {
  id: string;
  type: TurnstilePersonType;
  name: string;
  status: 'allowed' | 'blocked';
  reason: string | null;
  overdue: boolean;
  accessBlocked: boolean;
  releasedUntil: string | null;
  releaseId: string | null;
  photoHash: string | null;
  /** Por que a foto do cadastro não serve para a catraca (formato ou link antigo). */
  photoProblem: string | null;
  devices: TurnstilePersonDevice[];
}

export interface TurnstileEvent {
  id: string;
  deviceKey: string;
  deviceName: string | null;
  personType: TurnstilePersonType | null;
  personId: string | null;
  personName: string | null;
  event: number;
  granted: boolean;
  occurredAt: string;
  attendanceRecordId: string | null;
}

export interface TurnstileAlert {
  configured: boolean;
  stale: boolean;
  lastSeenAt: string | null;
  minutesSince?: number | null;
  alertMinutes: number;
  offlineDevices: string[];
}

export const turnstileService = {
  getAlert: () => api.get<TurnstileAlert>('/turnstile/admin/alert').then((r) => r.data),
  getOverview: () =>
    api.get<{ settings: TurnstileSettings; credentials: TurnstileCredential[] }>('/turnstile/admin/overview').then((r) => r.data),
  getPeople: () => api.get<{ people: TurnstilePerson[] }>('/turnstile/admin/people').then((r) => r.data.people),
  getEvents: (limit = 100) =>
    api.get<{ events: TurnstileEvent[] }>('/turnstile/admin/events', { params: { limit } }).then((r) => r.data.events),
  createCredential: (data: { username: string; password: string; label?: string }) =>
    api.post('/turnstile/admin/credentials', data).then((r) => r.data),
  updateCredential: (id: string, data: { password?: string; active?: boolean; label?: string }) =>
    api.put(`/turnstile/admin/credentials/${id}`, data).then((r) => r.data),
  deleteCredential: (id: string) => api.delete(`/turnstile/admin/credentials/${id}`).then((r) => r.data),
  updateSettings: (data: TurnstileSettings) =>
    api.put<TurnstileSettings>('/turnstile/admin/settings', data).then((r) => r.data),
  release: (personType: TurnstilePersonType, personId: string, hours = 24) =>
    api.post('/turnstile/admin/releases', { personType, personId, hours }).then((r) => r.data),
  revokeRelease: (id: string) => api.delete(`/turnstile/admin/releases/${id}`).then((r) => r.data),
};

/** Texto dos códigos de evento da Control iD que aparecem na prática numa catraca facial. */
export const TURNSTILE_EVENT_LABELS: Record<number, string> = {
  3: 'Não identificado',
  5: 'Tempo esgotado',
  6: 'Acesso negado',
  7: 'Acesso liberado',
  10: 'Acesso não identificado',
  11: 'Liberado pela botoeira',
  12: 'Liberado pela interface web',
  13: 'Desistiu de entrar',
};
