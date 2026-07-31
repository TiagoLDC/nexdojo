import { api } from '@/lib/api';

export interface StudentGuardian {
  id: string;
  relation?: string;
  createdAt: string;
  userId: string;
  name: string;
  email: string;
  role: string;
}

export const guardianService = {
  list: (studentId: string) =>
    api.get<{ data: StudentGuardian[] }>(`/students/${studentId}/guardians`).then((r) => r.data.data),

  linkByEmail: (studentId: string, email: string, relation?: string) =>
    api.post<{ message: string }>(`/students/${studentId}/guardians`, { email, relation }).then((r) => r.data),

  unlink: (studentId: string, guardianUserId: string) =>
    api.delete<{ message: string }>(`/students/${studentId}/guardians/${guardianUserId}`).then((r) => r.data),

  createInvite: (studentId: string) =>
    api.post<{ inviteLink: string }>(`/students/${studentId}/guardian-invite`, {}).then((r) => r.data),
};
