import { api } from '@/lib/api';

export interface SmtpConfig {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpFromName: string;
  smtpFromEmail: string;
  smtpSecure: string;
}

export interface SmtpTestResult {
  ok: boolean;
  message: string;
}

export const systemConfigService = {
  getAll: () =>
    api
      .get<{ config: SmtpConfig; smtpPassSet: boolean }>('/system-config')
      .then((r) => r.data),

  save: (config: Partial<SmtpConfig>) =>
    api
      .put<{ message: string }>('/system-config', config)
      .then((r) => r.data),

  testSmtp: () =>
    api.post<SmtpTestResult>('/system-config/smtp/test').then((r) => r.data),
};
