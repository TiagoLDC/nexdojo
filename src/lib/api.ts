import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { getApiToken, notifyUnauthorized, setApiToken, setUnauthorizedHandler } from '@/lib/apiToken';

// Reexportados por compatibilidade com quem já importava daqui (ex: GuardianInvitePage).
// A fonte é `@/lib/apiToken`, que não importa nada e por isso não entra em ciclo com o
// authStore — ver o comentário naquele arquivo.
export { setApiToken, setUnauthorizedHandler };

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function camelToSnake(str: string): string {
  return str.replace(/([A-Z])/g, (c) => '_' + c.toLowerCase());
}

function transformKeys(obj: unknown, transform: (k: string) => string): unknown {
  if (Array.isArray(obj)) return obj.map((v) => transformKeys(v, transform));
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        transform(k),
        transformKeys(v, transform),
      ]),
    );
  }
  return obj;
}

const defaultBaseURL = import.meta.env.PROD ? '/api' : 'http://localhost:3005/api';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? defaultBaseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const { user, academy, token } = useAuthStore.getState();

  // O token vem do módulo `apiToken` (setado no login e na hidratação do persist). O fallback
  // para o store é uma segunda rede: aqui já estamos em runtime, com todos os módulos
  // inicializados, então mesmo que a hidratação não tenha conseguido setar o token o header sai.
  const authToken = getApiToken() ?? token;
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  // Superuser não tem academia fixa no token — rotas exigem academyId explícito na query/body.
  // Se a própria chamada não informou nenhum (ex: update/delete que só recebem o id), injeta
  // automaticamente a academia atualmente selecionada, evitando 400 "academyId é obrigatório".
  if (user?.role === 'superuser' && academy?.id) {
    const hasAcademyIdInParams = !!config.params && (config.params.academyId !== undefined || config.params.academy_id !== undefined);
    const hasAcademyIdInData =
      !!config.data && typeof config.data === 'object' &&
      ((config.data as Record<string, unknown>).academyId !== undefined || (config.data as Record<string, unknown>).academy_id !== undefined);
    if (!hasAcademyIdInParams && !hasAcademyIdInData) {
      config.params = { ...config.params, academyId: academy.id };
    }
  }

  if (
    config.data &&
    typeof config.data === 'object' &&
    ['post', 'put', 'patch'].includes((config.method ?? '').toLowerCase())
  ) {
    config.data = transformKeys(config.data, camelToSnake);
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object') {
      response.data = transformKeys(response.data, snakeToCamel);
    }
    return response;
  },
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      notifyUnauthorized();
    }
    return Promise.reject(error);
  },
);
